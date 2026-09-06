"use client";

import { useEffect } from "react";
import { usePaneMotion } from "@/components/system/PaneMotionContext";

/**
 * Renders nothing itself — the pane draws the loading state (a comet chasing its border,
 * "loading…" centered) on its own outline. This file's only job is to tell the pane when a
 * route is in flight, for exactly as long as this fallback stays mounted.
 */
export default function Loading() {
  const { startLoading, stopLoading } = usePaneMotion();
  useEffect(() => {
    startLoading();
    return () => stopLoading();
  }, [startLoading, stopLoading]);
  return null;
}
