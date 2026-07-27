"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer as LkRoomAudioRenderer,
  RoomContext,
  VideoTrack as LkVideoTrack,
  useChat as lkUseChat,
  useConnectionState as lkUseConnectionState,
  useDataChannel as lkUseDataChannel,
  useLocalParticipant as lkUseLocalParticipant,
  useParticipants as lkUseParticipants,
  useRoomContext as lkUseRoomContext,
  useTracks as lkUseTracks,
  useTrackToggle as lkUseTrackToggle,
  type TrackReference,
} from "@livekit/components-react";
import {
  ConnectionState,
  Track,
  type DataPublishOptions,
  type Room,
} from "livekit-client";

import { LOCAL_STREAM } from "./mode";
import {
  LocalRoomBridge,
  LocalRoomProvider,
  useLocalRoom,
  useMaybeLocalRoom,
  type LocalRole,
  type LocalRoomValue,
} from "./local-room";

/**
 * The app's single entry point to the live transport.
 *
 * Every component reaches LiveKit through here rather than importing
 * `@livekit/components-react` directly, so design mode can swap the whole
 * transport for a local fake — see `./mode` for what that is and how to turn
 * it on. In a normal build each export below is a thin pass-through to the
 * LiveKit hook of the same name.
 *
 * The two implementations are chosen once, at module load, from a build-time
 * constant. Picking the binding here rather than branching inside each hook is
 * what keeps every component's hook order fixed for the life of the bundle.
 */

export type { LocalRoomValue };

/** A screen-share or camera feed, from LiveKit or from the local fake. */
export type DesignTrackRef = {
  design: true;
  source: Track.Source;
  participant: { isLocal: boolean; identity: string };
  publication: { track: { mediaStreamTrack: MediaStreamTrack } };
};

export type StageTrack = TrackReference | DesignTrackRef;

function isDesignTrack(track: StageTrack): track is DesignTrackRef {
  return "design" in track;
}

/**
 * Stand-in for the `Room` object. Nothing reads its internals in design mode —
 * no LiveKit hook runs — but it keeps `Room`-typed props and `RoomContext`
 * satisfied, and `disconnect()` still has to be callable when a show ends.
 */
const designRoom = {
  state: ConnectionState.Connected,
  disconnect: async () => {},
} as unknown as Room;

// --- room ------------------------------------------------------------------

export function LiveRoom({
  token,
  serverUrl,
  video,
  audio,
  onConnected,
  onDisconnected,
  className,
  localRole,
  localSlug,
  children,
}: {
  token: string;
  serverUrl: string;
  video?: boolean;
  audio?: boolean;
  onConnected?: () => void;
  onDisconnected?: () => void;
  className?: string;
  /** Which side of the fake room this tree is, in design mode. */
  localRole: LocalRole;
  /** Scopes the design-mode BroadcastChannel to one show. */
  localSlug: string;
  children: React.ReactNode;
}) {
  if (LOCAL_STREAM) {
    return (
      <LocalRoomProvider role={localRole} slug={localSlug}>
        <RoomContext.Provider value={designRoom}>
          <div className={className} data-lk-theme="retail">
            <OnMount run={onConnected} />
            {children}
          </div>
        </RoomContext.Provider>
      </LocalRoomProvider>
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect
      video={video}
      audio={audio}
      onConnected={onConnected}
      onDisconnected={onDisconnected}
      className={className}
      data-lk-theme="retail"
    >
      {children}
    </LiveKitRoom>
  );
}

function OnMount({ run }: { run?: () => void }) {
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    run?.();
  }, [run]);
  return null;
}

export function RoomAudioRenderer() {
  if (LOCAL_STREAM) return null;
  return <LkRoomAudioRenderer />;
}

export const useRoomContext: () => Room = LOCAL_STREAM
  ? () => designRoom
  : lkUseRoomContext;

export const useConnectionState: () => ConnectionState = LOCAL_STREAM
  ? () => ConnectionState.Connected
  : lkUseConnectionState;

/**
 * Carries the room into the floating (document picture-in-picture) window,
 * which mounts a separate React root and so inherits none of the providers
 * above it. Capture with `useLiveBridge()` in the main tree, then render
 * `LiveBridgeProvider` inside the detached root.
 */
export type LiveBridge = { room: Room; local: LocalRoomValue | null };

export function useLiveBridge(): LiveBridge {
  const local = useMaybeLocalRoom();
  const room = useRoomContext();
  return useMemo(() => ({ room, local }), [room, local]);
}

export function LiveBridgeProvider({
  bridge,
  children,
}: {
  bridge: LiveBridge;
  children: React.ReactNode;
}) {
  const inner = bridge.local ? (
    <LocalRoomBridge value={bridge.local}>{children}</LocalRoomBridge>
  ) : (
    children
  );

  return (
    <RoomContext.Provider value={bridge.room}>{inner}</RoomContext.Provider>
  );
}

// --- tracks ----------------------------------------------------------------

type UseTracks = (
  sources: Track.Source[],
  options?: { room?: Room; onlySubscribed?: boolean },
) => StageTrack[];

const useLiveTracks: UseTracks = (sources, options) =>
  lkUseTracks(sources, options) as StageTrack[];

const useDesignTracks: UseTracks = (sources) => {
  const { role, screenTrack, cameraTrack } = useLocalRoom();
  // Callers pass a fresh array literal every render; key the memo on contents.
  const wanted = sources.join(",");

  return useMemo(() => {
    const isLocal = role === "host";
    const identity = isLocal ? "design-host" : "design-remote-host";
    const refs: StageTrack[] = [];

    function add(source: Track.Source, mediaStreamTrack: MediaStreamTrack) {
      refs.push({
        design: true,
        source,
        participant: { isLocal, identity },
        publication: { track: { mediaStreamTrack } },
      });
    }

    if (wanted.includes(Track.Source.ScreenShare) && screenTrack) {
      add(Track.Source.ScreenShare, screenTrack);
    }
    if (wanted.includes(Track.Source.Camera) && cameraTrack) {
      add(Track.Source.Camera, cameraTrack);
    }
    return refs;
  }, [cameraTrack, role, screenTrack, wanted]);
};

export const useTracks: UseTracks = LOCAL_STREAM
  ? useDesignTracks
  : useLiveTracks;

export function VideoTrack({
  trackRef,
  className,
}: {
  trackRef: StageTrack;
  className?: string;
}) {
  if (isDesignTrack(trackRef)) {
    return (
      <DesignVideo
        track={trackRef.publication.track.mediaStreamTrack}
        className={className}
      />
    );
  }
  return <LkVideoTrack trackRef={trackRef} className={className} />;
}

function DesignVideo({
  track,
  className,
}: {
  track: MediaStreamTrack;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = new MediaStream([track]);
    return () => {
      el.srcObject = null;
    };
  }, [track]);

  return <video ref={ref} autoPlay muted playsInline className={className} />;
}

// --- controls --------------------------------------------------------------

type ToggleSource =
  | Track.Source.Microphone
  | Track.Source.Camera
  | Track.Source.ScreenShare;

type UseTrackToggle = (options: { source: ToggleSource; room?: Room }) => {
  enabled: boolean;
  buttonProps: React.ButtonHTMLAttributes<HTMLButtonElement>;
};

const useDesignToggle: UseTrackToggle = ({ source }) => {
  const { toggleSource, sharing, cameraEnabled, micEnabled } = useLocalRoom();

  const enabled =
    source === Track.Source.ScreenShare
      ? sharing
      : source === Track.Source.Camera
        ? cameraEnabled
        : micEnabled;

  const onClick = useCallback(() => {
    void toggleSource(source).catch(() => {
      // Picker dismissed or permission denied — same as production, there is
      // nothing to recover from.
    });
  }, [source, toggleSource]);

  return useMemo(
    () => ({ enabled, buttonProps: { onClick, "aria-pressed": enabled } }),
    [enabled, onClick],
  );
};

export const useTrackToggle: UseTrackToggle = LOCAL_STREAM
  ? useDesignToggle
  : lkUseTrackToggle;

// --- participants ----------------------------------------------------------

type ParticipantLike = { permissions?: { canPublish?: boolean } };

const useDesignParticipants: () => ParticipantLike[] = () => {
  const { viewerCount } = useLocalRoom();
  return useMemo(
    () => [
      { permissions: { canPublish: true } },
      ...Array.from({ length: viewerCount }, () => ({
        permissions: { canPublish: false },
      })),
    ],
    [viewerCount],
  );
};

export const useParticipants: () => ParticipantLike[] = LOCAL_STREAM
  ? useDesignParticipants
  : lkUseParticipants;

const useDesignLocalParticipant: () => { localParticipant: ParticipantLike } =
  () => {
    const { role } = useLocalRoom();
    return useMemo(
      () => ({
        localParticipant: { permissions: { canPublish: role === "host" } },
      }),
      [role],
    );
  };

export const useLocalParticipant: () => { localParticipant: ParticipantLike } =
  LOCAL_STREAM ? useDesignLocalParticipant : lkUseLocalParticipant;

// --- chat ------------------------------------------------------------------

export type ChatApi = {
  chatMessages: Array<{
    id?: string;
    timestamp: number;
    message: string;
    from?: { name?: string; identity?: string };
  }>;
  send: (message: string) => Promise<unknown>;
  isSending: boolean;
};

const useDesignChat: () => ChatApi = () => {
  const { chat, sendChat } = useLocalRoom();
  return useMemo(
    () => ({ chatMessages: chat, send: sendChat, isSending: false }),
    [chat, sendChat],
  );
};

export const useChat: () => ChatApi = LOCAL_STREAM ? useDesignChat : lkUseChat;

// --- data channel ----------------------------------------------------------

type UseDataChannel = (
  topic: string,
  onMessage?: (message: { payload: Uint8Array }) => void,
) => {
  send: (payload: Uint8Array, options: DataPublishOptions) => Promise<void>;
};

const useDesignDataChannel: UseDataChannel = (topic, onMessage) => {
  const { sendData, subscribeData } = useLocalRoom();

  // Keep the subscription keyed to the topic alone. Callers pass a fresh
  // closure on most renders, and re-subscribing on each one would drop
  // messages that land in the gap.
  const handlerRef = useRef(onMessage);
  useEffect(() => {
    handlerRef.current = onMessage;
  }, [onMessage]);

  useEffect(
    () => subscribeData(topic, (payload) => handlerRef.current?.({ payload })),
    [subscribeData, topic],
  );

  const send = useCallback(
    async (payload: Uint8Array) => {
      sendData(topic, payload);
    },
    [sendData, topic],
  );

  return useMemo(() => ({ send }), [send]);
};

export const useDataChannel: UseDataChannel = LOCAL_STREAM
  ? useDesignDataChannel
  : lkUseDataChannel;
