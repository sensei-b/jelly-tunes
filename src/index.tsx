import {
  ButtonItem,
  DialogButton,
  Focusable,
  PanelSection,
  PanelSectionRow,
  TextField,
  ToggleField,
  staticClasses,
} from "@decky/ui";
import {
  callable,
  definePlugin,
} from "@decky/api";
import { ReactNode, useEffect, useRef, useState } from "react";
import {
  FaMusic,
  FaCog,
  FaArrowLeft,
  FaPlay,
  FaPause,
  FaRandom,
  FaRedo,
  FaStepForward,
  FaStepBackward,
} from "react-icons/fa";

// -- Types ----------------------------------------------------------

interface JellyfinItem {
  Id: string;
  Name: string;
  ProductionYear?: number;
  IndexNumber?: number;
}

interface ItemsResult {
  items?: JellyfinItem[];
  error?: string;
}

interface JellySettings {
  server_url: string;
  api_key: string;
  user_id: string;
  skip_ssl_verify: boolean;
}

type View = "artists" | "albums" | "tracks" | "settings";
type RepeatMode = "off" | "all" | "one";

// -- Backend calls ----------------------------------------------------

const getSettings = callable<[], JellySettings>("get_settings");
const saveSettingsCall = callable<
  [server_url: string, api_key: string, user_id: string, skip_ssl_verify: boolean],
  boolean
>("save_settings");
const getArtists = callable<[], ItemsResult>("get_artists");
const getAlbums = callable<[artist_id: string], ItemsResult>("get_albums");
const getTracks = callable<[album_id: string], ItemsResult>("get_tracks");
const getStreamUrl = callable<[item_id: string], string>("get_stream_url");

// Single shared audio element so playback survives view changes
let globalAudio: HTMLAudioElement | null = null;
let globalNowPlaying: string | null = null;
let globalCurrentTrackId: string | null = null;
let globalNowPlayingArtist: string | null = null;
let globalNowPlayingAlbum: string | null = null;
let globalQueue: JellyfinItem[] = [];
let globalQueueIndex: number = -1;
let globalShuffle: boolean = false;
let globalRepeat: RepeatMode = "off";

const ERROR_MESSAGES: Record<string, string> = {
  not_configured: "Add your Jellyfin server details in Settings first.",
  timeout: "Connection to Jellyfin timed out.",
  connection_failed: "Couldn't reach the Jellyfin server.",
  playback_failed: "Couldn't play this track — check your connection or try another track.",
};

function friendlyError(code?: string): string {
  if (!code) return "Something went wrong.";
  return ERROR_MESSAGES[code] ?? `Jellyfin returned an error (${code}).`;
}

const ACCENT = "#5fb3ff";

const THUMB_STYLE: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 4,
  objectFit: "cover",
  flexShrink: 0,
};

const THUMB_FALLBACK_STYLE: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 4,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(255, 255, 255, 0.08)",
  flexShrink: 0,
};

// Album / artist / track artwork with a graceful fallback to a music icon
// if Jellyfin has no image for that item (or the request errors out).
function Thumb({ src, fallback }: { src: string; fallback: ReactNode }) {
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    return <div style={THUMB_FALLBACK_STYLE}>{fallback}</div>;
  }

  return (
    // eslint-disable-next-line jsx-a11y/alt-text
    <img src={src} onError={() => setErrored(true)} style={THUMB_STYLE} />
  );
}

const MINI_BUTTON_STYLE: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 0",
};

function Content() {
  const [view, setView] = useState<View>("artists");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [artists, setArtists] = useState<JellyfinItem[]>([]);
  const [albums, setAlbums] = useState<JellyfinItem[]>([]);
  const [tracks, setTracks] = useState<JellyfinItem[]>([]);

  const [selectedArtist, setSelectedArtist] = useState<JellyfinItem | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<JellyfinItem | null>(null);

  const [nowPlaying, setNowPlaying] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);

  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const [nowPlayingArtist, setNowPlayingArtist] = useState<string | null>(null);
  const [nowPlayingAlbum, setNowPlayingAlbum] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [trackDuration, setTrackDuration] = useState(0);

  const [artistSearch, setArtistSearch] = useState("");

  // Playback queue lives in refs so the audio element's `onended`
  // callback always sees the latest values without re-binding.
  const queueRef = useRef<JellyfinItem[]>(globalQueue);
  const queueIndexRef = useRef<number>(globalQueueIndex);
  const shuffleRef = useRef(globalShuffle);
  const repeatRef = useRef<RepeatMode>(globalRepeat);

  // Settings form state
  const [serverUrl, setServerUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [userId, setUserId] = useState("");
  const [skipSslVerify, setSkipSslVerify] = useState(false);
  const [saving, setSaving] = useState(false);
  const [configured, setConfigured] = useState(false);

  // -- Load settings + initial library on mount --------------
  useEffect(() => {
    if (globalAudio && globalNowPlaying) {
      setNowPlaying(globalNowPlaying);
      setCurrentTrackId(globalCurrentTrackId);
      setIsPlaying(!globalAudio.paused);
      setNowPlayingArtist(globalNowPlayingArtist);
      setNowPlayingAlbum(globalNowPlayingAlbum);
      setShuffle(globalShuffle);
      setRepeat(globalRepeat);
      setCurrentTime(globalAudio.currentTime);
      setTrackDuration(isFinite(globalAudio.duration) ? globalAudio.duration : 0);
      globalAudio.onended = () => handleTrackEnded();
      globalAudio.onerror = () => {
        setIsPlaying(false);
        setNowPlaying(null);
        setCurrentTrackId(null);
        globalNowPlaying = null;
        globalCurrentTrackId = null;
        setError("playback_failed");
      };
    }
    (async () => {
      const cfg = await getSettings();
      setServerUrl(cfg.server_url);
      setApiKey(cfg.api_key);
      setUserId(cfg.user_id);
      setSkipSslVerify(cfg.skip_ssl_verify ?? false);

      const ready = !!(cfg.server_url && cfg.api_key && cfg.user_id);
      setConfigured(ready);

      if (ready) {
        await loadArtists();
      } else {
        setLoading(false);
        setView("settings");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      if (globalAudio) {
        setCurrentTime(globalAudio.currentTime);
        setTrackDuration(isFinite(globalAudio.duration) ? globalAudio.duration : 0);
      }
    }, 500);
    return () => clearInterval(id);
  }, [isPlaying]);

  // -- Artwork helper -------------------------------------------
  const getImageUrl = (id: string): string => {
    if (!serverUrl || !apiKey || !id) return "";
    return `${serverUrl}/Items/${id}/Images/Primary?fillWidth=64&fillHeight=64&quality=80&api_key=${apiKey}`;
  };

  const fmtTime = (s: number): string => {
    if (!isFinite(s) || s < 0) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // -- Search -----------------------------------------------------
  const filteredArtists = artistSearch.trim()
    ? artists.filter((a) =>
        a.Name.toLowerCase().includes(artistSearch.trim().toLowerCase())
      )
    : artists;

  // -- Data loaders -------------------------------------------
  const loadArtists = async () => {
    setLoading(true);
    setError(null);
    const result = await getArtists();
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setArtists(result.items ?? []);
  };

  const openAlbums = async (artist: JellyfinItem) => {
    setSelectedArtist(artist);
    setLoading(true);
    setError(null);
    const result = await getAlbums(artist.Id);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setAlbums(result.items ?? []);
    setView("albums");
  };

  const openTracks = async (album: JellyfinItem) => {
    setSelectedAlbum(album);
    setLoading(true);
    setError(null);
    const result = await getTracks(album.Id);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setTracks(result.items ?? []);
    setView("tracks");
  };

  // -- Playback ---------------------------------------------------
  // Use the local Python proxy so CEF never touches Jellyfin's SSL directly.
  // The proxy handles auth and SSL; play() stays synchronous for autoplay policy.
  const buildStreamUrl = (itemId: string): string => {
    if (!itemId) return "";
    return `http://localhost:9099/audio/${itemId}`;
  };

  // Plays the track at `index` within the current queue (queueRef).
  const playQueueIndex = (index: number) => {
    const queue = queueRef.current;
    if (index < 0 || index >= queue.length) {
      setIsPlaying(false);
      globalNowPlaying = null;
      globalCurrentTrackId = null;
      return;
    }

    const track = queue[index];
    const url = buildStreamUrl(track.Id);
    if (!url) {
      setError("connection_failed");
      return;
    }

    if (globalAudio) {
      globalAudio.onended = null;
      globalAudio.onerror = null;
      globalAudio.pause();
      globalAudio = null;
    }

    setCurrentTime(0);
    setTrackDuration(0);
    queueIndexRef.current = index;
    globalQueueIndex = index;

    globalAudio = new Audio(url);
    globalAudio.onended = () => handleTrackEnded();
    globalAudio.onerror = () => {
      setIsPlaying(false);
      setNowPlaying(null);
      setCurrentTrackId(null);
      globalNowPlaying = null;
      globalCurrentTrackId = null;
      setError("playback_failed");
    };

    globalAudio.play().catch(() => {
      setIsPlaying(false);
      setNowPlaying(null);
      setCurrentTrackId(null);
      globalNowPlaying = null;
      globalCurrentTrackId = null;
      setError("connection_failed");
    });
    setNowPlaying(track.Name);
    setCurrentTrackId(track.Id);
    setIsPlaying(true);
    setError(null);
    globalNowPlaying = track.Name;
    globalCurrentTrackId = track.Id;
  };

  // Called when the current track finishes - decides what plays next
  // based on the current shuffle/repeat settings.
  const handleTrackEnded = () => {
    const queue = queueRef.current;
    if (queue.length === 0) {
      setIsPlaying(false);
      return;
    }

    if (repeatRef.current === "one") {
      playQueueIndex(queueIndexRef.current);
      return;
    }

    if (shuffleRef.current && queue.length > 1) {
      let next = queueIndexRef.current;
      while (next === queueIndexRef.current) {
        next = Math.floor(Math.random() * queue.length);
      }
      playQueueIndex(next);
      return;
    }

    const next = queueIndexRef.current + 1;
    if (next < queue.length) {
      playQueueIndex(next);
    } else if (repeatRef.current === "all") {
      playQueueIndex(0);
    } else {
      setIsPlaying(false);
      globalNowPlaying = null;
      globalCurrentTrackId = null;
    }
  };

  // Manual skip forward/back (honors shuffle, wraps if repeat-all)
  const skip = (direction: 1 | -1) => {
    const queue = queueRef.current;
    if (queue.length === 0) return;

    if (shuffleRef.current && queue.length > 1) {
      let next = queueIndexRef.current;
      while (next === queueIndexRef.current) {
        next = Math.floor(Math.random() * queue.length);
      }
      playQueueIndex(next);
      return;
    }

    let next = queueIndexRef.current + direction;
    if (next < 0) {
      next = repeatRef.current === "all" ? queue.length - 1 : 0;
    } else if (next >= queue.length) {
      next = repeatRef.current === "all" ? 0 : queue.length - 1;
    }
    playQueueIndex(next);
  };

  // Tapping a track loads the whole current album as the queue,
  // starting playback from that track.
  const playTrack = (track: JellyfinItem) => {
    const artistName = selectedArtist?.Name ?? null;
    const albumName = selectedAlbum?.Name ?? null;
    setNowPlayingArtist(artistName);
    setNowPlayingAlbum(albumName);
    globalNowPlayingArtist = artistName;
    globalNowPlayingAlbum = albumName;
    const index = tracks.findIndex((t) => t.Id === track.Id);
    queueRef.current = tracks;
    globalQueue = tracks;
    playQueueIndex(index >= 0 ? index : 0);
  };

  const togglePause = () => {
    if (!globalAudio) return;
    if (globalAudio.paused) {
      globalAudio.play();
      setIsPlaying(true);
    } else {
      globalAudio.pause();
      setIsPlaying(false);
    }
  };

  const toggleShuffle = () => {
    shuffleRef.current = !shuffleRef.current;
    setShuffle(shuffleRef.current);
    globalShuffle = shuffleRef.current;
  };

  const cycleRepeat = () => {
    const order: RepeatMode[] = ["off", "all", "one"];
    const next = order[(order.indexOf(repeatRef.current) + 1) % order.length];
    repeatRef.current = next;
    setRepeat(next);
    globalRepeat = next;
  };

  // -- Settings ---------------------------------------------------
  const handleSaveSettings = async () => {
    setSaving(true);
    await saveSettingsCall(serverUrl, apiKey, userId, skipSslVerify);
    setSaving(false);
    setConfigured(true);
    setView("artists");
    await loadArtists();
  };

  // -- Shared "now playing" mini player -----------------------------
  const NowPlaying = () => {
    if (!nowPlaying) return null;

    const progress = trackDuration > 0 ? currentTime / trackDuration : 0;

    const seek = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!globalAudio || !trackDuration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      globalAudio.currentTime = ratio * trackDuration;
      setCurrentTime(globalAudio.currentTime);
    };

    return (
      <>
        <PanelSectionRow>
          <Focusable style={{ display: "flex", flexDirection: "row", gap: "4px", width: "100%" }}>
            <DialogButton
              onClick={cycleRepeat}
              style={{ ...MINI_BUTTON_STYLE, color: repeat !== "off" ? ACCENT : undefined }}
            >
              <FaRedo />
              {repeat === "one" && <span style={{ fontSize: "0.6em", marginLeft: 2 }}>1</span>}
            </DialogButton>
            <DialogButton onClick={() => skip(-1)} style={MINI_BUTTON_STYLE}>
              <FaStepBackward />
            </DialogButton>
            <DialogButton onClick={togglePause} style={MINI_BUTTON_STYLE}>
              {isPlaying ? <FaPause /> : <FaPlay />}
            </DialogButton>
            <DialogButton onClick={() => skip(1)} style={MINI_BUTTON_STYLE}>
              <FaStepForward />
            </DialogButton>
            <DialogButton
              onClick={toggleShuffle}
              style={{ ...MINI_BUTTON_STYLE, color: shuffle ? ACCENT : undefined }}
            >
              <FaRandom />
            </DialogButton>
          </Focusable>
        </PanelSectionRow>
        <PanelSectionRow>
          <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
            <Thumb src={getImageUrl(currentTrackId ?? "")} fallback={<FaMusic />} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontWeight: "bold",
                fontSize: "0.9em",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                color: ACCENT,
              }}>
                {nowPlaying}
              </div>
              {(nowPlayingArtist || nowPlayingAlbum) && (
                <div style={{
                  fontSize: "0.75em",
                  opacity: 0.7,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {[nowPlayingArtist, nowPlayingAlbum].filter(Boolean).join(" • ")}
                </div>
              )}
            </div>
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <div style={{ width: "100%", paddingBottom: 2 }}>
            <div
              style={{
                background: "rgba(255,255,255,0.15)",
                borderRadius: 3,
                height: 4,
                cursor: "pointer",
                position: "relative",
              }}
              onClick={seek}
            >
              <div style={{
                background: ACCENT,
                borderRadius: 3,
                height: "100%",
                width: `${progress * 100}%`,
                transition: "width 0.3s linear",
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7em", opacity: 0.6, marginTop: 2 }}>
              <span>{fmtTime(currentTime)}</span>
              <span>{fmtTime(trackDuration)}</span>
            </div>
          </div>
        </PanelSectionRow>
      </>
    );
  };

  const ErrorRow = () =>
    error ? (
      <PanelSectionRow>
        <div style={{ color: "#ff6b6b", padding: "4px 0" }}>
          {friendlyError(error)}
        </div>
      </PanelSectionRow>
    ) : null;

  // -- Settings view ------------------------------------------------
  if (view === "settings") {
    return (
      <PanelSection title="Jellyfin Settings">
        <ErrorRow />
        <PanelSectionRow>
          <TextField
            label="Server URL"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            mustBeURL
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <TextField
            label="API Key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            bIsPassword
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <TextField
            label="User ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ToggleField
            label="Skip SSL verification"
            description="Enable for local servers with self-signed certificates"
            checked={skipSslVerify}
            onChange={setSkipSslVerify}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={handleSaveSettings}>
            {saving ? "Saving..." : "Save & Connect"}
          </ButtonItem>
        </PanelSectionRow>
        {configured && (
          <PanelSectionRow>
            <ButtonItem layout="below" onClick={() => setView("artists")}>
              <FaArrowLeft /> Back to library
            </ButtonItem>
          </PanelSectionRow>
        )}
      </PanelSection>
    );
  }

  // -- Loading state --------------------------------------------------
  if (loading) {
    return (
      <PanelSection title="Jelly Tunes">
        <PanelSectionRow>Loading...</PanelSectionRow>
      </PanelSection>
    );
  }

  // -- Albums view ------------------------------------------------------
  if (view === "albums") {
    return (
      <PanelSection title={selectedArtist?.Name ?? "Albums"}>
        <ErrorRow />
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={() => setView("artists")}>
            <FaArrowLeft /> Artists
          </ButtonItem>
        </PanelSectionRow>
        <NowPlaying />
        {albums.map((album) => (
          <PanelSectionRow key={album.Id}>
            <ButtonItem
              layout="below"
              icon={<Thumb src={getImageUrl(album.Id)} fallback={<FaMusic />} />}
              onClick={() => openTracks(album)}
            >
              {album.Name}
              {album.ProductionYear ? ` (${album.ProductionYear})` : ""}
            </ButtonItem>
          </PanelSectionRow>
        ))}
        {albums.length === 0 && (
          <PanelSectionRow>No albums found for this artist.</PanelSectionRow>
        )}
      </PanelSection>
    );
  }

  // -- Tracks view -------------------------------------------------------
  if (view === "tracks") {
    return (
      <PanelSection title={selectedAlbum?.Name ?? "Tracks"}>
        <ErrorRow />
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={() => setView("albums")}>
            <FaArrowLeft /> Albums
          </ButtonItem>
        </PanelSectionRow>
        <NowPlaying />
        {tracks.map((track) => (
          <PanelSectionRow key={track.Id}>
            <ButtonItem
              layout="below"
              icon={<Thumb src={getImageUrl(track.Id)} fallback={<FaMusic />} />}
              onClick={() => playTrack(track)}
            >
              <span
                style={{
                  color: track.Id === currentTrackId ? ACCENT : undefined,
                }}
              >
                {track.IndexNumber ? `${track.IndexNumber}. ` : ""}
                {track.Name}
              </span>
            </ButtonItem>
          </PanelSectionRow>
        ))}
        {tracks.length === 0 && (
          <PanelSectionRow>No tracks found on this album.</PanelSectionRow>
        )}
      </PanelSection>
    );
  }

  // -- Artists view (default) -------------------------------------------
  return (
    <PanelSection title="Jelly Tunes">
      <ErrorRow />
      <NowPlaying />
      <PanelSectionRow>
        <TextField
          label="Search artists"
          value={artistSearch}
          onChange={(e) => setArtistSearch(e.target.value)}
          bShowClearAction
          bAlwaysShowClearAction={artistSearch.length > 0}
        />
      </PanelSectionRow>
      {filteredArtists.map((artist) => (
        <PanelSectionRow key={artist.Id}>
          <ButtonItem
            layout="below"
            icon={<Thumb src={getImageUrl(artist.Id)} fallback={<FaMusic />} />}
            onClick={() => openAlbums(artist)}
          >
            {artist.Name}
          </ButtonItem>
        </PanelSectionRow>
      ))}
      {artists.length === 0 && !error && (
        <PanelSectionRow>No artists found in your library.</PanelSectionRow>
      )}
      {artists.length > 0 && filteredArtists.length === 0 && (
        <PanelSectionRow>
          No artists match &quot;{artistSearch}&quot;.
        </PanelSectionRow>
      )}
      <PanelSectionRow>
        <ButtonItem layout="below" onClick={() => setView("settings")}>
          <FaCog /> Settings
        </ButtonItem>
      </PanelSectionRow>
    </PanelSection>
  );
}

export default definePlugin(() => {
  return {
    name: "Jelly Tunes",
    titleView: <div className={staticClasses.Title}>Jelly Tunes</div>,
    content: <Content />,
    icon: <FaMusic />,
    onDismount() {
      if (globalAudio) {
        globalAudio.onended = null;
        globalAudio.onerror = null;
        globalAudio.pause();
        globalAudio = null;
      }
    },
  };
});
