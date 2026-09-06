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
};

type PendingConfirm = ConfirmOptions & { resolve: (ok: boolean) => void };

type Stage = "dot" | "line" | "panel";

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
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

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
        onClick={onCancel}
      >
        <motion.div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          onClick={(e) => e.stopPropagation()}
          className="edge-glow relative overflow-hidden border border-hair bg-void"
          initial={{ width: 10, height: 10, borderRadius: 999, opacity: 0 }}
          animate={{ ...shape, opacity: 1 }}
          exit={{ width: 10, height: 10, borderRadius: 999, opacity: 0 }}
          transition={
            reduce ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 30 }
          }
        >
          <AnimatePresence>
            {stage === "panel" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ delay: reduce ? 0 : 0.08, duration: 0.18 }}
                className="p-6"
              >
                <h2 id="confirm-title" className="font-display text-base font-semibold ink">
                  {options.title}
                </h2>
                <p className="mt-2 text-sm ink-2">{options.message}</p>
                <div className="mt-5 flex justify-end gap-5">
                  <button
                    onClick={onCancel}
                    className="font-mono text-[12px] lowercase ink-3 transition-opacity duration-150 hover:opacity-100"
                  >
                    {options.cancelLabel ?? "cancel"}
                  </button>
                  <button
                    onClick={onConfirm}
                    className={`border px-3 py-1.5 font-mono text-[12px] lowercase ${
                      options.danger ? "border-bad text-bad" : "border-edge text-edge"
                    }`}
                  >
                    {options.confirmLabel ?? "confirm"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
