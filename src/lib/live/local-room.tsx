"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Track } from "livekit-client";

import { LOCAL_BASE_VIEWERS } from "./mode";
import { createSyntheticVideo } from "./synthetic-video";

/**
 * The fake room behind design mode.
 *
 * Everything the studio needs from LiveKit is served from here instead: local
 * media capture for the host, a `BroadcastChannel` standing in for the data
 * channel, and a participant list. Tabs on the same origin share the channel,
 * so opening /host in one tab and /s/<slug> in another gives you a working
 * host↔viewer pair with no server in the middle.
 *
 * Nothing in this file is reachable unless `LOCAL_STREAM` is on — see `./mode`.
 */

export type LocalRole = "host" | "viewer";

export type LocalChatLine = {
  id: string;
  timestamp: number;
  message: string;
  from: { name: string; identity: string };
};

type DataListener = (payload: Uint8Array) => void;

type Envelope =
  | { kind: "data"; topic: string; payload: Uint8Array }
  | { kind: "chat"; line: LocalChatLine }
  | { kind: "presence"; id: string; role: LocalRole; sharing: boolean }
  | { kind: "presence-request" }
  | { kind: "bye"; id: string };

type Peer = { role: LocalRole; sharing: boolean; seenAt: number };

/** The two feeds a stage can show, whichever side of the room produced them. */
type Capture = { screen: MediaStreamTrack | null; camera: MediaStreamTrack | null };

export type LocalRoomValue = {
  role: LocalRole;
  screenTrack: MediaStreamTrack | null;
  cameraTrack: MediaStreamTrack | null;
  sharing: boolean;
  cameraEnabled: boolean;
  micEnabled: boolean;
  toggleSource: (source: Track.Source) => Promise<void>;
  viewerCount: number;
  chat: LocalChatLine[];
  sendChat: (message: string) => Promise<void>;
  sendData: (topic: string, payload: Uint8Array) => void;
  subscribeData: (topic: string, listener: DataListener) => () => void;
};

const LocalRoomContext = createContext<LocalRoomValue | null>(null);

export function useLocalRoom(): LocalRoomValue {
  const value = useContext(LocalRoomContext);
  if (!value) {
    throw new Error(
      "Design mode hooks used outside <LocalRoomProvider>. Wrap the tree in " +
        "<LiveRoom> from @/lib/live.",
    );
  }
  return value;
}

/** Re-provides an existing room value into a detached React root (the PiP window). */
export function LocalRoomBridge({
  value,
  children,
}: {
  value: LocalRoomValue;
  children: React.ReactNode;
}) {
  return (
    <LocalRoomContext.Provider value={value}>
      {children}
    </LocalRoomContext.Provider>
  );
}

export function useMaybeLocalRoom(): LocalRoomValue | null {
  return useContext(LocalRoomContext);
}

const PRESENCE_INTERVAL_MS = 2_500;
const PRESENCE_TTL_MS = 8_000;
/** How long a lone viewer tab waits for a host before showing the fake feed. */
const SOLO_VIEWER_GRACE_MS = 1_200;

const SEED_CHAT: Array<{ name: string; message: string }> = [
  { name: "mara_k", message: "wait the green one is so good" },
  { name: "jules", message: "does it come in a 6?" },
  { name: "noah.p", message: "adding to cart immediately" },
  { name: "sam", message: "can you show the back" },
];

export function LocalRoomProvider({
  role,
  slug,
  children,
}: {
  role: LocalRole;
  slug: string;
  children: React.ReactNode;
}) {
  const selfId = useState(() => Math.random().toString(36).slice(2, 10))[0];

  const [captured, setCaptured] = useState<Capture>({ screen: null, camera: null });
  const [synthetic, setSynthetic] = useState<Capture>({ screen: null, camera: null });
  const [micEnabled, setMicEnabled] = useState(true);
  const [peers, setPeers] = useState<Record<string, Peer>>({});
  const [soloTimedOut, setSoloTimedOut] = useState(false);
  const [chat, setChat] = useState<LocalChatLine[]>(() =>
    SEED_CHAT.map((seed, i) => ({
      id: `seed-${i}`,
      timestamp: Date.now() - (SEED_CHAT.length - i) * 45_000,
      message: seed.message,
      from: { name: seed.name, identity: `seed-${i}` },
    })),
  );

  const channelRef = useRef<BroadcastChannel | null>(null);
  const listenersRef = useRef(new Map<string, Set<DataListener>>());
  const sharingRef = useRef(false);
  const capturedRef = useRef(captured);

  const isHost = role === "host";
  const sharing = isHost && captured.screen !== null;

  // `toggleSource` and the unmount cleanup both need whatever is capturing
  // right now, without being re-created every time a track changes.
  useEffect(() => {
    capturedRef.current = captured;
  }, [captured]);

  // Read by the presence heartbeat, which runs on a timer outside the render
  // that produced `sharing`.
  useEffect(() => {
    sharingRef.current = sharing;
  }, [sharing]);

  const post = useCallback((envelope: Envelope) => {
    channelRef.current?.postMessage(envelope);
  }, []);

  // --- transport -----------------------------------------------------------

  useEffect(() => {
    const channel = new BroadcastChannel(`retailtherapy-design:${slug}`);
    channelRef.current = channel;

    function announce() {
      channel.postMessage({
        kind: "presence",
        id: selfId,
        role,
        sharing: sharingRef.current,
      } satisfies Envelope);
    }

    channel.onmessage = (event: MessageEvent<Envelope>) => {
      const envelope = event.data;
      switch (envelope.kind) {
        case "data": {
          const listeners = listenersRef.current.get(envelope.topic);
          listeners?.forEach((listener) => listener(envelope.payload));
          break;
        }
        case "chat":
          setChat((prev) => [...prev, envelope.line]);
          break;
        case "presence":
          setPeers((prev) => ({
            ...prev,
            [envelope.id]: {
              role: envelope.role,
              sharing: envelope.sharing,
              seenAt: Date.now(),
            },
          }));
          break;
        case "presence-request":
          announce();
          break;
        case "bye":
          setPeers((prev) => {
            const next = { ...prev };
            delete next[envelope.id];
            return next;
          });
          break;
      }
    };

    channel.postMessage({ kind: "presence-request" } satisfies Envelope);
    announce();
    const heartbeat = setInterval(announce, PRESENCE_INTERVAL_MS);

    // Drop peers whose tab went away without saying goodbye.
    const reaper = setInterval(() => {
      const cutoff = Date.now() - PRESENCE_TTL_MS;
      setPeers((prev) => {
        const next = Object.fromEntries(
          Object.entries(prev).filter(([, peer]) => peer.seenAt > cutoff),
        );
        return Object.keys(next).length === Object.keys(prev).length
          ? prev
          : next;
      });
    }, PRESENCE_INTERVAL_MS);

    return () => {
      clearInterval(heartbeat);
      clearInterval(reaper);
      channel.postMessage({ kind: "bye", id: selfId } satisfies Envelope);
      channel.close();
      channelRef.current = null;
    };
  }, [role, selfId, slug]);

  // Re-announce whenever the host starts or stops sharing so viewer tabs can
  // switch their stage without waiting for the next heartbeat.
  useEffect(() => {
    post({ kind: "presence", id: selfId, role, sharing });
  }, [post, role, selfId, sharing]);

  const sendData = useCallback(
    (topic: string, payload: Uint8Array) => {
      post({ kind: "data", topic, payload });
    },
    [post],
  );

  const subscribeData = useCallback(
    (topic: string, listener: DataListener) => {
      const listeners = listenersRef.current;
      const set = listeners.get(topic) ?? new Set<DataListener>();
      set.add(listener);
      listeners.set(topic, set);
      return () => {
        set.delete(listener);
        if (set.size === 0) listeners.delete(topic);
      };
    },
    [],
  );

  const sendChat = useCallback(
    async (message: string) => {
      const line: LocalChatLine = {
        id: `${selfId}-${Date.now()}`,
        timestamp: Date.now(),
        message,
        from: {
          name: isHost ? "You (host)" : "You",
          identity: selfId,
        },
      };
      setChat((prev) => [...prev, line]);
      post({
        kind: "chat",
        line: { ...line, from: { name: isHost ? "Host" : "Viewer", identity: selfId } },
      });
    },
    [isHost, post, selfId],
  );

  // --- media ---------------------------------------------------------------

  const capture = useCallback(
    async (key: keyof Capture, open: () => Promise<MediaStream>) => {
      const existing = capturedRef.current[key];
      if (existing) {
        existing.stop();
        setCaptured((prev) => ({ ...prev, [key]: null }));
        return;
      }

      const track = (await open()).getVideoTracks()[0];
      // Stopping from the browser's own "Stop sharing" bar has to clear our
      // state too, or the studio stays stuck in the sharing layout.
      track.addEventListener(
        "ended",
        () => setCaptured((prev) => (prev[key] === track ? { ...prev, [key]: null } : prev)),
        { once: true },
      );
      setCaptured((prev) => ({ ...prev, [key]: track }));
    },
    [],
  );

  const toggleSource = useCallback(
    async (source: Track.Source) => {
      switch (source) {
        case Track.Source.Microphone:
          // Design mode never captures audio — there is nothing to listen to
          // and it would prompt for a device on every toggle.
          setMicEnabled((prev) => !prev);
          return;
        case Track.Source.ScreenShare:
          await capture("screen", () =>
            navigator.mediaDevices.getDisplayMedia({ video: true, audio: false }),
          );
          return;
        case Track.Source.Camera:
          await capture("camera", () =>
            navigator.mediaDevices.getUserMedia({ video: true, audio: false }),
          );
      }
    },
    [capture],
  );

  useEffect(() => {
    const tracks = capturedRef;
    return () => {
      tracks.current.screen?.stop();
      tracks.current.camera?.stop();
    };
  }, []);

  // A viewer tab can't receive the host's real capture, so give it synthetic
  // video once a host is sharing — or after a short grace period if this tab is
  // running on its own.
  const hostPeerSharing = useMemo(
    () => Object.values(peers).some((peer) => peer.role === "host" && peer.sharing),
    [peers],
  );
  const hostPeerPresent = useMemo(
    () => Object.values(peers).some((peer) => peer.role === "host"),
    [peers],
  );

  useEffect(() => {
    if (isHost || hostPeerPresent) return;
    const timer = setTimeout(() => setSoloTimedOut(true), SOLO_VIEWER_GRACE_MS);
    return () => clearTimeout(timer);
  }, [hostPeerPresent, isHost]);

  const viewerStageActive = !isHost && (hostPeerSharing || soloTimedOut);

  useEffect(() => {
    if (!viewerStageActive) return;

    const screen = createSyntheticVideo({ label: "Host screen share" });
    const camera = createSyntheticVideo({
      label: "Host",
      width: 480,
      height: 480,
      hue: 320,
    });
    // The canvas capture is an external resource whose lifetime is this
    // effect's; publishing its handle is the only way the stage can render it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSynthetic({ screen: screen.track, camera: camera.track });

    return () => {
      screen.stop();
      camera.stop();
      setSynthetic({ screen: null, camera: null });
    };
  }, [viewerStageActive]);

  const stage = isHost ? captured : synthetic;

  // --- participants --------------------------------------------------------

  const viewerTabs = useMemo(
    () => Object.values(peers).filter((peer) => peer.role === "viewer").length,
    [peers],
  );
  const viewerCount = LOCAL_BASE_VIEWERS + viewerTabs + (isHost ? 0 : 1);

  const value: LocalRoomValue = {
    role,
    screenTrack: stage.screen,
    cameraTrack: stage.camera,
    sharing,
    cameraEnabled: captured.camera !== null,
    micEnabled,
    toggleSource,
    viewerCount,
    chat,
    sendChat,
    sendData,
    subscribeData,
  };

  return (
    <LocalRoomContext.Provider value={value}>
      {children}
    </LocalRoomContext.Provider>
  );
}
