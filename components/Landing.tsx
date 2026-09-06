"use client";

import Divider from "./system/Divider";

const FEATURES = [
  {
    title: "three curated problem sets",
    body: "Pareto 49, Blind 75 and NeetCode 150, deduplicated into one catalog of 150. Solve something once and it counts in every set that contains it.",
  },
  {
    title: "daily goals and streaks",
    body: "Pick a pace you can keep. Miss a day and a streak freeze covers you; run out and you get a harder catch-up day.",
  },
  {
    title: "pattern mastery, not just a total",
    body: "See how much of two pointers or dynamic programming you have actually finished, and earn a title when you clear a pattern end to end.",
  },
  {
    title: "leaderboards with friends",
    body: "Make a private group, share one link, compare by EXP and questions solved. Your notes and code stay private.",
  },
];

const PREVIEW_MASTERY: [string, number][] = [
  ["arrays & hashing", 100],
  ["two pointers", 100],
  ["binary search", 62],
  ["dynamic programming", 18],
];

export default function Landing({ signInAction }: { signInAction: () => Promise<void> }) {
  return (
    <div className="px-5 pb-10 pt-8 sm:px-7">
      <div className="boot-section" style={{ ["--i" as string]: 0 }}>
        <h1 className="font-display text-3xl font-bold leading-tight ink sm:text-4xl">
          Practice LeetCode.
          <br />
          Watch yourself level up.
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed ink-2">
          A progress tracker for coding-interview prep. Log the problems you solve, keep a
          daily streak going, see which patterns you have actually mastered, and climb the
          ranks alongside your friends.
        </p>
        <form action={signInAction} className="mt-6">
          <button
            type="submit"
            className="border border-edge px-5 py-2 font-mono text-[13px] lowercase text-edge"
          >
            continue with google
          </button>
        </form>
        <p className="mt-3 font-mono text-[11px] ink-3">free · about ten seconds to set up</p>
      </div>

      {/* The interface shown rather than described, in its own language. */}
      <div className="boot-section mt-9" style={{ ["--i" as string]: 1 }}>
        <Divider label="what it looks like" right="preview" />
        <div className="mt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <span className="font-display text-3xl font-bold leading-none ink">Lv.12</span>
            <span className="figure text-[11px] ink-3">2,930 exp total</span>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <span className="track relative h-2 flex-1">
              <span className="absolute inset-y-0 left-0 w-[72%] bg-edge edge-glow" />
            </span>
            <span className="figure shrink-0 text-xs ink-2">180/250</span>
          </div>
          <div className="figure mt-4 flex flex-wrap items-baseline gap-x-7 gap-y-2 text-sm">
            <span className="ink">
              94/150 <span className="ink-3">cleared</span>
            </span>
            <span className="ink">
              23d <span className="ink-3">streak</span>
            </span>
            <span className="text-rank">B-Rank</span>
            <span className="ink-3">7/18 patterns</span>
          </div>
          <ul className="mt-4 space-y-1.5">
            {PREVIEW_MASTERY.map(([label, pct]) => (
              <li key={label} className="flex items-center gap-4">
                <span className="w-44 shrink-0 truncate text-[13px] ink-2">{label}</span>
                <span className="track relative h-1.5 flex-1">
                  <span
                    className="absolute inset-y-0 left-0 bg-edge"
                    style={{ width: `${pct}%` }}
                  />
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="boot-section mt-9" style={{ ["--i" as string]: 2 }}>
        <Divider label="what you get" right={`${FEATURES.length} things`} />
        <ul className="mt-3">
          {FEATURES.map((f, i) => (
            <li key={f.title} className="flex gap-5 border-b border-hair py-4">
              <span className="figure w-9 shrink-0 text-[11px] ink-3">
                {String(i + 1).padStart(3, "0")}
              </span>
              <div>
                <p className="text-[15px] ink">{f.title}</p>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed ink-2">{f.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

    </div>
  );
}
