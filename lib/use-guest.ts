"use client";

import { useEffect, useState } from "react";
import { requestSync } from "./store";

/** A stable per-tab guest display name, plus a one-time cross-tab sync request. */
export function useGuest(): string {
  const [name] = useState(
    () => `guest_${Math.floor(1000 + Math.random() * 9000)}`,
  );
  useEffect(() => {
    requestSync();
  }, []);
  return name;
}
