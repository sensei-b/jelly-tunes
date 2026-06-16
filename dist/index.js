const manifest = {"name":"Jelly Tunes"};
const API_VERSION = 2;
const internalAPIConnection = window.__DECKY_SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED_deckyLoaderAPIInit;
if (!internalAPIConnection) {
    throw new Error('[@decky/api]: Failed to connect to the loader as as the loader API was not initialized. This is likely a bug in Decky Loader.');
}
let api;
try {
    api = internalAPIConnection.connect(API_VERSION, manifest.name);
}
catch {
    api = internalAPIConnection.connect(1, manifest.name);
    console.warn(`[@decky/api] Requested API version ${API_VERSION} but the running loader only supports version 1. Some features may not work.`);
}
if (api._version != API_VERSION) {
    console.warn(`[@decky/api] Requested API version ${API_VERSION} but the running loader only supports version ${api._version}. Some features may not work.`);
}
const callable = api.callable;
const definePlugin = (fn) => {
    return (...args) => {
        return fn(...args);
    };
};

var DefaultContext = {
  color: undefined,
  size: undefined,
  className: undefined,
  style: undefined,
  attr: undefined
};
var IconContext = SP_REACT.createContext && /*#__PURE__*/SP_REACT.createContext(DefaultContext);

var _excluded = ["attr", "size", "title"];
function _objectWithoutProperties(source, excluded) { if (source == null) return {}; var target = _objectWithoutPropertiesLoose(source, excluded); var key, i; if (Object.getOwnPropertySymbols) { var sourceSymbolKeys = Object.getOwnPropertySymbols(source); for (i = 0; i < sourceSymbolKeys.length; i++) { key = sourceSymbolKeys[i]; if (excluded.indexOf(key) >= 0) continue; if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue; target[key] = source[key]; } } return target; }
function _objectWithoutPropertiesLoose(source, excluded) { if (source == null) return {}; var target = {}; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { if (excluded.indexOf(key) >= 0) continue; target[key] = source[key]; } } return target; }
function _extends() { _extends = Object.assign ? Object.assign.bind() : function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), true).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function Tree2Element(tree) {
  return tree && tree.map((node, i) => /*#__PURE__*/SP_REACT.createElement(node.tag, _objectSpread({
    key: i
  }, node.attr), Tree2Element(node.child)));
}
function GenIcon(data) {
  return props => /*#__PURE__*/SP_REACT.createElement(IconBase, _extends({
    attr: _objectSpread({}, data.attr)
  }, props), Tree2Element(data.child));
}
function IconBase(props) {
  var elem = conf => {
    var {
        attr,
        size,
        title
      } = props,
      svgProps = _objectWithoutProperties(props, _excluded);
    var computedSize = size || conf.size || "1em";
    var className;
    if (conf.className) className = conf.className;
    if (props.className) className = (className ? className + " " : "") + props.className;
    return /*#__PURE__*/SP_REACT.createElement("svg", _extends({
      stroke: "currentColor",
      fill: "currentColor",
      strokeWidth: "0"
    }, conf.attr, attr, svgProps, {
      className: className,
      style: _objectSpread(_objectSpread({
        color: props.color || conf.color
      }, conf.style), props.style),
      height: computedSize,
      width: computedSize,
      xmlns: "http://www.w3.org/2000/svg"
    }), title && /*#__PURE__*/SP_REACT.createElement("title", null, title), props.children);
  };
  return IconContext !== undefined ? /*#__PURE__*/SP_REACT.createElement(IconContext.Consumer, null, conf => elem(conf)) : elem(DefaultContext);
}

// THIS FILE IS AUTO GENERATED
function FaArrowLeft (props) {
  return GenIcon({"attr":{"viewBox":"0 0 448 512"},"child":[{"tag":"path","attr":{"d":"M257.5 445.1l-22.2 22.2c-9.4 9.4-24.6 9.4-33.9 0L7 273c-9.4-9.4-9.4-24.6 0-33.9L201.4 44.7c9.4-9.4 24.6-9.4 33.9 0l22.2 22.2c9.5 9.5 9.3 25-.4 34.3L136.6 216H424c13.3 0 24 10.7 24 24v32c0 13.3-10.7 24-24 24H136.6l120.5 114.8c9.8 9.3 10 24.8.4 34.3z"},"child":[]}]})(props);
}function FaCog (props) {
  return GenIcon({"attr":{"viewBox":"0 0 512 512"},"child":[{"tag":"path","attr":{"d":"M487.4 315.7l-42.6-24.6c4.3-23.2 4.3-47 0-70.2l42.6-24.6c4.9-2.8 7.1-8.6 5.5-14-11.1-35.6-30-67.8-54.7-94.6-3.8-4.1-10-5.1-14.8-2.3L380.8 110c-17.9-15.4-38.5-27.3-60.8-35.1V25.8c0-5.6-3.9-10.5-9.4-11.7-36.7-8.2-74.3-7.8-109.2 0-5.5 1.2-9.4 6.1-9.4 11.7V75c-22.2 7.9-42.8 19.8-60.8 35.1L88.7 85.5c-4.9-2.8-11-1.9-14.8 2.3-24.7 26.7-43.6 58.9-54.7 94.6-1.7 5.4.6 11.2 5.5 14L67.3 221c-4.3 23.2-4.3 47 0 70.2l-42.6 24.6c-4.9 2.8-7.1 8.6-5.5 14 11.1 35.6 30 67.8 54.7 94.6 3.8 4.1 10 5.1 14.8 2.3l42.6-24.6c17.9 15.4 38.5 27.3 60.8 35.1v49.2c0 5.6 3.9 10.5 9.4 11.7 36.7 8.2 74.3 7.8 109.2 0 5.5-1.2 9.4-6.1 9.4-11.7v-49.2c22.2-7.9 42.8-19.8 60.8-35.1l42.6 24.6c4.9 2.8 11 1.9 14.8-2.3 24.7-26.7 43.6-58.9 54.7-94.6 1.5-5.5-.7-11.3-5.6-14.1zM256 336c-44.1 0-80-35.9-80-80s35.9-80 80-80 80 35.9 80 80-35.9 80-80 80z"},"child":[]}]})(props);
}function FaMusic (props) {
  return GenIcon({"attr":{"viewBox":"0 0 512 512"},"child":[{"tag":"path","attr":{"d":"M470.38 1.51L150.41 96A32 32 0 0 0 128 126.51v261.41A139 139 0 0 0 96 384c-53 0-96 28.66-96 64s43 64 96 64 96-28.66 96-64V214.32l256-75v184.61a138.4 138.4 0 0 0-32-3.93c-53 0-96 28.66-96 64s43 64 96 64 96-28.65 96-64V32a32 32 0 0 0-41.62-30.49z"},"child":[]}]})(props);
}function FaPause (props) {
  return GenIcon({"attr":{"viewBox":"0 0 448 512"},"child":[{"tag":"path","attr":{"d":"M144 479H48c-26.5 0-48-21.5-48-48V79c0-26.5 21.5-48 48-48h96c26.5 0 48 21.5 48 48v352c0 26.5-21.5 48-48 48zm304-48V79c0-26.5-21.5-48-48-48h-96c-26.5 0-48 21.5-48 48v352c0 26.5 21.5 48 48 48h96c26.5 0 48-21.5 48-48z"},"child":[]}]})(props);
}function FaPlay (props) {
  return GenIcon({"attr":{"viewBox":"0 0 448 512"},"child":[{"tag":"path","attr":{"d":"M424.4 214.7L72.4 6.6C43.8-10.3 0 6.1 0 47.9V464c0 37.5 40.7 60.1 72.4 41.3l352-208c31.4-18.5 31.5-64.1 0-82.6z"},"child":[]}]})(props);
}function FaRandom (props) {
  return GenIcon({"attr":{"viewBox":"0 0 512 512"},"child":[{"tag":"path","attr":{"d":"M504.971 359.029c9.373 9.373 9.373 24.569 0 33.941l-80 79.984c-15.01 15.01-40.971 4.49-40.971-16.971V416h-58.785a12.004 12.004 0 0 1-8.773-3.812l-70.556-75.596 53.333-57.143L352 336h32v-39.981c0-21.438 25.943-31.998 40.971-16.971l80 79.981zM12 176h84l52.781 56.551 53.333-57.143-70.556-75.596A11.999 11.999 0 0 0 122.785 96H12c-6.627 0-12 5.373-12 12v56c0 6.627 5.373 12 12 12zm372 0v39.984c0 21.46 25.961 31.98 40.971 16.971l80-79.984c9.373-9.373 9.373-24.569 0-33.941l-80-79.981C409.943 24.021 384 34.582 384 56.019V96h-58.785a12.004 12.004 0 0 0-8.773 3.812L96 336H12c-6.627 0-12 5.373-12 12v56c0 6.627 5.373 12 12 12h110.785c3.326 0 6.503-1.381 8.773-3.812L352 176h32z"},"child":[]}]})(props);
}function FaRedo (props) {
  return GenIcon({"attr":{"viewBox":"0 0 512 512"},"child":[{"tag":"path","attr":{"d":"M500.33 0h-47.41a12 12 0 0 0-12 12.57l4 82.76A247.42 247.42 0 0 0 256 8C119.34 8 7.9 119.53 8 256.19 8.1 393.07 119.1 504 256 504a247.1 247.1 0 0 0 166.18-63.91 12 12 0 0 0 .48-17.43l-34-34a12 12 0 0 0-16.38-.55A176 176 0 1 1 402.1 157.8l-101.53-4.87a12 12 0 0 0-12.57 12v47.41a12 12 0 0 0 12 12h200.33a12 12 0 0 0 12-12V12a12 12 0 0 0-12-12z"},"child":[]}]})(props);
}function FaStepBackward (props) {
  return GenIcon({"attr":{"viewBox":"0 0 448 512"},"child":[{"tag":"path","attr":{"d":"M64 468V44c0-6.6 5.4-12 12-12h48c6.6 0 12 5.4 12 12v176.4l195.5-181C352.1 22.3 384 36.6 384 64v384c0 27.4-31.9 41.7-52.5 24.6L136 292.7V468c0 6.6-5.4 12-12 12H76c-6.6 0-12-5.4-12-12z"},"child":[]}]})(props);
}function FaStepForward (props) {
  return GenIcon({"attr":{"viewBox":"0 0 448 512"},"child":[{"tag":"path","attr":{"d":"M384 44v424c0 6.6-5.4 12-12 12h-48c-6.6 0-12-5.4-12-12V291.6l-195.5 181C95.9 489.7 64 475.4 64 448V64c0-27.4 31.9-41.7 52.5-24.6L312 219.3V44c0-6.6 5.4-12 12-12h48c6.6 0 12 5.4 12 12z"},"child":[]}]})(props);
}

// -- Backend calls ----------------------------------------------------
const getSettings = callable("get_settings");
const saveSettingsCall = callable("save_settings");
const getArtists = callable("get_artists");
const getAlbums = callable("get_albums");
const getTracks = callable("get_tracks");
callable("get_stream_url");
// Single shared audio element so playback survives view changes
let globalAudio = null;
let globalNowPlaying = null;
let globalCurrentTrackId = null;
let globalNowPlayingArtist = null;
let globalNowPlayingAlbum = null;
let globalQueue = [];
let globalQueueIndex = -1;
let globalShuffle = false;
let globalRepeat = "off";
const ERROR_MESSAGES = {
    not_configured: "Add your Jellyfin server details in Settings first.",
    timeout: "Connection to Jellyfin timed out.",
    connection_failed: "Couldn't reach the Jellyfin server.",
    playback_failed: "Couldn't play this track — check your connection or try another track.",
};
function friendlyError(code) {
    if (!code)
        return "Something went wrong.";
    return ERROR_MESSAGES[code] ?? `Jellyfin returned an error (${code}).`;
}
const ACCENT = "#5fb3ff";
const THUMB_STYLE = {
    width: 32,
    height: 32,
    borderRadius: 4,
    objectFit: "cover",
    flexShrink: 0,
};
const THUMB_FALLBACK_STYLE = {
    width: 32,
    height: 32,
    borderRadius: 4,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(255, 255, 255, 0.08)",
    flexShrink: 0,
};
const MINI_BUTTON_STYLE = {
    flex: 1,
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 0",
};
// Album / artist / track artwork with a graceful fallback to a music icon
// if Jellyfin has no image for that item (or the request errors out).
function Thumb({ src, fallback }) {
    const [errored, setErrored] = SP_REACT.useState(false);
    if (!src || errored) {
        return SP_JSX.jsx("div", { style: THUMB_FALLBACK_STYLE, children: fallback });
    }
    return (
    // eslint-disable-next-line jsx-a11y/alt-text
    SP_JSX.jsx("img", { src: src, onError: () => setErrored(true), style: THUMB_STYLE }));
}
function thumbUrl(id) {
    if (!id)
        return "";
    return `http://localhost:9099/image/${id}`;
}
function fmtTime(s) {
    if (!isFinite(s) || s < 0)
        return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
}
function NowPlaying({ nowPlaying, isPlaying, currentTrackId, nowPlayingArtist, nowPlayingAlbum, currentTime, trackDuration, shuffle, repeat, serverUrl, apiKey, onTogglePause, onSkip, onToggleShuffle, onCycleRepeat, onSeek, }) {
    const progress = trackDuration > 0 ? currentTime / trackDuration : 0;
    const handleSeek = (e) => {
        if (!trackDuration)
            return;
        const rect = e.currentTarget.getBoundingClientRect();
        onSeek(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
    };
    return (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.Focusable
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore — flow-children is a Steam UI prop not in the type defs
                , { "flow-children": "row", style: { display: "flex", flexDirection: "row", gap: "4px", width: "100%" }, children: [SP_JSX.jsxs(DFL.DialogButton, { onClick: onCycleRepeat, style: { ...MINI_BUTTON_STYLE, color: repeat !== "off" ? ACCENT : undefined }, children: [SP_JSX.jsx(FaRedo, {}), repeat === "one" && SP_JSX.jsx("span", { style: { fontSize: "0.6em", marginLeft: 2 }, children: "1" })] }), SP_JSX.jsx(DFL.DialogButton, { onClick: () => onSkip(-1), style: MINI_BUTTON_STYLE, children: SP_JSX.jsx(FaStepBackward, {}) }), SP_JSX.jsx(DFL.DialogButton, { onClick: onTogglePause, style: MINI_BUTTON_STYLE, children: isPlaying ? SP_JSX.jsx(FaPause, {}) : SP_JSX.jsx(FaPlay, {}) }), SP_JSX.jsx(DFL.DialogButton, { onClick: () => onSkip(1), style: MINI_BUTTON_STYLE, children: SP_JSX.jsx(FaStepForward, {}) }), SP_JSX.jsx(DFL.DialogButton, { onClick: onToggleShuffle, style: { ...MINI_BUTTON_STYLE, color: shuffle ? ACCENT : undefined }, children: SP_JSX.jsx(FaRandom, {}) })] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, width: "100%" }, children: [SP_JSX.jsx(Thumb, { src: thumbUrl(currentTrackId ?? ""), fallback: SP_JSX.jsx(FaMusic, {}) }), SP_JSX.jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [SP_JSX.jsx("div", { style: {
                                        fontWeight: "bold",
                                        fontSize: "0.9em",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                        color: ACCENT,
                                    }, children: nowPlaying }), (nowPlayingArtist || nowPlayingAlbum) && (SP_JSX.jsx("div", { style: {
                                        fontSize: "0.75em",
                                        opacity: 0.7,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                    }, children: [nowPlayingArtist, nowPlayingAlbum].filter(Boolean).join(" • ") }))] })] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: { width: "100%", paddingBottom: 2 }, children: [SP_JSX.jsx("div", { style: {
                                background: "rgba(255,255,255,0.15)",
                                borderRadius: 3,
                                height: 4,
                                cursor: "pointer",
                                position: "relative",
                            }, onClick: handleSeek, children: SP_JSX.jsx("div", { style: {
                                    background: ACCENT,
                                    borderRadius: 3,
                                    height: "100%",
                                    width: `${progress * 100}%`,
                                    transition: "width 0.3s linear",
                                } }) }), SP_JSX.jsxs("div", { style: { display: "flex", justifyContent: "space-between", fontSize: "0.7em", opacity: 0.6, marginTop: 2 }, children: [SP_JSX.jsx("span", { children: fmtTime(currentTime) }), SP_JSX.jsx("span", { children: fmtTime(trackDuration) })] })] }) })] }));
}
function Content() {
    const [view, setView] = SP_REACT.useState("artists");
    const [loading, setLoading] = SP_REACT.useState(true);
    const [error, setError] = SP_REACT.useState(null);
    const [artists, setArtists] = SP_REACT.useState([]);
    const [albums, setAlbums] = SP_REACT.useState([]);
    const [tracks, setTracks] = SP_REACT.useState([]);
    const [selectedArtist, setSelectedArtist] = SP_REACT.useState(null);
    const [selectedAlbum, setSelectedAlbum] = SP_REACT.useState(null);
    const [nowPlaying, setNowPlaying] = SP_REACT.useState(null);
    const [isPlaying, setIsPlaying] = SP_REACT.useState(false);
    const [currentTrackId, setCurrentTrackId] = SP_REACT.useState(null);
    const [shuffle, setShuffle] = SP_REACT.useState(false);
    const [repeat, setRepeat] = SP_REACT.useState("off");
    const [nowPlayingArtist, setNowPlayingArtist] = SP_REACT.useState(null);
    const [nowPlayingAlbum, setNowPlayingAlbum] = SP_REACT.useState(null);
    const [currentTime, setCurrentTime] = SP_REACT.useState(0);
    const [trackDuration, setTrackDuration] = SP_REACT.useState(0);
    const [artistSearch, setArtistSearch] = SP_REACT.useState("");
    // Playback queue lives in refs so the audio element's `onended`
    // callback always sees the latest values without re-binding.
    const queueRef = SP_REACT.useRef(globalQueue);
    const queueIndexRef = SP_REACT.useRef(globalQueueIndex);
    const shuffleRef = SP_REACT.useRef(globalShuffle);
    const repeatRef = SP_REACT.useRef(globalRepeat);
    // Settings form state
    const [serverUrl, setServerUrl] = SP_REACT.useState("");
    const [localUrl, setLocalUrl] = SP_REACT.useState("");
    const [apiKey, setApiKey] = SP_REACT.useState("");
    const [userId, setUserId] = SP_REACT.useState("");
    const [skipSslVerify, setSkipSslVerify] = SP_REACT.useState(false);
    const [saving, setSaving] = SP_REACT.useState(false);
    const [configured, setConfigured] = SP_REACT.useState(false);
    // -- Load settings + initial library on mount --------------
    SP_REACT.useEffect(() => {
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
            }
            else {
                setLoading(false);
                setView("settings");
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    SP_REACT.useEffect(() => {
        if (!isPlaying)
            return;
        const id = setInterval(() => {
            if (globalAudio) {
                setCurrentTime(globalAudio.currentTime);
                setTrackDuration(isFinite(globalAudio.duration) ? globalAudio.duration : 0);
            }
        }, 500);
        return () => clearInterval(id);
    }, [isPlaying]);
    // -- Search -----------------------------------------------------
    const filteredArtists = artistSearch.trim()
        ? artists.filter((a) => a.Name.toLowerCase().includes(artistSearch.trim().toLowerCase()))
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
    const openAlbums = async (artist) => {
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
    const openTracks = async (album) => {
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
    const buildStreamUrl = (itemId) => {
        if (!itemId)
            return "";
        return `http://localhost:9099/audio/${itemId}`;
    };
    const playQueueIndex = (index) => {
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
        }
        else if (repeatRef.current === "all") {
            playQueueIndex(0);
        }
        else {
            setIsPlaying(false);
            globalNowPlaying = null;
            globalCurrentTrackId = null;
        }
    };
    const skip = (direction) => {
        const queue = queueRef.current;
        if (queue.length === 0)
            return;
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
        }
        else if (next >= queue.length) {
            next = repeatRef.current === "all" ? 0 : queue.length - 1;
        }
        playQueueIndex(next);
    };
    const playTrack = (track) => {
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
        if (!globalAudio)
            return;
        if (globalAudio.paused) {
            globalAudio.play();
            setIsPlaying(true);
        }
        else {
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
        const order = ["off", "all", "one"];
        const next = order[(order.indexOf(repeatRef.current) + 1) % order.length];
        repeatRef.current = next;
        setRepeat(next);
        globalRepeat = next;
    };
    const handleSeek = (ratio) => {
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
    const nowPlayingProps = nowPlaying ? {
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
    const ErrorRow = () => error ? (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: { color: "#ff6b6b", padding: "4px 0" }, children: friendlyError(error) }) })) : null;
    // -- Settings view ------------------------------------------------
    if (view === "settings") {
        return (SP_JSX.jsxs(DFL.PanelSection, { title: "Jellyfin Settings", children: [SP_JSX.jsx(ErrorRow, {}), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.TextField, { label: "Server URL", value: serverUrl, onChange: (e) => setServerUrl(e.target.value), mustBeURL: true }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.TextField, { label: "Local URL (optional)", description: "Direct LAN address, e.g. http://192.168.1.x:8096. Used instead of Server URL when reachable.", value: localUrl, onChange: (e) => setLocalUrl(e.target.value) }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.TextField, { label: "API Key", value: apiKey, onChange: (e) => setApiKey(e.target.value), bIsPassword: true }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.TextField, { label: "User ID", value: userId, onChange: (e) => setUserId(e.target.value) }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ToggleField, { label: "Skip SSL verification", description: "Enable for local servers with self-signed certificates", checked: skipSslVerify, onChange: setSkipSslVerify }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", onClick: handleSaveSettings, children: saving ? "Saving..." : "Save & Connect" }) }), configured && (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", onClick: () => setView("artists"), children: [SP_JSX.jsx(FaArrowLeft, {}), " Back to library"] }) }))] }));
    }
    // -- Loading state --------------------------------------------------
    if (loading) {
        return (SP_JSX.jsx(DFL.PanelSection, { title: "Jelly Tunes", children: SP_JSX.jsx(DFL.PanelSectionRow, { children: "Loading..." }) }));
    }
    // -- Albums view ------------------------------------------------------
    if (view === "albums") {
        return (SP_JSX.jsxs(DFL.PanelSection, { title: selectedArtist?.Name ?? "Albums", children: [SP_JSX.jsx(ErrorRow, {}), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", onClick: () => setView("artists"), children: [SP_JSX.jsx(FaArrowLeft, {}), " Artists"] }) }), nowPlayingProps && SP_JSX.jsx(NowPlaying, { ...nowPlayingProps }), albums.map((album) => (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", icon: SP_JSX.jsx(Thumb, { src: thumbUrl(album.Id), fallback: SP_JSX.jsx(FaMusic, {}) }), onClick: () => openTracks(album), children: [album.Name, album.ProductionYear ? ` (${album.ProductionYear})` : ""] }) }, album.Id))), albums.length === 0 && (SP_JSX.jsx(DFL.PanelSectionRow, { children: "No albums found for this artist." }))] }));
    }
    // -- Tracks view -------------------------------------------------------
    if (view === "tracks") {
        return (SP_JSX.jsxs(DFL.PanelSection, { title: selectedAlbum?.Name ?? "Tracks", children: [SP_JSX.jsx(ErrorRow, {}), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", onClick: () => setView("albums"), children: [SP_JSX.jsx(FaArrowLeft, {}), " Albums"] }) }), nowPlayingProps && SP_JSX.jsx(NowPlaying, { ...nowPlayingProps }), tracks.map((track) => (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", icon: SP_JSX.jsx(Thumb, { src: thumbUrl(track.Id), fallback: SP_JSX.jsx(FaMusic, {}) }), onClick: () => playTrack(track), children: SP_JSX.jsxs("span", { style: { color: track.Id === currentTrackId ? ACCENT : undefined }, children: [track.IndexNumber ? `${track.IndexNumber}. ` : "", track.Name] }) }) }, track.Id))), tracks.length === 0 && (SP_JSX.jsx(DFL.PanelSectionRow, { children: "No tracks found on this album." }))] }));
    }
    // -- Artists view (default) -------------------------------------------
    return (SP_JSX.jsxs(DFL.PanelSection, { title: "Jelly Tunes", children: [SP_JSX.jsx(ErrorRow, {}), nowPlayingProps && SP_JSX.jsx(NowPlaying, { ...nowPlayingProps }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.TextField, { label: "Search artists", value: artistSearch, onChange: (e) => setArtistSearch(e.target.value), bShowClearAction: true, bAlwaysShowClearAction: artistSearch.length > 0 }) }), filteredArtists.map((artist) => (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", icon: SP_JSX.jsx(Thumb, { src: thumbUrl(artist.Id), fallback: SP_JSX.jsx(FaMusic, {}) }), onClick: () => openAlbums(artist), children: artist.Name }) }, artist.Id))), artists.length === 0 && !error && (SP_JSX.jsx(DFL.PanelSectionRow, { children: "No artists found in your library." })), artists.length > 0 && filteredArtists.length === 0 && (SP_JSX.jsxs(DFL.PanelSectionRow, { children: ["No artists match \"", artistSearch, "\"."] })), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", onClick: () => setView("settings"), children: [SP_JSX.jsx(FaCog, {}), " Settings"] }) })] }));
}
var index = definePlugin(() => {
    return {
        name: "Jelly Tunes",
        titleView: SP_JSX.jsx("div", { className: DFL.staticClasses.Title, children: "Jelly Tunes" }),
        content: SP_JSX.jsx(Content, {}),
        icon: SP_JSX.jsx(FaMusic, {}),
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

export { index as default };
//# sourceMappingURL=index.js.map
