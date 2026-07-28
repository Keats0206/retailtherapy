"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type DocumentPiPOptions = {
  width?: number;
  height?: number;
};

export function isDocumentPiPSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "documentPictureInPicture" in window &&
    window.documentPictureInPicture != null
  );
}

/**
 * Opens and tracks a Document Picture-in-Picture window (Chrome/Edge 116+).
 * Must call `open` from a user gesture (e.g. click).
 */
export function useDocumentPiP({
  onClose,
}: {
  onClose?: () => void;
} = {}) {
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const pipWindowRef = useRef<Window | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    pipWindowRef.current = pipWindow;
  }, [pipWindow]);

  const isSupported = isDocumentPiPSupported();
  const isOpen = pipWindow != null;

  const open = useCallback(async (options: DocumentPiPOptions = {}) => {
    if (!isDocumentPiPSupported()) return null;

    const existing = window.documentPictureInPicture?.window;
    if (existing) {
      setPipWindow(existing);
      return existing;
    }

    const win = await window.documentPictureInPicture!.requestWindow({
      width: options.width ?? 400,
      height: options.height ?? 720,
      preferInitialWindowPlacement: true,
    });

    setPipWindow(win);
    return win;
  }, []);

  const close = useCallback(() => {
    pipWindowRef.current?.close();
    setPipWindow(null);
  }, []);

  useEffect(() => {
    if (!pipWindow) return;

    function handlePageHide() {
      setPipWindow(null);
      onCloseRef.current?.();
    }

    pipWindow.addEventListener("pagehide", handlePageHide);
    return () => pipWindow.removeEventListener("pagehide", handlePageHide);
  }, [pipWindow]);

  return { isSupported, isOpen, pipWindow, open, close };
}
