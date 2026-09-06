"use client";

import { AnimatePresence, motion } from "framer-motion";

export type Notification = { id: string; text: string; tone?: "ok" | "bad" | "rank" };

const TONE = { ok: "text-ok", bad: "text-bad", rank: "text-rank" } as const;

/**
 * Terse system lines. Rendered against the void at the pane's top edge rather than as
 * floating cards, so nothing stacks above the window.
 */
export default function SystemNotification({
  notifications,
}: {
  notifications: Notification[];
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-1 px-4">
      <AnimatePresence>
        {notifications.map((n) => (
          <motion.p
            key={n.id}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className={`font-mono text-[12px] lowercase ${n.tone ? TONE[n.tone] : "ink"}`}
          >
            <span className="ink-3">›</span> {n.text}
          </motion.p>
        ))}
      </AnimatePresence>
    </div>
  );
}
