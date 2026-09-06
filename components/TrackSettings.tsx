"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CommitmentTrack } from "@prisma/client";
import { setCommitmentTrack } from "@/app/actions/settings";
import { CUSTOM_LIMITS, TRACKS } from "@/lib/constants";
import Divider from "./system/Divider";

const ORDER: CommitmentTrack[] = ["CASUAL", "STANDARD", "INTENSE", "CUSTOM"];

export default function TrackSettings({
  track,
  customNewTarget,
  customReviewTarget,
  freezesRemaining,
}: {
  track: CommitmentTrack;
  customNewTarget: number | null;
  customReviewTarget: number | null;
  freezesRemaining: number;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<CommitmentTrack>(track);
  const [newTarget, setNewTarget] = useState(customNewTarget ?? 2);
  const [reviewTarget, setReviewTarget] = useState(customReviewTarget ?? 0);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await setCommitmentTrack({
          track: selected,
          customNewTarget: newTarget,
          customReviewTarget: reviewTarget,
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "could not save that.");
      }
    });
  }

  return (
    <div>
      <Divider label="daily track" right={`${freezesRemaining} freezes left`} />
      <ul className="mt-3">
        {ORDER.map((t) => {
          const cfg = t === "CUSTOM" ? null : TRACKS[t];
          const active = selected === t;
          return (
            <li key={t} className="border-b border-hair">
              <button
                onClick={() => setSelected(t)}
                aria-pressed={active}
                className="flex w-full items-baseline gap-4 py-2.5 text-left"
              >
                <span className="figure w-4 shrink-0 text-[12px] ink-3" aria-hidden>
                  {active ? "▣" : "▢"}
                </span>
                <span className={`w-24 shrink-0 text-[14px] lowercase ${active ? "ink" : "ink-2"}`}>
                  {cfg?.label.toLowerCase() ?? "custom"}
                </span>
                <span className="flex-1 text-[13px] ink-3">
                  {cfg
                    ? `${cfg.newTarget} new + ${cfg.reviewTarget} review daily · ${cfg.freezesPerMonth} freeze${cfg.freezesPerMonth === 1 ? "" : "s"}/mo`
                    : "set your own numbers"}
                </span>
                {t === "STANDARD" && (
                  <span className="figure text-[11px] ink-3">recommended</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {selected === "CUSTOM" && (
        <div className="mt-4 flex flex-wrap items-baseline gap-x-8 gap-y-3 border-l-2 border-edge pl-4">
          <label className="flex items-baseline gap-2">
            <span className="label">new / day</span>
            <input
              type="number"
              min={CUSTOM_LIMITS.newMin}
              max={CUSTOM_LIMITS.newMax}
              value={newTarget}
              onChange={(e) => setNewTarget(Number(e.target.value))}
              className="w-14 border-0 border-b border-hair bg-transparent py-0.5 font-mono text-[12px] ink outline-none focus:border-edge"
            />
          </label>
          <label className="flex items-baseline gap-2">
            <span className="label">reviews / day</span>
            <input
              type="number"
              min={CUSTOM_LIMITS.reviewMin}
              max={CUSTOM_LIMITS.reviewMax}
              value={reviewTarget}
              onChange={(e) => setReviewTarget(Number(e.target.value))}
              className="w-14 border-0 border-b border-hair bg-transparent py-0.5 font-mono text-[12px] ink outline-none focus:border-edge"
            />
          </label>
          <span className="text-[12px] ink-3">
            {newTarget >= 4 ? "no freezes at 4+ per day" : "1 freeze per month"}
          </span>
        </div>
      )}

      {error && <p className="mt-3 text-[12px] text-bad">{error}</p>}

      <div className="mt-5 flex items-center gap-5">
        <button
          onClick={save}
          disabled={pending}
          className="border border-edge px-4 py-1.5 font-mono text-[12px] lowercase text-edge disabled:opacity-40"
        >
          {pending ? "saving…" : "save track"}
        </button>
        {saved && <span className="font-mono text-[12px] text-ok">saved — applies tomorrow</span>}
      </div>
    </div>
  );
}
