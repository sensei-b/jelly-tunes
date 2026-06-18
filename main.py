import os
import sys
import json
import ssl
import asyncio
import aiohttp
import decky

# py_modules is added to sys.path by decky-loader, but make sure it's
# there for direct execution / IDE intellisense too.
sys.path.insert(0, os.path.join(decky.DECKY_PLUGIN_DIR, "py_modules"))
import certifi

# SteamOS's bundled Python often can't find the system CA bundle, which
# makes aiohttp's default SSL context fail to verify even valid
# Let's Encrypt certs. certifi ships its own up-to-date CA bundle, so
# we build an explicit SSL context from that and use it for every request.
SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())

SETTINGS_FILE = os.path.join(decky.DECKY_PLUGIN_SETTINGS_DIR, "settings.json")

DEFAULT_SETTINGS = {
    "server_url": "",
    "local_url": "",
    "api_key": "",
    "user_id": "",
    "skip_ssl_verify": False,
}


def _normalize_server_url(url: str) -> str:
    url = url.strip().rstrip("/")
    if url and not url.lower().startswith(("http://", "https://")):
        url = f"https://{url}"
    return url


def _load_settings():
    try:
        with open(SETTINGS_FILE, "r") as f:
            data = json.load(f)
            return {**DEFAULT_SETTINGS, **data}
    except (FileNotFoundError, json.JSONDecodeError):
        return dict(DEFAULT_SETTINGS)


def _save_settings(data):
    os.makedirs(decky.DECKY_PLUGIN_SETTINGS_DIR, exist_ok=True)
    with open(SETTINGS_FILE, "w") as f:
        json.dump(data, f)


class Plugin:

    # Resolved base URL for this session; None means not yet determined.
    _url_cache: str | None = None

    # Shared HTTP session — avoids a new TCP+TLS handshake per request.
    _session: aiohttp.ClientSession | None = None

    # In-memory thumbnail cache: item_id -> (bytes, content_type).
    _image_cache: dict[str, tuple[bytes, str]] = {}

    async def _get_session(self, ssl_ctx) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(
                connector=aiohttp.TCPConnector(ssl=ssl_ctx, limit=10),
            )
        return self._session

    async def _discover_local_server(self) -> str | None:
        """UDP broadcast on port 7359 to find a Jellyfin server on the LAN."""
        import socket

        loop = asyncio.get_running_loop()
        response_data: list[bytes] = []
        received = asyncio.Event()

        class _Proto(asyncio.DatagramProtocol):
            def datagram_received(self, data, addr):
                response_data.append(data)
                received.set()
            def error_received(self, exc):
                decky.logger.warning(f"UDP discovery socket error: {exc}")
                received.set()
            def connection_lost(self, exc):
                received.set()

        try:
            transport, _ = await loop.create_datagram_endpoint(
                _Proto,
                family=socket.AF_INET,
                allow_broadcast=True,
            )
            transport.sendto(b"who is JellyfinServer?", ("255.255.255.255", 7359))
            decky.logger.info("UDP discovery broadcast sent on port 7359")
            try:
                await asyncio.wait_for(received.wait(), timeout=2.0)
            except asyncio.TimeoutError:
                decky.logger.info("UDP discovery timed out — no Jellyfin server responded")
            finally:
                transport.close()

            if response_data:
                info = json.loads(response_data[0].decode("utf-8", errors="ignore"))
                addr = info.get("Address", "").rstrip("/")
                if addr:
                    decky.logger.info(f"UDP discovery found Jellyfin at {addr}")
                    return addr
                decky.logger.warning(f"UDP discovery got response but no Address field: {info}")
        except Exception as e:
            decky.logger.warning(f"UDP discovery error: {e}")
        return None

    async def _resolve_url(self, cfg: dict) -> str:
        """Probe configured URLs for a valid Jellyfin response; fall back to LAN discovery."""
        if self._url_cache is not None:
            return self._url_cache

        main_url = cfg["server_url"]
        local_url = cfg.get("local_url", "").strip().rstrip("/")
        ssl_ctx = False if cfg.get("skip_ssl_verify") else SSL_CONTEXT

        # Validate by fetching /System/Info/Public and checking the JSON response
        # contains a Jellyfin-specific field. A plain status check isn't enough —
        # some routers intercept the request and return 200/302 from their own UI.
        async def _probe(url: str) -> bool:
            try:
                connector = aiohttp.TCPConnector(ssl=ssl_ctx)
                timeout = aiohttp.ClientTimeout(total=3.0)
                async with aiohttp.ClientSession(timeout=timeout, connector=connector) as session:
                    async with session.get(f"{url}/System/Info/Public") as resp:
                        decky.logger.info(f"Probe {url}/System/Info/Public → {resp.status}")
                        if resp.status == 200:
                            body = await resp.json(content_type=None)
                            if isinstance(body, dict) and "ProductName" in body:
                                return True
                            decky.logger.warning(f"Probe returned 200 but not Jellyfin JSON: {str(body)[:100]}")
            except Exception as e:
                decky.logger.info(f"Probe {url} failed ({type(e).__name__}: {e})")
            return False

        # Try local URL first — bypasses NAT hairpin issues when on the same LAN.
        if local_url and await _probe(local_url):
            decky.logger.info(f"Local URL is reachable, using {local_url}")
            self._url_cache = local_url
            return local_url

        if await _probe(main_url):
            decky.logger.info(f"Main URL is reachable, using {main_url}")
            self._url_cache = main_url
            return main_url

        local = await self._discover_local_server()
        if local:
            self._url_cache = local
            return local

        decky.logger.warning(f"All probes failed, falling back to {main_url}")
        self._url_cache = main_url
        return main_url

    # -- Settings -------------------------------------------------
    async def get_settings(self):
        return _load_settings()

    async def save_settings(self, server_url: str, api_key: str, user_id: str, local_url: str = "", skip_ssl_verify: bool = False) -> bool:
        self._url_cache = None
        if self._session is not None and not self._session.closed:
            await self._session.close()
        self._session = None
        _save_settings({
            "server_url": _normalize_server_url(server_url),
            "local_url": _normalize_server_url(local_url),
            "api_key": api_key.strip(),
            "user_id": user_id.strip(),
            "skip_ssl_verify": bool(skip_ssl_verify),
        })
        return True

    # -- Internal helper for hitting the Jellyfin API -------------
    async def _get(self, path: str, extra_params: dict | None = None):
        cfg = _load_settings()
        if not cfg["server_url"] or not cfg["api_key"] or not cfg["user_id"]:
            return {"error": "not_configured"}

        params = dict(extra_params) if extra_params else {}
        headers = {"X-Emby-Token": cfg["api_key"]}

        ssl_ctx = False if cfg.get("skip_ssl_verify") else SSL_CONTEXT
        base = await self._resolve_url(cfg)
        url = f"{base}{path}"
        try:
            timeout = aiohttp.ClientTimeout(total=10)
            session = await self._get_session(ssl_ctx)
            async with session.get(url, params=params, headers=headers, timeout=timeout) as resp:
                    if resp.status == 404:
                        # Jellyfin sometimes throws a generic 404
                        # ("Error processing request.") for certain item
                        # filter combinations instead of returning an
                        # empty result set -- e.g. an artist that only
                        # appears as a track-level performer and was
                        # never the AlbumArtist on any album. Treat this
                        # as "no results" so browsing doesn't break.
                        body = await resp.text()
                        decky.logger.warning(
                            f"Jellyfin 404 treated as empty result: {resp.url} -- {body[:200]}"
                        )
                        return {"data": {"Items": []}}
                    if resp.status != 200:
                        body = await resp.text()
                        decky.logger.error(
                            f"Jellyfin request failed ({resp.status}): {resp.url} -- {body[:300]}"
                        )
                        return {"error": f"http_{resp.status}"}
                    return {"data": await resp.json()}
        except asyncio.TimeoutError:
            decky.logger.error(f"Jellyfin request timed out: {url}")
            return {"error": "timeout"}
        except Exception as e:
            decky.logger.error(f"Jellyfin request error: {e}")
            return {"error": "connection_failed"}

    # -- Library browsing ------------------------------------------
    async def get_artists(self):
        cfg = _load_settings()
        result = await self._get("/Artists", {
            "userId": cfg["user_id"],
            "SortBy": "SortName",
            "SortOrder": "Ascending",
            "Recursive": "true",
            "Limit": 300,
        })
        if "error" not in result:
            return {"items": result["data"].get("Items", [])}
        # Fall back to admin /Items endpoint when userId is invalid or /Artists fails.
        result2 = await self._get("/Items", {
            "IncludeItemTypes": "MusicArtist",
            "SortBy": "SortName",
            "SortOrder": "Ascending",
            "Recursive": "true",
            "Limit": 300,
        })
        if "error" in result2:
            return result2
        return {"items": result2["data"].get("Items", [])}

    async def get_albums(self, artist_id: str):
        cfg = _load_settings()
        user_id = cfg["user_id"]
        decky.logger.info(f"get_albums: start artist_id={artist_id!r}")
        params_base = {
            "SortBy": "ProductionYear,SortName",
            "SortOrder": "Ascending",
            "Recursive": "true",
            "IncludeItemTypes": "MusicAlbum",
            "Limit": 300,
        }

        # Try 1: AlbumArtistIds (matches ALBUMARTIST tag)
        result = await self._get(f"/Users/{user_id}/Items", {
            **params_base,
            "AlbumArtistIds": artist_id,
        })
        if "error" not in result:
            items = result["data"].get("Items", [])
            decky.logger.info(f"get_albums: AlbumArtistIds → {len(items)} (total={result['data'].get('TotalRecordCount')})")
            if items:
                return {"items": items}

        # Try 2: ArtistIds on MusicAlbum
        result2 = await self._get(f"/Users/{user_id}/Items", {
            **params_base,
            "ArtistIds": artist_id,
        })
        if "error" not in result2:
            items = result2["data"].get("Items", [])
            decky.logger.info(f"get_albums: ArtistIds(album) → {len(items)} (total={result2['data'].get('TotalRecordCount')})")
            if items:
                return {"items": items}

        # Try 3: ContributingArtistIds on MusicAlbum
        result3 = await self._get(f"/Users/{user_id}/Items", {
            **params_base,
            "ContributingArtistIds": artist_id,
        })
        if "error" not in result3:
            items = result3["data"].get("Items", [])
            decky.logger.info(f"get_albums: ContributingArtistIds → {len(items)} (total={result3['data'].get('TotalRecordCount')})")
            if items:
                return {"items": items}

        # Try 4: ParentId — treats the MusicArtist item as a folder.
        # This uses Jellyfin's native library hierarchy (Artist → Album)
        # and doesn't depend on artist cross-reference IDs being indexed.
        result4 = await self._get(f"/Users/{user_id}/Items", {
            "ParentId": artist_id,
            "IncludeItemTypes": "MusicAlbum",
            "SortBy": "ProductionYear,SortName",
            "SortOrder": "Ascending",
            "Limit": 300,
        })
        if "error" not in result4:
            items = result4["data"].get("Items", [])
            decky.logger.info(f"get_albums: ParentId(album) → {len(items)} (total={result4['data'].get('TotalRecordCount')})")
            if items:
                return {"items": items}

        # Try 5: Walk audio tracks via ParentId and collect unique albums.
        # Combines the hierarchy approach with the track-scrape fallback.
        result5 = await self._get(f"/Users/{user_id}/Items", {
            "ParentId": artist_id,
            "Recursive": "true",
            "IncludeItemTypes": "Audio",
            "Limit": 1000,
        })
        if "error" not in result5:
            tracks = result5["data"].get("Items", [])
            decky.logger.info(f"get_albums: ParentId(tracks) → {len(tracks)} (total={result5['data'].get('TotalRecordCount')})")
            if tracks:
                seen: set = set()
                albums = []
                for t in tracks:
                    aid = t.get("AlbumId")
                    if aid and aid not in seen:
                        seen.add(aid)
                        albums.append({
                            "Id": aid,
                            "Name": t.get("Album") or "Unknown Album",
                            "ProductionYear": t.get("ProductionYear"),
                        })
                albums.sort(key=lambda a: (a.get("ProductionYear") or 0, a["Name"]))
                return {"items": albums}

        # Try 6: Walk audio tracks via ArtistIds and collect unique albums.
        result6 = await self._get(f"/Users/{user_id}/Items", {
            "Recursive": "true",
            "IncludeItemTypes": "Audio",
            "ArtistIds": artist_id,
            "Limit": 1000,
        })
        if "error" not in result6:
            tracks = result6["data"].get("Items", [])
            decky.logger.info(f"get_albums: ArtistIds(tracks) → {len(tracks)} (total={result6['data'].get('TotalRecordCount')})")
            seen = set()
            albums = []
            for t in tracks:
                aid = t.get("AlbumId")
                if aid and aid not in seen:
                    seen.add(aid)
                    albums.append({
                        "Id": aid,
                        "Name": t.get("Album") or "Unknown Album",
                        "ProductionYear": t.get("ProductionYear"),
                    })
            albums.sort(key=lambda a: (a.get("ProductionYear") or 0, a["Name"]))
            if albums:
                return {"items": albums}

        # Tries 1-6 all use /Users/{userId}/Items, which returns 404 if the
        # userId setting is wrong. Tries 7-8 use the admin /Items endpoint
        # (no userId in the path) which only needs the API key to be valid.
        decky.logger.info("get_albums: /Users/{userId}/Items all returned 404 — trying admin /Items endpoint")

        # Try 7: Admin /Items with AlbumArtistIds
        result7 = await self._get("/Items", {
            **params_base,
            "AlbumArtistIds": artist_id,
        })
        if "error" not in result7:
            items = result7["data"].get("Items", [])
            decky.logger.info(f"get_albums: admin AlbumArtistIds → {len(items)} (total={result7['data'].get('TotalRecordCount')})")
            if items:
                return {"items": items}

        # Try 8: Admin /Items — scrape Audio tracks and collect unique albums.
        result8 = await self._get("/Items", {
            "Recursive": "true",
            "IncludeItemTypes": "Audio",
            "ArtistIds": artist_id,
            "Limit": 1000,
        })
        if "error" not in result8:
            tracks = result8["data"].get("Items", [])
            decky.logger.info(f"get_albums: admin ArtistIds(tracks) → {len(tracks)} (total={result8['data'].get('TotalRecordCount')})")
            seen = set()
            albums = []
            for t in tracks:
                aid = t.get("AlbumId")
                if aid and aid not in seen:
                    seen.add(aid)
                    albums.append({
                        "Id": aid,
                        "Name": t.get("Album") or "Unknown Album",
                        "ProductionYear": t.get("ProductionYear"),
                    })
            albums.sort(key=lambda a: (a.get("ProductionYear") or 0, a["Name"]))
            return {"items": albums}

        decky.logger.warning(f"get_albums: all 8 tries returned 0 for artist_id={artist_id!r}")
        return {"items": []}

    async def get_tracks(self, album_id: str):
        cfg = _load_settings()
        params = {
            "SortBy": "ParentIndexNumber,IndexNumber,SortName",
            "SortOrder": "Ascending",
            "Recursive": "true",
            "IncludeItemTypes": "Audio",
            "ParentId": album_id,
            "Limit": 500,
        }
        result = await self._get(f"/Users/{cfg['user_id']}/Items", params)
        if "error" not in result:
            items = result["data"].get("Items", [])
            if items:
                return {"items": items}
        # Fall back to admin endpoint if userId is invalid or returned empty.
        # A bad userId causes Jellyfin to return 404, which _get converts to
        # an empty result (no "error" key), so we must also fall through when
        # items is empty — not just when there's an explicit error.
        result2 = await self._get("/Items", params)
        if "error" in result2:
            return result2
        return {"items": result2["data"].get("Items", [])}

    async def search_all(self, query: str):
        query = query.strip()
        if not query:
            return {"artists": [], "albums": [], "tracks": []}
        cfg = _load_settings()
        params = {
            "SearchTerm": query,
            "IncludeItemTypes": "MusicArtist,MusicAlbum,Audio",
            "Recursive": "true",
            "Limit": 40,
            "SortBy": "SortName",
        }
        result = await self._get(f"/Users/{cfg['user_id']}/Items", params)
        if "error" in result or not result["data"].get("Items"):
            result = await self._get("/Items", params)
        if "error" in result:
            return result
        items = result["data"].get("Items", [])
        return {
            "artists": [i for i in items if i.get("Type") == "MusicArtist"],
            "albums": [i for i in items if i.get("Type") == "MusicAlbum"],
            "tracks": [i for i in items if i.get("Type") == "Audio"],
        }

    # -- Playback -----------------------------------------------------
    async def get_stream_url(self, item_id: str):
        cfg = _load_settings()
        if not cfg["server_url"] or not cfg["api_key"]:
            return ""
        # Use the universal endpoint so Jellyfin transcodes to MP3 when the
        # original format (e.g. WMA) isn't supported by Chromium. For already-
        # compatible formats (mp3/flac/aac/ogg) it streams the file directly.
        # Omit UserId — the configured user_id may be invalid (admin API key
        # auth is sufficient for streaming), and an invalid UserId causes
        # Jellyfin to return 404, which makes the browser audio element fail.
        return (
            f"{cfg['server_url']}/Audio/{item_id}/universal"
            f"?api_key={cfg['api_key']}"
            f"&DeviceId=JellyTunes"
            f"&Container=opus,mp3,aac,m4a,flac,ogg,wav"
            f"&TranscodingContainer=mp3"
            f"&AudioCodec=mp3"
            f"&MaxStreamingBitrate=140000000"
        )

    # -- Audio proxy ---------------------------------------------------
    # CEF (Steam overlay browser) connects to Jellyfin directly for
    # audio and often fails the SSL handshake (TLSV1_ALERT_INTERNAL_ERROR).
    # We work around this by running a plain-HTTP proxy on localhost:9099
    # so CEF never touches Jellyfin's SSL; Python handles it with certifi.
    _PROXY_PORT = 9099
    _proxy_runner = None

    async def _run_proxy(self):
        from aiohttp import web

        async def audio_proxy(request):
            item_id = request.match_info["item_id"]
            cfg = _load_settings()
            if not cfg["server_url"] or not cfg["api_key"]:
                return web.Response(status=503, text="Not configured")

            base = await self._resolve_url(cfg)
            # /universal returns 400 on some Jellyfin instances; /stream?Static=true
            # serves the original file directly and is supported universally.
            upstream = (
                f"{base}/Audio/{item_id}/stream"
                f"?api_key={cfg['api_key']}"
                f"&Static=true"
            )

            req_headers = {
                # Cloudflare (if present in front of Jellyfin) blocks requests
                # without a browser-like User-Agent on the audio stream path.
                "User-Agent": (
                    "Mozilla/5.0 (X11; Linux x86_64; Valve Steam Client/Steam Deck)"
                    " AppleWebKit/537.36 (KHTML, like Gecko)"
                    " Chrome/126.0.6478.183 Safari/537.36"
                ),
            }
            if "Range" in request.headers:
                req_headers["Range"] = request.headers["Range"]

            try:
                ssl_ctx = False if cfg.get("skip_ssl_verify") else SSL_CONTEXT
                session = await self._get_session(ssl_ctx)
                async with session.get(upstream, headers=req_headers) as resp:
                        fwd = {
                            "Access-Control-Allow-Origin": "*",
                            "Content-Type": resp.headers.get("Content-Type", "audio/mpeg"),
                        }
                        for h in ("Content-Length", "Content-Range", "Accept-Ranges"):
                            if h in resp.headers:
                                fwd[h] = resp.headers[h]
                        stream_resp = web.StreamResponse(status=resp.status, headers=fwd)
                        await stream_resp.prepare(request)
                        async for chunk in resp.content.iter_chunked(32768):
                            await stream_resp.write(chunk)
                        await stream_resp.write_eof()
                        return stream_resp
            except Exception as e:
                decky.logger.error(f"Audio proxy error for {item_id}: {e}")
                return web.Response(status=502, text=str(e))

        async def image_proxy(request):
            item_id = request.match_info["item_id"]

            if item_id in self._image_cache:
                data, ct = self._image_cache[item_id]
                return web.Response(
                    body=data,
                    content_type=ct,
                    headers={"Access-Control-Allow-Origin": "*", "Cache-Control": "max-age=86400"},
                )

            cfg = _load_settings()
            if not cfg["server_url"] or not cfg["api_key"]:
                return web.Response(status=503, text="Not configured")

            base = await self._resolve_url(cfg)
            upstream = (
                f"{base}/Items/{item_id}/Images/Primary"
                f"?fillWidth=64&fillHeight=64&quality=80&api_key={cfg['api_key']}"
            )

            try:
                ssl_ctx = False if cfg.get("skip_ssl_verify") else SSL_CONTEXT
                session = await self._get_session(ssl_ctx)
                async with session.get(upstream) as resp:
                    data = await resp.read()
                    ct = resp.headers.get("Content-Type", "image/jpeg")
                    if len(self._image_cache) >= 512:
                        self._image_cache.clear()
                    self._image_cache[item_id] = (data, ct)
                    return web.Response(
                        body=data,
                        content_type=ct,
                        headers={"Access-Control-Allow-Origin": "*", "Cache-Control": "max-age=86400"},
                    )
            except Exception as e:
                decky.logger.error(f"Image proxy error for {item_id}: {e}")
                return web.Response(status=502, text=str(e))

        app = web.Application()
        app.router.add_get("/audio/{item_id}", audio_proxy)
        app.router.add_get("/image/{item_id}", image_proxy)

        runner = web.AppRunner(app)
        await runner.setup()
        from aiohttp.web_runner import TCPSite
        site = TCPSite(runner, "127.0.0.1", self._PROXY_PORT)
        await site.start()
        self._proxy_runner = runner
        decky.logger.info(f"Audio proxy listening on port {self._PROXY_PORT}")

    # -- Lifecycle ------------------------------------------------------
    async def _main(self):
        decky.logger.info("Jelly Tunes loaded")
        asyncio.create_task(self._run_proxy())

    async def _unload(self):
        if self._proxy_runner is not None:
            await self._proxy_runner.cleanup()
            decky.logger.info("Audio proxy stopped")
        if self._session is not None and not self._session.closed:
            await self._session.close()
        decky.logger.info("Jelly Tunes unloaded")

    async def _uninstall(self):
        pass
