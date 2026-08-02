"use client";

import { useEffect, useRef } from "react";

import { pipDebug } from "@/lib/pip-debug";

// `enterpictureinpicture` isn't in lib.dom's MediaSessionAction union yet, and
// setActionHandler throws (rather than returning) for actions a browser doesn't
// know — so the cast is paired with a try/catch below, not a bare assertion.
const ENTER_PIP = "enterpictureinpicture" as MediaSessionAction;

function hasMediaSession(): boolean {
  return typeof navigator !== "undefined" && "mediaSession" in navigator;
}

/**
 * Lets Chrome open the floating studio for us the moment the host looks away.
 *
 * `documentPictureInPicture.requestWindow()` needs transient user activation, so
 * opening it from a plain visibility/blur listener is always rejected. The
 * sanctioned route — the one Google Meet uses — is the Media Session
 * `enterpictureinpicture` action: Chrome fires it by itself when the tab is
 * occluded, and the handler runs *with* activation, so requestWindow succeeds.
 *
 * Chrome only fires it while the page is actively capturing camera or mic via
 * getUserMedia, which a live host always is. Browsers that don't recognise the
 * action get nothing, and the explicit "Pop out" button is the only way in.
 *
 * @see https://developer.chrome.com/blog/automatic-picture-in-picture
 */
export function useAutoPip({
  enabled,
  onEnter,
}: {
  enabled: boolean;
  onEnter: () => void;
}): void {
  const onEnterRef = useRef(onEnter);

  useEffect(() => {
    onEnterRef.current = onEnter;
  }, [onEnter]);

  useEffect(() => {
    if (!enabled || !hasMediaSession()) {
      pipDebug("auto-pip not registered", {
        enabled,
        mediaSession: hasMediaSession(),
      });
      return;
    }

    try {
      navigator.mediaSession.setActionHandler(ENTER_PIP, (details) => {
        pipDebug("auto-pip FIRED", {
          reason: (details as { reason?: string } | undefined)?.reason,
        });
        onEnterRef.current();
      });
    } catch (err) {
      pipDebug("auto-pip registration rejected", { err: String(err) });
      return;
    }

    pipDebug("auto-pip registered — waiting for Chrome");
    return () => {
      try {
        navigator.mediaSession.setActionHandler(ENTER_PIP, null);
      } catch {
        // Nothing to unregister if the browser rejected it in the first place.
      }
    };
  }, [enabled]);
}
