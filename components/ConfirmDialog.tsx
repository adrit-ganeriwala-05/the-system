"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

export type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  /**
   * When provided, the dialog runs this itself and shows a loading state in place of its
   * content instead of closing immediately — the caller no longer needs its own pending
   * flag for the confirmed action.
   */
  action?: () => Promise<void>;
};

type PendingConfirm = ConfirmOptions & { resolve: (ok: boolean) => void };

type Stage = "dot" | "line" | "panel";

// Matches the CSS ring-spin duration in globals.css — the loading state waits out
// whatever's left of the current lap before closing, so the glow never gets cut off
// mid-circuit even when the underlying action finishes almost instantly.
const RING_LAP_MS = 1300;

/**
 * A confirmation dialog whose entrance is one continuous motion rather than a chrome
 * pop-up: a dot at screen center stretches into a hairline, and that hairline squares off
 * into the panel. Reduced motion skips straight to the panel stage.
 */
export function useConfirmDialog() {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...opts, resolve });
    });
  }, []);

  function settle(ok: boolean) {
    pending?.resolve(ok);
    setPending(null);
  }

  const dialog = pending ? (
    <ConfirmOverlay
      key={pending.title}
      options={pending}
      onCancel={() => settle(false)}
      onConfirm={() => settle(true)}
    />
  ) : null;

  return { confirm, dialog };
}

function ConfirmOverlay({
  options,
  onCancel,
  onConfirm,
}: {
  options: PendingConfirm;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  // This component only ever mounts client-side, in response to a confirm() call from an
  // event handler — never during SSR — so document.body is always safe to portal into.
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [stage, setStage] = useState<Stage>(() => (reduce ? "panel" : "dot"));
  const [busy, setBusy] = useState(false);
  const [busyError, setBusyError] = useState<string | null>(null);
  const [dotCount, setDotCount] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const t1 = setTimeout(() => setStage("line"), 160);
    const t2 = setTimeout(() => setStage("panel"), 340);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, busy]);

  useEffect(() => {
    if (!busy) return;
    const id = setInterval(() => setDotCount((n) => (n + 1) % 4), 350);
    return () => clearInterval(id);
  }, [busy]);

  async function handleConfirm() {
    if (!options.action) {
      onConfirm();
      return;
    }
    setBusy(true);
    setBusyError(null);
    const lapStart = performance.now();
    try {
      await options.action();
      // Let the ring finish its current lap rather than snapping away mid-circuit.
      const elapsed = performance.now() - lapStart;
      const remaining = reduce ? 0 : RING_LAP_MS - (elapsed % RING_LAP_MS);
      if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));
      onConfirm();
    } catch (e) {
      setBusy(false);
      setBusyError(e instanceof Error ? e.message : "something went wrong.");
    }
  }

  const shape =
    stage === "dot"
      ? { width: 10, height: 10, borderRadius: 999 }
      : stage === "line"
        ? { width: 240, height: 2, borderRadius: 2 }
        : { width: "min(90vw, 380px)", height: "auto", borderRadius: 0 };

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-void/70"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={busy ? undefined : onCancel}
      >
        <motion.div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          onClick={(e) => e.stopPropagation()}
          layout={stage === "panel" ? "size" : false}
          className={`relative overflow-hidden border border-hair bg-void ${
            busy ? "loading-ring" : "edge-glow"
          }`}
          initial={{ width: 10, height: 10, borderRadius: 999, opacity: 0 }}
          animate={{ ...shape, opacity: 1 }}
          exit={{ width: 10, height: 10, borderRadius: 999, opacity: 0 }}
          transition={
            reduce ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 30 }
          }
        >
          <AnimatePresence mode="wait">
            {stage === "panel" && (
              <motion.div
                key={busy ? "busy" : busyError ? "error" : "content"}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ delay: reduce || busy || busyError ? 0 : 0.08, duration: 0.15 }}
                className="p-6"
              >
                {busy ? (
                  <div className="flex min-h-[84px] items-center justify-center">
                    <p className="figure text-sm text-edge">
                      loading
                      <span className="inline-block w-4 text-left">
                        {".".repeat(dotCount)}
                      </span>
                    </p>
                  </div>
                ) : (
                  <>
                    <h2 id="confirm-title" className="font-display text-base font-semibold ink">
                      {options.title}
                    </h2>
                    <p className="mt-2 text-sm ink-2">{options.message}</p>
                    {busyError && <p className="mt-2 text-[12px] text-bad">{busyError}</p>}
                    <div className="mt-5 flex justify-end gap-5">
                      <button
                        onClick={onCancel}
                        className="font-mono text-[12px] lowercase ink-3 transition-opacity duration-150 hover:opacity-100"
                      >
                        {options.cancelLabel ?? "cancel"}
                      </button>
                      <button
                        onClick={handleConfirm}
                        className={`border px-3 py-1.5 font-mono text-[12px] lowercase ${
                          options.danger ? "border-bad text-bad" : "border-edge text-edge"
                        }`}
                      >
                        {busyError ? "retry" : (options.confirmLabel ?? "confirm")}
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
