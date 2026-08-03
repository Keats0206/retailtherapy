"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { EndLiveShowButton } from "@/components/end-live-show-button";
import {
  HostLaunchScreen,
  type MediaControls,
} from "@/components/host-launch-screen";
import { Button } from "@/components/ui/button";
import { useGoLiveProgress } from "@/hooks/use-go-live-progress";
import {
  clearPendingLiveSession,
  readPendingLiveSession,
} from "@/lib/host-go-live";
import {
  clearShowSetupDraft,
  readShowSetupDraft,
} from "@/lib/show-setup";
import { readResponseJson } from "@/lib/fetch-json";
import { hostShowPath, viewerShowPath } from "@/lib/show-urls";

import type { ShowSession } from "./host-live-broadcast";
import LiveBroadcast from "./host-live-broadcast";

/** Best-effort end when the host leaves — keepalive survives tab close / nav. */
function endShowOnLeave(slug: string) {
  void fetch(`/api/shows/${slug}/end`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
    keepalive: true,
  });
}

export default function HostClient({
  showSlug,
  resumeSlug,
  liveShowTitle,
}: {
  hostName: string | null;
  showSlug: string;
  resumeSlug?: string | null;
  liveShowTitle?: string | null;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<"preshow" | "live" | "disconnected">(
    "preshow",
  );
  const [session, setSession] = useState<ShowSession | null>(null);
  const [setupDraft, setSetupDraft] = useState(
    () => readShowSetupDraft(),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupReady, setSetupReady] = useState(() => Boolean(resumeSlug));
  const liveStartedAt = useRef<number | null>(null);
  const media = useMediaPreview(setupReady && phase === "preshow");
  const { reset: resetGoLiveProgress } = useGoLiveProgress();
  const stopMediaRef = useRef(media.stop);
  const liveSlugRef = useRef<string | null>(null);
  const intentionallyEndedRef = useRef(false);
  const pendingHandledRef = useRef(false);

  useEffect(() => {
    stopMediaRef.current = media.stop;
  }, [media.stop]);

  // Enter live studio after completing setup on /host/setup.
  useLayoutEffect(() => {
    if (pendingHandledRef.current) return;

    const pending = readPendingLiveSession();
    if (pending) {
      pendingHandledRef.current = true;
      clearPendingLiveSession();
      liveStartedAt.current = Date.now();
      intentionallyEndedRef.current = false;
      setSession({
        slug: pending.slug,
        title: pending.title,
        room: pending.room,
        token: pending.token,
        url: pending.url,
        snapshot: pending.snapshot,
      });
      setPhase("live");
      setSetupReady(true);
      setSetupDraft(readShowSetupDraft());
      if (pending.slug !== showSlug) {
        router.replace(hostShowPath(pending.slug));
      }
      return;
    }

    setSetupReady(true);
  }, [showSlug, router]);

  useEffect(() => {
    const active =
      (phase === "live" || phase === "disconnected") && session?.slug
        ? session.slug
        : null;
    liveSlugRef.current = active;
  }, [phase, session]);

  useEffect(() => {
    function endIfHostLeft() {
      const slug = liveSlugRef.current;
      if (!slug || intentionallyEndedRef.current) return;
      intentionallyEndedRef.current = true;
      liveSlugRef.current = null;
      endShowOnLeave(slug);
    }

    function onPageHide() {
      endIfHostLeft();
    }

    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      endIfHostLeft();
    };
  }, []);

  useEffect(() => {
    if (phase !== "live" || !session) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [phase, session]);

  const markShowEnded = useCallback(() => {
    intentionallyEndedRef.current = true;
    liveSlugRef.current = null;
  }, []);

  const resumeShow = useCallback(async (slug: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/shows/${slug}/resume`, { method: "POST" });
      const data = await readResponseJson<{
        error?: string;
        slug: string;
        title: string;
        room: string;
        token: string;
        url: string;
        snapshot: ShowSession["snapshot"];
      }>(res);
      if (!res.ok) throw new Error(data.error ?? "Failed to reconnect");

      stopMediaRef.current();
      if (!liveStartedAt.current) liveStartedAt.current = Date.now();
      intentionallyEndedRef.current = false;
      setSession({
        slug: data.slug,
        title: data.title,
        room: data.room,
        token: data.token,
        url: data.url,
        snapshot: data.snapshot,
      });
      setPhase("live");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPhase("preshow");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!resumeSlug) return;
    if (pendingHandledRef.current) return;
    const timer = window.setTimeout(() => {
      void resumeShow(resumeSlug);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [resumeSlug, resumeShow]);

  function handleShowEnded(slug: string) {
    markShowEnded();
    clearShowSetupDraft();
    resetGoLiveProgress();
    setSession(null);
    setPhase("preshow");
    router.replace(hostShowPath(slug));
  }

  if (phase === "live" && session) {
    return (
      <LiveBroadcast
        session={session}
        challengeStore={
          setupDraft?.challengeStoreUrl
            ? {
                url: setupDraft.challengeStoreUrl,
                brandName: setupDraft.challengeBrandName ?? "the store",
              }
            : null
        }
        onShowEnded={handleShowEnded}
        onDisconnected={() => setPhase("disconnected")}
      />
    );
  }

  if (phase === "disconnected" && session) {
    return (
      <DisconnectedPanel
        slug={session.slug}
        title={session.title}
        loading={loading}
        error={error}
        onReconnect={() => void resumeShow(session.slug)}
        onShowEnded={() => {
          markShowEnded();
          setSession(null);
          setPhase("preshow");
          setError(null);
          router.replace(hostShowPath(session.slug));
        }}
      />
    );
  }

  if (!setupReady && !pendingHandledRef.current) {
    return null;
  }

  return (
    <HostLaunchScreen
      title={liveShowTitle || setupDraft?.showName || "Untitled show"}
      error={error}
      media={media}
      liveShowSlug={showSlug}
      liveShowTitle={liveShowTitle}
      onResumeLiveShow={() => void resumeShow(showSlug)}
      resumeLoading={loading}
    />
  );
}

function DisconnectedPanel({
  slug,
  title,
  loading,
  error,
  onReconnect,
  onShowEnded,
}: {
  slug: string;
  title: string;
  loading: boolean;
  error: string | null;
  onReconnect: () => void;
  onShowEnded: () => void;
}) {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-4 px-6 py-24">
      <h1 className="text-2xl font-normal tracking-tight">Connection lost</h1>
      <p className="text-sm text-muted-foreground">
        Your show <span className="text-foreground">{title}</span> is still live
        for viewers. Reconnect to continue hosting, or leave to end the show.
      </p>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button onClick={onReconnect} disabled={loading}>
          {loading ? "Reconnecting…" : "Reconnect"}
        </Button>
        <EndLiveShowButton
          slug={slug}
          title={title}
          onEnded={onShowEnded}
        />
        <Button variant="outline" render={<Link href={viewerShowPath(slug)} target="_blank" />}>
          Open viewer page
        </Button>
      </div>
    </main>
  );
}

function useMediaPreview(enabled: boolean): MediaControls {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;

    async function startPreview() {
      setCameraError(null);
      setRequesting(true);
      try {
        const media = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (!alive) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = media;
        setStream(media);
        setCameraOn(true);
        setMicOn(true);
      } catch {
        if (alive) {
          setCameraError(
            "Couldn\u2019t access camera or microphone. Check browser permissions, then try again.",
          );
        }
      } finally {
        if (alive) setRequesting(false);
      }
    }

    const id = window.requestAnimationFrame(() => {
      void startPreview();
    });

    return () => {
      alive = false;
      window.cancelAnimationFrame(id);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStream(null);
      setCameraOn(false);
    };
  }, [enabled, attempt]);

  function stop() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
    setCameraOn(false);
  }

  function toggleCamera() {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCameraOn(track.enabled);
  }

  function toggleMic() {
    if (!streamRef.current) return;
    const track = streamRef.current.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
  }

  function retry() {
    setAttempt((n) => n + 1);
  }

  return {
    stream,
    cameraOn,
    micOn,
    toggleCamera,
    toggleMic,
    cameraError,
    requesting,
    retry,
    stop,
  };
}
