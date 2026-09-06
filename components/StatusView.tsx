"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import Divider from "./system/Divider";
import { buildActivitySeries } from "@/lib/analytics";
import { setActiveProblemSet } from "@/app/actions/settings";
import type { DashboardData } from "@/lib/dashboard";

export default function StatusView({ data }: { data: DashboardData }) {
  const reduce = useReducedMotion();
  let step = 0;
  const next = () => ({ ["--i" as string]: step++ });

  return (
    <div className="px-5 pb-8 pt-6 sm:px-7">
      <section className="boot-section" style={next()}>
        <Identity
          level={data.user.level}
          name={data.user.name}
          title={data.user.activeTitle}
          totalExp={data.user.totalExp}
          divisor={data.levelDivisor}
          reduce={!!reduce}
        />
      </section>

      {/* Wide viewports split into two columns divided by a hairline — internal structure
          inside the one pane, so the extra width does work instead of stretching bars. */}
      <div className="mt-7 grid gap-x-10 gap-y-7 xl:grid-cols-2">
        <div className="min-w-0">
          <div className="boot-section" style={next()}>
            <Divider
              label={data.activeSet.name.toLowerCase()}
              right={<SetSwitcher sets={data.problemSets} activeId={data.activeSet.id} />}
            />
            <StatLine
              solved={data.solvedCount}
              total={data.totalInSet}
              streak={data.user.currentStreak}
              longest={data.user.longestStreak}
              rankLabel={data.user.rankLabel}
              freezes={data.user.streakFreezesRemaining}
              projectedDays={data.projectedDays}
            />
          </div>

          <div className="boot-section mt-7" style={next()}>
            <Divider label="today" right={<Countdown ms={data.msUntilMidnight} />} />
            <Today quest={data.quest} track={data.track.label} />
          </div>

          <div className="boot-section mt-7" style={next()}>
            <Divider label="activity" right="14d" />
            <Activity submissions={data.recentSubmissions} />
          </div>
        </div>

        <div className="min-w-0 xl:border-l xl:border-hair xl:pl-10">
          <div className="boot-section" style={next()}>
            <Divider label="mastery" right={`${data.mastery.length} patterns`} />
            <Mastery mastery={data.mastery} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- identity ---------------- */

function Identity({
  level,
  name,
  title,
  totalExp,
  divisor,
  reduce,
}: {
  level: number;
  name: string | null;
  title: string | null;
  totalExp: number;
  divisor: number;
  reduce: boolean;
}) {
  const into = totalExp % divisor;
  const pct = Math.min(100, Math.round((into / divisor) * 100));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {/* An open arc bracketing the numeral — level progress, not a donut chart.
              Scoped to the numeral's own row so it never crosses the title beneath. */}
          <div className="relative">
            <svg
              width="74"
              height="74"
              viewBox="0 0 74 74"
              aria-hidden
              className="pointer-events-none absolute -left-4 -top-3"
            >
              <path
                d="M 37 6 A 31 31 0 1 0 68 37"
                fill="none"
                stroke="rgb(var(--v-light) / var(--a-track))"
                strokeWidth="1.5"
              />
              <path
                d="M 37 6 A 31 31 0 1 0 68 37"
                fill="none"
                stroke="var(--v-edge)"
                strokeWidth="1.5"
                pathLength={100}
                strokeDasharray={`${pct} 100`}
                className="edge-glow"
              />
            </svg>
            <div className="relative pl-6 font-display text-5xl font-bold leading-none ink">
              Lv.{level}
            </div>
          </div>
          {title && <div className="mt-2 pl-6 text-sm ink-2">{title}</div>}
        </div>

        <div className="text-right">
          <div className="figure text-sm ink-2">{name ?? "unnamed"}</div>
          <div className="figure mt-1 text-[11px] ink-3">
            {totalExp.toLocaleString()} exp total
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <div className="track relative h-2 flex-1 overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 bg-edge edge-glow"
            initial={reduce ? false : { width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 80, damping: 20 }}
          />
        </div>
        <span className="figure shrink-0 text-xs ink-2">
          {into}/{divisor}
        </span>
      </div>
    </div>
  );
}

/* ---------------- stat line ---------------- */

function StatLine({
  solved,
  total,
  streak,
  longest,
  rankLabel,
  freezes,
  projectedDays,
}: {
  solved: number;
  total: number;
  streak: number;
  longest: number;
  rankLabel: string;
  freezes: number;
  projectedDays: number;
}) {
  return (
    <div className="figure mt-4 flex flex-wrap items-baseline gap-x-7 gap-y-2 text-sm">
      <span className="ink">
        {solved}/{total} <span className="ink-3">cleared</span>
      </span>
      <span className="ink">
        {streak}d <span className="ink-3">streak</span>
      </span>
      <span className="ink-3">
        {longest}d <span className="ink-3">longest</span>
      </span>
      {/* Rank is the only warm color on the screen. */}
      <span className="text-rank">{rankLabel}</span>
      <span className="ink-3">
        {freezes} <span className="ink-3">freezes</span>
      </span>
      {projectedDays > 0 && (
        <span className="ink-3">
          ~{projectedDays}d <span className="ink-3">to s-rank</span>
        </span>
      )}
    </div>
  );
}

function SetSwitcher({
  sets,
  activeId,
}: {
  sets: { id: string; key: string; name: string }[];
  activeId: string;
}) {
  return (
    <select
      aria-label="Active set"
      value={activeId}
      onChange={(e) => setActiveProblemSet(e.target.value)}
      className="figure cursor-pointer border-0 bg-transparent p-0 text-[11px] lowercase ink-3 outline-none hover:opacity-100"
    >
      {sets.map((s) => (
        <option key={s.id} value={s.id} className="bg-void">
          {s.name.toLowerCase()}
        </option>
      ))}
    </select>
  );
}

/* ---------------- today ---------------- */

function Countdown({ ms }: { ms: number }) {
  const [left, setLeft] = useState(ms);
  useEffect(() => {
    const id = setInterval(() => setLeft((v) => Math.max(0, v - 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  const s = Math.floor(left / 1000);
  const hhmmss = [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
  return <span className="figure">resets {hhmmss}</span>;
}

function Today({
  quest,
  track,
}: {
  quest: DashboardData["quest"];
  track: string;
}) {
  const rows = [
    {
      label: quest.isPenalty
        ? `atone — solve ${quest.targetNewSolves} questions`
        : `solve ${quest.targetNewSolves} question${quest.targetNewSolves === 1 ? "" : "s"}`,
      done: quest.completedNewSolves,
      target: quest.targetNewSolves,
    },
    ...(quest.targetReviews > 0
      ? [
          {
            label: `revisit ${quest.targetReviews} solved question${quest.targetReviews === 1 ? "" : "s"}`,
            done: quest.completedReviews,
            target: quest.targetReviews,
          },
        ]
      : []),
  ];

  return (
    <div className="mt-4">
      {quest.isPenalty && quest.penaltyReason && (
        <p className="mb-3 border-l-2 border-bad pl-3 text-sm text-bad">{quest.penaltyReason}</p>
      )}
      {quest.freezeUsed && (
        <p className="mb-3 border-l-2 pl-3 text-sm ink-2" style={{ borderColor: "rgb(var(--v-light) / 0.3)" }}>
          a streak freeze covered a missed day.
        </p>
      )}
      <ul>
        {rows.map((r) => {
          const complete = r.done >= r.target;
          return (
            <li
              key={r.label}
              className="flex items-baseline gap-3 border-b py-2 last:border-b-0"
              style={{ borderColor: "rgb(var(--v-light) / var(--a-hairline))" }}
            >
              <span className={`figure text-sm ${complete ? "ink" : "ink-3"}`} aria-hidden>
                {complete ? "▣" : "▢"}
              </span>
              <span className={`flex-1 text-sm ${complete ? "ink-3 line-through" : "ink"}`}>
                {r.label}
              </span>
              <span className="figure text-sm ink-2">
                {Math.min(r.done, r.target)}/{r.target}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="figure mt-2 text-[11px] ink-3">{track.toLowerCase()} track</p>
    </div>
  );
}

/* ---------------- mastery ---------------- */

function Mastery({ mastery }: { mastery: DashboardData["mastery"] }) {
  if (mastery.length === 0) {
    return <p className="mt-4 text-sm ink-3">no patterns in this set.</p>;
  }
  return (
    <ul className="mt-4 space-y-1.5">
      {mastery.map((m) => (
        <li key={m.pattern} className="flex items-center gap-4">
          <span className="w-28 shrink-0 truncate text-[13px] lowercase ink-2 sm:w-44">{m.label}</span>
          {/* Track is always drawn, so an all-zero state still reads as structure. */}
          <span className="track relative h-1.5 flex-1">
            <span
              className="absolute inset-y-0 left-0 bg-edge"
              style={{ width: `${m.pct}%` }}
            />
          </span>
          <span className="figure w-12 shrink-0 text-right text-[11px] ink-3">
            {m.solved}/{m.total}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ---------------- activity ---------------- */

function Activity({ submissions }: { submissions: DashboardData["recentSubmissions"] }) {
  const series = buildActivitySeries(submissions, 14);
  const hasAny = submissions.length > 0;

  if (!hasAny) {
    return <p className="mt-4 text-sm ink-3">no attempts logged yet.</p>;
  }

  return (
    <div className="mt-4 h-32">
      <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="actFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--v-edge)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--v-edge)" stopOpacity={0} />
              </linearGradient>
            </defs>
            {/* Chart chrome stripped: no grid, no axis lines, no boxed tooltip. */}
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "rgb(var(--v-light) / var(--a-tertiary))", fontSize: 10 }}
              interval={2}
            />
            <Tooltip
              cursor={{ stroke: "var(--v-edge)", strokeOpacity: 0.4 }}
              contentStyle={{
                background: "var(--v-void)",
                border: "1px solid rgb(var(--v-light) / var(--a-hairline))",
                borderRadius: 0,
                fontSize: 11,
                color: "rgb(var(--v-light) / var(--a-primary))",
              }}
              formatter={(v) => [`${v}`, "attempts"]}
            />
            <Area
              type="monotone"
              dataKey="submissions"
              stroke="var(--v-edge)"
              strokeWidth={1.5}
              fill="url(#actFill)"
            />
          </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
