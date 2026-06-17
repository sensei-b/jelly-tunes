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
  Type?: string;
  Album?: string;
  AlbumArtist?: string;
  AlbumId?: string;
}

interface SearchResults {
  artists: JellyfinItem[];
  albums: JellyfinItem[];
  tracks: JellyfinItem[];
  error?: string;
}

interface ItemsResult {
  items?: JellyfinItem[];
  error?: string;
}

interface JellySettings {
  server_url: string;
  local_url: string;
  api_key: string;
  user_id: string;
  skip_ssl_verify: boolean;
}

type View = "artists" | "albums" | "tracks" | "settings";
type RepeatMode = "off" | "all" | "one";

interface BreadcrumbSegment {
  label: string;
  onClick?: () => void;
}

// -- Backend calls ----------------------------------------------------

const getSettings = callable<[], JellySettings>("get_settings");
const saveSettingsCall = callable<
  [server_url: string, api_key: string, user_id: string, local_url: string, skip_ssl_verify: boolean],
  boolean
>("save_settings");
const getArtists = callable<[], ItemsResult>("get_artists");
const getAlbums = callable<[artist_id: string], ItemsResult>("get_albums");
const getTracks = callable<[album_id: string], ItemsResult>("get_tracks");
const getStreamUrl = callable<[item_id: string], string>("get_stream_url");
const searchAll = callable<[query: string], SearchResults>("search_all");

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
  display: "block",
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

const MINI_BUTTON_STYLE: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 0",
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

function ensureMarqueeStyle() {
  if (document.getElementById("jt-marquee-style")) return;
  const s = document.createElement("style");
  s.id = "jt-marquee-style";
  s.textContent =
    "@keyframes jt-marquee{0%,20%{transform:translateX(0)}80%,100%{transform:translateX(var(--jt-scroll,0px))}}";
  document.head.appendChild(s);
}

function MarqueeText({ text }: { text: string }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLSpanElement>(null);
  const [scroll, setScroll] = useState(0);

  useEffect(() => {
    ensureMarqueeStyle();
    const measure = () => {
      if (outerRef.current && innerRef.current) {
        const overflow = innerRef.current.scrollWidth - outerRef.current.clientWidth;
        setScroll(Math.max(0, overflow));
      }
    };
    measure();
    // Decky overlays settle layout slowly; retry at increasing delays to catch it
    const t1 = setTimeout(measure, 50);
    const t2 = setTimeout(measure, 200);
    const t3 = setTimeout(measure, 500);
    const ro = new ResizeObserver(measure);
    if (outerRef.current) ro.observe(outerRef.current);
    if (innerRef.current) ro.observe(innerRef.current);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      ro.disconnect();
    };
  }, [text]);

  const innerStyle: React.CSSProperties = { display: "inline-block", whiteSpace: "nowrap" };
  if (scroll > 0) {
    innerStyle.animation = "jt-marquee 8s ease-in-out infinite";
    (innerStyle as Record<string, unknown>)["--jt-scroll"] = `-${scroll}px`;
  }

  return (
    <div ref={outerRef} style={{ overflow: "hidden", width: "100%" }}>
      <span ref={innerRef} style={innerStyle}>{text}</span>
    </div>
  );
}

function thumbUrl(id: string): string {
  if (!id) return "";
  return `http://localhost:9099/image/${id}`;
}

function fmtTime(s: number): string {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

// -- Now Playing component -------------------------------------------
// Defined at module level so React sees a stable component type across
// Content re-renders (prevents Steam's focus system from resetting
// every time the progress timer fires).

interface NowPlayingProps {
  nowPlaying: string;
  isPlaying: boolean;
  currentTrackId: string | null;
  nowPlayingArtist: string | null;
  nowPlayingAlbum: string | null;
  currentTime: number;
  trackDuration: number;
  shuffle: boolean;
  repeat: RepeatMode;
  serverUrl: string;
  apiKey: string;
  onTogglePause(): void;
  onSkip(dir: 1 | -1): void;
  onToggleShuffle(): void;
  onCycleRepeat(): void;
  onSeek(ratio: number): void;
}

function NowPlaying({
  nowPlaying, isPlaying, currentTrackId, nowPlayingArtist, nowPlayingAlbum,
  currentTime, trackDuration, shuffle, repeat, serverUrl, apiKey,
  onTogglePause, onSkip, onToggleShuffle, onCycleRepeat, onSeek,
}: NowPlayingProps) {
  const progress = trackDuration > 0 ? currentTime / trackDuration : 0;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    onSeek(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
  };

  return (
    <>
      <PanelSectionRow>
        <Focusable
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore — flow-children is a Steam UI prop not in the type defs
          flow-children="row"
          style={{ display: "flex", flexDirection: "row", gap: "4px", width: "100%" }}
        >
          <DialogButton
            onClick={onCycleRepeat}
            style={{ ...MINI_BUTTON_STYLE, color: repeat !== "off" ? ACCENT : undefined }}
          >
            <FaRedo />
            {repeat === "one" && <span style={{ fontSize: "0.6em", marginLeft: 2 }}>1</span>}
          </DialogButton>
          <DialogButton onClick={() => onSkip(-1)} style={MINI_BUTTON_STYLE}>
            <FaStepBackward />
          </DialogButton>
          <DialogButton onClick={onTogglePause} style={MINI_BUTTON_STYLE}>
            {isPlaying ? <FaPause /> : <FaPlay />}
          </DialogButton>
          <DialogButton onClick={() => onSkip(1)} style={MINI_BUTTON_STYLE}>
            <FaStepForward />
          </DialogButton>
          <DialogButton
            onClick={onToggleShuffle}
            style={{ ...MINI_BUTTON_STYLE, color: shuffle ? ACCENT : undefined }}
          >
            <FaRandom />
          </DialogButton>
        </Focusable>
      </PanelSectionRow>
      <PanelSectionRow>
        <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
          <Thumb src={thumbUrl(currentTrackId ?? "")} fallback={<FaMusic />} />
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
            onClick={handleSeek}
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
}

function Breadcrumb({ segments }: { segments: BreadcrumbSegment[] }) {
  return (
    <PanelSectionRow>
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "4px 6px", padding: "2px 0", fontSize: "0.82em" }}>
        {segments.flatMap((seg, i) => {
          const el = seg.onClick ? (
            <button
              key={`s${i}`}
              onClick={seg.onClick}
              style={{
                background: "none", border: "none", color: ACCENT, cursor: "pointer",
                padding: 0, fontSize: "inherit", fontFamily: "inherit",
                maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}
            >
              {seg.label}
            </button>
          ) : (
            <span
              key={`s${i}`}
              style={{ opacity: 0.75, maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "inline-block" }}
            >
              {seg.label}
            </span>
          );
          return i === 0 ? [el] : [<span key={`sep${i}`} style={{ opacity: 0.4 }}>›</span>, el];
        })}
      </div>
    </PanelSectionRow>
  );
}

interface BrowseListProps {
  title: string;
  breadcrumbs: BreadcrumbSegment[];
  nowPlayingProps: NowPlayingProps | null;
  error: string | null;
  searchValue: string;
  onSearchChange: (v: string) => void;
  searchLabel: string;
  items: JellyfinItem[];
  filteredItems: JellyfinItem[];
  emptyLabel: string;
  noMatchLabel: string;
  renderItem: (item: JellyfinItem) => ReactNode;
}

function BrowseList({
  title, breadcrumbs, nowPlayingProps, error,
  searchValue, onSearchChange, searchLabel,
  items, filteredItems, emptyLabel, noMatchLabel,
  renderItem,
}: BrowseListProps) {
  return (
    <PanelSection title={title}>
      {error && (
        <PanelSectionRow>
          <div style={{ color: "#ff6b6b", padding: "4px 0" }}>{friendlyError(error)}</div>
        </PanelSectionRow>
      )}
      <Breadcrumb segments={breadcrumbs} />
      {nowPlayingProps && <NowPlaying {...nowPlayingProps} />}
      <PanelSectionRow>
        <TextField
          label={searchLabel}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          bShowClearAction
          bAlwaysShowClearAction={searchValue.length > 0}
        />
      </PanelSectionRow>
      {filteredItems.map(renderItem)}
      {items.length === 0 && <PanelSectionRow>{emptyLabel}</PanelSectionRow>}
      {items.length > 0 && filteredItems.length === 0 && (
        <PanelSectionRow>{noMatchLabel}</PanelSectionRow>
      )}
    </PanelSection>
  );
}

function filterByName<T extends { Name: string }>(items: T[], search: string): T[] {
  const term = search.trim().toLowerCase();
  return term ? items.filter((i) => i.Name.toLowerCase().includes(term)) : items;
}

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

  const [globalSearch, setGlobalSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [albumSearch, setAlbumSearch] = useState("");
  const [trackSearch, setTrackSearch] = useState("");

  // Playback queue lives in refs so the audio element's `onended`
  // callback always sees the latest values without re-binding.
  const queueRef = useRef<JellyfinItem[]>(globalQueue);
  const queueIndexRef = useRef<number>(globalQueueIndex);
  const shuffleRef = useRef(globalShuffle);
  const repeatRef = useRef<RepeatMode>(globalRepeat);

  // Settings form state
  const [serverUrl, setServerUrl] = useState("");
  const [localUrl, setLocalUrl] = useState("");
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
      setLocalUrl(cfg.local_url ?? "");
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

  useEffect(() => {
    const term = globalSearch.trim();
    if (term.length < 2) {
      setSearchResults(null);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    const timeout = setTimeout(async () => {
      const result = await searchAll(term);
      setSearchResults(result);
      setSearchLoading(false);
    }, 400);
    return () => clearTimeout(timeout);
  }, [globalSearch]);

  // -- Search -----------------------------------------------------
  const filteredAlbums = filterByName(albums, albumSearch);
  const filteredTracks = filterByName(tracks, trackSearch);

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
    setAlbumSearch("");
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
    setTrackSearch("");
    setView("tracks");
  };

  // -- Playback ---------------------------------------------------
  const buildStreamUrl = (itemId: string): string => {
    if (!itemId) return "";
    return `http://localhost:9099/audio/${itemId}`;
  };

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

  const playAlbum = async (album: JellyfinItem) => {
    const result = await getTracks(album.Id);
    if (!result.items?.length) return;
    const albumTracks = result.items;
    const artistName = selectedArtist?.Name ?? null;
    setSelectedAlbum(album);
    setTracks(albumTracks);
    setNowPlayingArtist(artistName);
    setNowPlayingAlbum(album.Name);
    globalNowPlayingArtist = artistName;
    globalNowPlayingAlbum = album.Name;
    queueRef.current = albumTracks;
    globalQueue = albumTracks;
    playQueueIndex(0);
  };

  const playSearchTrack = (track: JellyfinItem) => {
    const artist = track.AlbumArtist ?? null;
    const album = track.Album ?? null;
    setNowPlayingArtist(artist);
    setNowPlayingAlbum(album);
    globalNowPlayingArtist = artist;
    globalNowPlayingAlbum = album;
    queueRef.current = [track];
    globalQueue = [track];
    playQueueIndex(0);
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

  const handleSeek = (ratio: number) => {
    if (globalAudio && trackDuration) {
      globalAudio.currentTime = ratio * trackDuration;
      setCurrentTime(globalAudio.currentTime);
    }
  };

  // -- Settings ---------------------------------------------------
  const handleSaveSettings = async () => {
    setSaving(true);
    await saveSettingsCall(serverUrl, apiKey, userId, localUrl, skipSslVerify);
    setSaving(false);
    setConfigured(true);
    setView("artists");
    await loadArtists();
  };

  // -- Shared now-playing props ----------------------------------
  const nowPlayingProps: NowPlayingProps | null = nowPlaying ? {
    nowPlaying,
    isPlaying,
    currentTrackId,
    nowPlayingArtist,
    nowPlayingAlbum,
    currentTime,
    trackDuration,
    shuffle,
    repeat,
    serverUrl,
    apiKey,
    onTogglePause: togglePause,
    onSkip: skip,
    onToggleShuffle: toggleShuffle,
    onCycleRepeat: cycleRepeat,
    onSeek: handleSeek,
  } : null;

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
            label="Local URL (optional)"
            description="Direct LAN address, e.g. http://192.168.1.x:8096. Used instead of Server URL when reachable."
            value={localUrl}
            onChange={(e) => setLocalUrl(e.target.value)}
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
      <BrowseList
        title={selectedArtist?.Name ?? "Albums"}
        breadcrumbs={[
          { label: "Artists", onClick: () => setView("artists") },
          ...(selectedArtist ? [{ label: selectedArtist.Name }] : []),
        ]}
        nowPlayingProps={nowPlayingProps}
        error={error}
        searchValue={albumSearch}
        onSearchChange={setAlbumSearch}
        searchLabel="Search albums"
        items={albums}
        filteredItems={filteredAlbums}
        emptyLabel="No albums found for this artist."
        noMatchLabel={`No albums match "${albumSearch}".`}
        renderItem={(album) => (
          <PanelSectionRow key={album.Id}>
            <Focusable
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              flow-children="row"
              style={{ display: "flex", gap: 4, width: "100%", alignItems: "center" }}
            >
              <Thumb src={thumbUrl(album.Id)} fallback={<FaMusic />} />
              <DialogButton
                style={{ flex: 1, minWidth: 0, overflow: "hidden" }}
                onClick={() => openTracks(album)}
              >
                <MarqueeText text={album.Name + (album.ProductionYear ? ` (${album.ProductionYear})` : "")} />
              </DialogButton>
              <DialogButton
                style={{ width: 40, flexShrink: 0, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 0" }}
                onClick={() => playAlbum(album)}
              >
                <FaPlay />
              </DialogButton>
            </Focusable>
          </PanelSectionRow>
        )}
      />
    );
  }

  // -- Tracks view -------------------------------------------------------
  if (view === "tracks") {
    return (
      <BrowseList
        title={selectedAlbum?.Name ?? "Tracks"}
        breadcrumbs={[
          { label: "Artists", onClick: () => setView("artists") },
          ...(selectedArtist ? [{ label: selectedArtist.Name, onClick: () => setView("albums") }] : []),
          ...(selectedAlbum ? [{ label: selectedAlbum.Name }] : []),
        ]}
        nowPlayingProps={nowPlayingProps}
        error={error}
        searchValue={trackSearch}
        onSearchChange={setTrackSearch}
        searchLabel="Search tracks"
        items={tracks}
        filteredItems={filteredTracks}
        emptyLabel="No tracks found on this album."
        noMatchLabel={`No tracks match "${trackSearch}".`}
        renderItem={(track) => (
          <PanelSectionRow key={track.Id}>
            <ButtonItem
              layout="below"
              icon={<Thumb src={thumbUrl(track.Id)} fallback={<FaMusic />} />}
              onClick={() => playTrack(track)}
            >
              <span style={{ color: track.Id === currentTrackId ? ACCENT : undefined }}>
                {track.IndexNumber ? `${track.IndexNumber}. ` : ""}
                {track.Name}
              </span>
            </ButtonItem>
          </PanelSectionRow>
        )}
      />
    );
  }

  const SearchSectionLabel = ({ label }: { label: string }) => (
    <PanelSectionRow>
      <div style={{ fontSize: "0.75em", opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </div>
    </PanelSectionRow>
  );

  // -- Artists view (default) -------------------------------------------
  return (
    <PanelSection title="Jelly Tunes">
      <ErrorRow />
      {nowPlayingProps && <NowPlaying {...nowPlayingProps} />}
      <PanelSectionRow>
        <ButtonItem layout="below" onClick={() => setView("settings")}>
          <FaCog /> Settings
        </ButtonItem>
      </PanelSectionRow>
      <PanelSectionRow>
        <TextField
          label="Search artists, albums & songs"
          value={globalSearch}
          onChange={(e) => setGlobalSearch(e.target.value)}
          bShowClearAction
          bAlwaysShowClearAction={globalSearch.length > 0}
        />
      </PanelSectionRow>
      {globalSearch.trim().length >= 2 ? (
        <>
          {searchLoading && <PanelSectionRow>Searching...</PanelSectionRow>}
          {!searchLoading && searchResults && (
            <>
              {searchResults.artists.length > 0 && (
                <>
                  <SearchSectionLabel label="Artists" />
                  {searchResults.artists.map((artist) => (
                    <PanelSectionRow key={artist.Id}>
                      <ButtonItem
                        layout="below"
                        icon={<Thumb src={thumbUrl(artist.Id)} fallback={<FaMusic />} />}
                        onClick={() => openAlbums(artist)}
                      >
                        {artist.Name}
                      </ButtonItem>
                    </PanelSectionRow>
                  ))}
                </>
              )}
              {searchResults.albums.length > 0 && (
                <>
                  <SearchSectionLabel label="Albums" />
                  {searchResults.albums.map((album) => (
                    <PanelSectionRow key={album.Id}>
                      <Focusable
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore
                        flow-children="row"
                        style={{ display: "flex", gap: 4, width: "100%", alignItems: "center" }}
                      >
                        <Thumb src={thumbUrl(album.Id)} fallback={<FaMusic />} />
                        <DialogButton
                          style={{ flex: 1, minWidth: 0, overflow: "hidden" }}
                          onClick={() => openTracks(album)}
                        >
                          <MarqueeText text={album.Name + (album.ProductionYear ? ` (${album.ProductionYear})` : "")} />
                        </DialogButton>
                        <DialogButton
                          style={{ width: 40, flexShrink: 0, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 0" }}
                          onClick={() => playAlbum(album)}
                        >
                          <FaPlay />
                        </DialogButton>
                      </Focusable>
                    </PanelSectionRow>
                  ))}
                </>
              )}
              {searchResults.tracks.length > 0 && (
                <>
                  <SearchSectionLabel label="Songs" />
                  {searchResults.tracks.map((track) => (
                    <PanelSectionRow key={track.Id}>
                      <ButtonItem
                        layout="below"
                        icon={<Thumb src={thumbUrl(track.Id)} fallback={<FaMusic />} />}
                        onClick={() => playSearchTrack(track)}
                      >
                        <span style={{ color: track.Id === currentTrackId ? ACCENT : undefined }}>
                          {track.Name}
                        </span>
                      </ButtonItem>
                    </PanelSectionRow>
                  ))}
                </>
              )}
              {!searchResults.error &&
                searchResults.artists.length === 0 &&
                searchResults.albums.length === 0 &&
                searchResults.tracks.length === 0 && (
                  <PanelSectionRow>
                    No results for &quot;{globalSearch.trim()}&quot;.
                  </PanelSectionRow>
                )}
              {searchResults.error && (
                <PanelSectionRow>Search failed — check your connection.</PanelSectionRow>
              )}
            </>
          )}
        </>
      ) : (
        <>
          {artists.map((artist) => (
            <PanelSectionRow key={artist.Id}>
              <ButtonItem
                layout="below"
                icon={<Thumb src={thumbUrl(artist.Id)} fallback={<FaMusic />} />}
                onClick={() => openAlbums(artist)}
              >
                {artist.Name}
              </ButtonItem>
            </PanelSectionRow>
          ))}
          {artists.length === 0 && !error && (
            <PanelSectionRow>No artists found in your library.</PanelSectionRow>
          )}
        </>
      )}
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
