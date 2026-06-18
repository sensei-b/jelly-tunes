# <img src="assets/jellytunes.png" alt="" width="48" valign="middle"> Jelly Tunes

I'm not a professional developer, please forgive the vibe coding mess.
I wanted to be able to access my Jellyfin media server to play music easily
while gaming or doing whatever on my Steam Deck! This was the result.
A Decky Loader plugin that lets you browse and play music from your
Jellyfin library without leaving Steam Deck Game Mode.

## Features

- Browse Artists -> Albums -> Tracks from your Jellyfin music library
- Album/artist/track artwork pulled from Jellyfin (falls back to a music
  note icon if an item has no image)
- Stream and play tracks via the Quick Access Menu using an `<audio>` element
- Mini player with play/pause, previous/next, shuffle, and repeat
  (off -> repeat all -> repeat one)
- Settings screen to store your Jellyfin server URL, API key, and User ID
- **Global search** — searches artists, albums, and tracks simultaneously
  from the top-level artists view
- **Album play button** — tap ▶ on any album row to queue and play the
  whole album without navigating into the track list
- **Inline artist rows** — artist entries show a thumbnail and name in a
  compact row layout
- **Volume bar** — drag or tap the volume slider directly in the plugin;
  includes a thumb knob for precise scrubbing
- **Now Playing bar** — redesigned with a progress bar and a full
  5-button transport (prev / play-pause / next / shuffle / repeat)
- **Scrolling marquee** — long album/track titles scroll automatically
  instead of being clipped
- **Local URL setting** — optional second server URL for LAN access (avoids
  routing through your public domain when you're on the same network)

## Playback behavior

- Tapping a track loads the *entire current album* as the playback queue,
  starting from that track.
- **Shuffle** picks a random track from the queue each time the current
  one ends (or when you hit next/previous).
- **Repeat** cycles through three states: off, repeat-all (loops the
  queue), and repeat-one (shows a small "1" and loops the current track).
- The currently playing track is highlighted in the track list.

## Setup

### 1. Get your Jellyfin API key

In Jellyfin: **Dashboard -> API Keys -> +** (create a new key, name it
something like "Jelly Tunes").

### 2. Get your Jellyfin User ID

In Jellyfin: **Dashboard -> Users -> click your user**. The UUID in the
URL bar is your User ID.

### 3. Install on the Deck

Easiest path - sideload the pre-built plugin:

1. On your Deck, switch Decky Loader to Developer Mode:
   **Quick Access Menu -> Decky -> Settings -> General -> Developer Mode** (on)
2. Go to **Decky -> Settings -> Developer -> Install Plugin from ZIP**
3. Select this whole `Jelly Tunes` folder, zipped up (`Jelly Tunes.zip`)
4. Open the Jelly Tunes plugin from the Quick Access Menu, tap **Settings**,
   and enter:
   - **Server URL**: your public Jellyfin URL, e.g. `https://jellyfin.yourdomain.com`
     (no trailing slash)
   - **Local URL** *(optional)*: your LAN address, e.g. `http://192.168.1.x:8096`
     — used automatically when the plugin can reach it, avoiding the public URL
   - **API Key**: the key from step 1
   - **User ID**: the UUID from step 2
5. Tap **Save & Connect** - your artists should load.

## Rebuilding from source

If you want to modify the frontend (`src/index.tsx`):

```bash
pnpm install
pnpm run build
```

This regenerates `dist/index.js`. Then re-zip the folder and re-sideload.

## Notes / known limitations

- Plays tracks via direct stream (`/Audio/{id}/stream?static=true`) -
  no transcoding, so make sure your library formats (mp3/flac/etc.) are
  ones the Deck's browser audio engine can play directly.
- No playlist/queue support beyond "play this album, queue everything
  after it."
- **SSL fix included**: SteamOS's bundled Python often can't find the
  system CA bundle, which makes `aiohttp` fail to verify even valid
  Let's Encrypt certs (`SSLCertVerificationError`) even though the same
  URL works fine in a browser or other apps. This build vendors `certifi`
  in `py_modules/` and builds an explicit SSL context from it, so this
  should no longer happen. If you ever re-vendor `py_modules/`, make sure
  `certifi` stays in there.
- **Thumbnail proxy**: album art is fetched through a local Python HTTP
  server (`localhost:19532`) rather than directly from Jellyfin. This works
  around SSL/certificate failures in Steam Deck's CEF browser when loading
  images over HTTPS.
- If "Settings" still shows a connection error, double check the Server
  URL has no trailing slash and includes `https://` (the plugin will
  auto-add `https://` if you forget it, but it's worth confirming), and
  that the API key/User ID are correct.
