import type { CommitmentTrack, Difficulty, Pattern, Rank } from "@prisma/client";

export const APP_TIMEZONE = process.env.APP_TIMEZONE || "UTC";

export const EXP_BY_DIFFICULTY: Record<Difficulty, number> = {
  EASY: 50,
  MEDIUM: 100,
  HARD: 150,
};

export const LEVEL_DIVISOR = 250;

export function calcLevel(totalExp: number): number {
  return Math.floor(totalExp / LEVEL_DIVISOR) + 1;
}

// Rank is a share of the active set, not a fixed count — a fixed count can't work when
// the sets are 49, 75, and 150 problems.
export function calcRank(solved: number, total: number): Rank {
  if (total <= 0) return "E";
  if (solved >= total) return "S";
  const pct = (solved / total) * 100;
  if (pct >= 80) return "A";
  if (pct >= 60) return "B";
  if (pct >= 40) return "C";
  if (pct >= 20) return "D";
  return "E";
}

export const RANK_LABELS: Record<Rank, string> = {
  E: "E-Rank",
  D: "D-Rank",
  C: "C-Rank",
  B: "B-Rank",
  A: "A-Rank",
  S: "S-Rank / Code Sovereign",
};

export const PATTERN_ORDER: Pattern[] = [
  "ARRAYS_HASHING",
  "TWO_POINTERS",
  "SLIDING_WINDOW",
  "STACK",
  "BINARY_SEARCH",
  "LINKED_LIST",
  "TREES",
  "TRIES",
  "HEAP_PRIORITY_QUEUE",
  "BACKTRACKING",
  "GRAPHS",
  "ADVANCED_GRAPHS",
  "DP_1D",
  "DP_2D",
  "GREEDY",
  "INTERVALS",
  "MATH_GEOMETRY",
  "BIT_MANIPULATION",
];

export const PATTERN_LABELS: Record<Pattern, string> = {
  ARRAYS_HASHING: "Arrays & Hashing",
  TWO_POINTERS: "Two Pointers",
  SLIDING_WINDOW: "Sliding Window",
  STACK: "Stack",
  BINARY_SEARCH: "Binary Search",
  LINKED_LIST: "Linked List",
  TREES: "Trees",
  TRIES: "Tries",
  HEAP_PRIORITY_QUEUE: "Heap / Priority Queue",
  BACKTRACKING: "Backtracking",
  GRAPHS: "Graphs",
  ADVANCED_GRAPHS: "Advanced Graphs",
  DP_1D: "1-D Dynamic Programming",
  DP_2D: "2-D Dynamic Programming",
  GREEDY: "Greedy",
  INTERVALS: "Intervals",
  MATH_GEOMETRY: "Math & Geometry",
  BIT_MANIPULATION: "Bit Manipulation",
};

export const PATTERN_TITLES: Record<Pattern, string> = {
  ARRAYS_HASHING: "Hashing Virtuoso",
  TWO_POINTERS: "Pointer Prodigy",
  SLIDING_WINDOW: "Window Optimizer",
  STACK: "Stack Frame Master",
  BINARY_SEARCH: "Divide-and-Conquer Specialist",
  LINKED_LIST: "Linked List Whisperer",
  TREES: "Tree Traversal Master",
  TRIES: "Prefix Pioneer",
  HEAP_PRIORITY_QUEUE: "Priority Queue Virtuoso",
  BACKTRACKING: "Recursive Explorer",
  GRAPHS: "Graph Architect",
  ADVANCED_GRAPHS: "Graph Theory Grandmaster",
  DP_1D: "DP Optimizer",
  DP_2D: "Matrix DP Master",
  GREEDY: "Greedy Strategist",
  INTERVALS: "Interval Scheduler",
  MATH_GEOMETRY: "Number Theory Sage",
  BIT_MANIPULATION: "Bitwise Virtuoso",
};

// ---------- Commitment tracks (§5.3) ----------

export type TrackConfig = {
  label: string;
  newTarget: number;
  reviewTarget: number;
  freezesPerMonth: number;
  /** Most the penalty target may exceed the base target by. */
  penaltyMaxIncrease: number;
  /** Absolute ceiling on a penalty target, regardless of base. */
  penaltyAbsoluteCap?: number;
};

export const TRACKS: Record<Exclude<CommitmentTrack, "CUSTOM">, TrackConfig> = {
  CASUAL: {
    label: "Casual",
    newTarget: 1,
    reviewTarget: 0,
    freezesPerMonth: 2,
    penaltyMaxIncrease: 2,
  },
  STANDARD: {
    label: "Standard",
    newTarget: 2,
    reviewTarget: 1,
    freezesPerMonth: 1,
    penaltyMaxIncrease: 3,
  },
  INTENSE: {
    label: "Intense",
    newTarget: 4,
    reviewTarget: 2,
    freezesPerMonth: 0,
    penaltyMaxIncrease: 5,
  },
};

export const CUSTOM_LIMITS = {
  newMin: 1,
  newMax: 10,
  reviewMin: 0,
  reviewMax: 5,
  penaltyAbsoluteCap: 5,
};

export type ResolvedTrack = {
  track: CommitmentTrack;
  label: string;
  newTarget: number;
  reviewTarget: number;
  freezesPerMonth: number;
  penaltyCap: number;
};

/** Resolves a user's track config, including CUSTOM's user-entered targets. */
export function resolveTrack(user: {
  commitmentTrack: CommitmentTrack;
  customNewTarget: number | null;
  customReviewTarget: number | null;
}): ResolvedTrack {
  if (user.commitmentTrack === "CUSTOM") {
    const newTarget = clamp(
      user.customNewTarget ?? 2,
      CUSTOM_LIMITS.newMin,
      CUSTOM_LIMITS.newMax,
    );
    const reviewTarget = clamp(
      user.customReviewTarget ?? 0,
      CUSTOM_LIMITS.reviewMin,
      CUSTOM_LIMITS.reviewMax,
    );
    return {
      track: "CUSTOM",
      label: "Custom",
      newTarget,
      reviewTarget,
      // Spec: 0 freezes for demanding custom targets, otherwise 1/month.
      freezesPerMonth: newTarget >= 4 ? 0 : 1,
      // Spec: escalate to newTarget + 1, capped at 5 absolute.
      penaltyCap: Math.min(newTarget + 1, CUSTOM_LIMITS.penaltyAbsoluteCap),
    };
  }

  const cfg = TRACKS[user.commitmentTrack];
  return {
    track: user.commitmentTrack,
    label: cfg.label,
    newTarget: cfg.newTarget,
    reviewTarget: cfg.reviewTarget,
    freezesPerMonth: cfg.freezesPerMonth,
    penaltyCap: cfg.newTarget + cfg.penaltyMaxIncrease,
  };
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export const PROBLEM_SET_KEYS = ["pareto49", "blind75", "neetcode150"] as const;
