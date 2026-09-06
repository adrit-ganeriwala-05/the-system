"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export type PanePhase = "boot" | "idle" | "loading" | "collapsing" | "collapsed" | "reopening";

type PaneMotionValue = {
  phase: PanePhase;
  startLoading: () => void;
  stopLoading: () => void;
  /** Shrinks the pane to a hairline and resolves once that's done — call this, then
   *  navigate (sign out / delete account). The pane reopens on its own once the route
   *  actually changes, so the same motion continues on the far side of the redirect. */
  collapse: () => Promise<void>;
};

const Ctx = createContext<PaneMotionValue | null>(null);

/**
 * Drives the pane's shape as a small state machine rather than each caller reaching in
 * directly. Lives above <Pane> in SystemShell, which persists across client-side route
 * changes, so a collapse started before a redirect and the reopen after it are one
 * continuous piece of state rather than two unrelated mounts.
 */
export function PaneMotionProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<PanePhase>("boot");
  const pathname = usePathname();
  const collapsedAtPath = useRef<string | null>(null);

  useEffect(() => {
    if (phase !== "boot") return;
    const id = setTimeout(() => setPhase("idle"), 620);
    return () => clearTimeout(id);
  }, [phase]);

  // A collapse that lands on a different route reopens automatically — this is what
  // bridges a sign-out/delete's redirect into a continuous collapse-then-reopen motion.
  useEffect(() => {
    if (phase === "collapsed" && collapsedAtPath.current !== pathname) {
      setPhase("reopening");
      const id = setTimeout(() => setPhase("idle"), 480);
      return () => clearTimeout(id);
    }
  }, [pathname, phase]);

  const startLoading = useCallback(() => {
    setPhase((p) => (p === "idle" ? "loading" : p));
  }, []);
  const stopLoading = useCallback(() => {
    setPhase((p) => (p === "loading" ? "idle" : p));
  }, []);

  const collapse = useCallback(() => {
    collapsedAtPath.current = pathname;
    setPhase("collapsing");
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        setPhase("collapsed");
        resolve();
      }, 380);
    });
  }, [pathname]);

  return <Ctx.Provider value={{ phase, startLoading, stopLoading, collapse }}>{children}</Ctx.Provider>;
}

export function usePaneMotion(): PaneMotionValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePaneMotion must be used within PaneMotionProvider");
  return ctx;
}
