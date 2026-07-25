"use client";

import { useEffect, useState } from "react";

import {
  readStoredLiveShare,
  subscribeLiveShare,
  type LiveShareState,
} from "@/lib/live-share-channel";

const EMPTY: LiveShareState = {
  slug: "",
  live: false,
  sharing: false,
  captureHandle: null,
  surfaceLabel: null,
};

/** Subscribe to host live / screen-share state broadcast from /host. */
export function useLiveShareSession() {
  const [state, setState] = useState<LiveShareState>(
    () => readStoredLiveShare() ?? EMPTY,
  );

  useEffect(
    () => subscribeLiveShare((state) => setState(state ?? EMPTY)),
    [],
  );

  return state;
}

/** Register this tab as capturable with the show slug (Capture Handle API). */
export function useCaptureHandle(slug: string | null, enabled: boolean) {
  useEffect(() => {
    if (!enabled || !slug) return;
    const setConfig = navigator.mediaDevices?.setCaptureHandleConfig;
    if (!setConfig) return;

    void setConfig.call(navigator.mediaDevices, { handle: slug });

    return () => {
      void setConfig.call(navigator.mediaDevices, { handle: "" });
    };
  }, [enabled, slug]);
}
