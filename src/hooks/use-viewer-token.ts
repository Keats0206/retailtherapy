"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";

import { readResponseJson } from "@/lib/fetch-json";

type ViewerTokenResponse = {
  error?: string;
  token: string;
  url: string;
  canChat?: boolean;
  displayName?: string;
};

export type ViewerConnection = {
  token: string;
  url: string;
  canChat: boolean;
  displayName?: string;
};

/**
 * Fetches a LiveKit viewer token and refetches when auth state changes so
 * signed-in viewers reconnect with their Clerk-derived display name.
 */
export function useViewerToken(roomName: string) {
  const { isSignedIn, isLoaded } = useAuth();
  const [conn, setConn] = useState<ViewerConnection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!roomName || !isLoaded) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch("/api/livekit/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room: roomName, role: "viewer" }),
        });
        const data = await readResponseJson<ViewerTokenResponse>(res);
        if (!res.ok) throw new Error(data.error ?? "Failed to connect");
        if (cancelled) return;
        setConn({
          token: data.token,
          url: data.url,
          canChat: data.canChat ?? Boolean(isSignedIn),
          displayName: data.displayName,
        });
      } catch (err) {
        if (!cancelled) {
          setConn(null);
          setError(err instanceof Error ? err.message : "Failed to connect");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [roomName, isLoaded, isSignedIn]);

  return {
    conn,
    error,
    isLoading: !isLoaded || isLoading,
    isSignedIn: Boolean(isSignedIn),
    canChat: conn?.canChat ?? Boolean(isSignedIn),
  };
}
