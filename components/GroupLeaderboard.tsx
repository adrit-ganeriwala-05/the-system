"use client";

import { useState } from "react";
import Divider from "./system/Divider";
import type { LeaderboardRow } from "@/lib/leaderboard";

export default function GroupLeaderboard({
  allTime,
  weekly,
  viewerId,
}: {
  allTime: LeaderboardRow[];
  weekly: LeaderboardRow[];
  viewerId: string;
}) {
  const [tab, setTab] = useState<"allTime" | "weekly">("allTime");
  const rows = tab === "allTime" ? allTime : weekly;

  return (
    <div>
      <Divider
        label="leaderboard"
        right={
          <span className="flex gap-3">
            {(["allTime", "weekly"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                aria-pressed={tab === t}
                className={`font-mono text-[11px] lowercase ${
                  tab === t ? "ink underline underline-offset-4" : "ink-3"
                }`}
              >
                {t === "allTime" ? "all-time" : "this week"}
              </button>
            ))}
          </span>
        }
      />

      {rows.length === 0 ? (
        <p className="mt-4 text-sm ink-3">no members yet — share the invite link.</p>
      ) : (
        <ul className="mt-3">
          {rows.map((r, i) => {
            const you = r.userId === viewerId;
            return (
              <li
                key={r.userId}
                className={`flex items-baseline gap-4 border-b border-hair py-2.5 ${
                  you ? "border-l-2 border-l-edge pl-3" : ""
                }`}
              >
                <span className="figure w-8 shrink-0 text-[11px] ink-3">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className={`flex-1 truncate text-[14px] lowercase ${you ? "ink" : "ink-2"}`}>
                  {(r.name ?? "unnamed").toLowerCase()}
                  {r.role === "OWNER" && <span className="ml-2 text-[11px] text-rank">owner</span>}
                </span>
                <span className="figure w-14 shrink-0 text-right text-[12px] ink-3">
                  lv.{r.level}
                </span>
                <span className="figure w-20 shrink-0 text-right text-[12px] ink">
                  {(tab === "allTime" ? r.totalExp : r.weeklyExp).toLocaleString()}
                </span>
                <span className="figure w-12 shrink-0 text-right text-[12px] ink-3">
                  {r.questionsSolved}
                </span>
                <span className="figure w-10 shrink-0 text-right text-[12px] ink-3">
                  {r.currentStreak}d
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-3 text-[12px] ink-3">
        ranked by exp and questions solved — not rank, which is relative to each member&rsquo;s
        own active set.
      </p>
    </div>
  );
}
