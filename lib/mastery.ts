import { prisma } from "./prisma";
import { PATTERN_LABELS, PATTERN_ORDER, PATTERN_TITLES } from "./constants";
import type { Pattern, Prisma, PrismaClient } from "@prisma/client";

export type PatternMastery = {
  pattern: Pattern;
  label: string;
  solved: number;
  total: number;
  pct: number;
};

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Mastery is scoped to a single problem set: a pattern is "100%" when every problem of
 * that pattern *within the active set* is solved. The same pattern has a different
 * denominator in each set, which is exactly why this can't be precomputed globally.
 */
export async function getMasteryByPattern(
  userId: string,
  problemSetId: string,
  db: Db = prisma,
): Promise<PatternMastery[]> {
  const items = await db.problemSetItem.findMany({
    where: { problemSetId },
    select: { problem: { select: { id: true, pattern: true } } },
  });

  const problemIds = items.map((i) => i.problem.id);
  const solvedRows = await db.userProblemProgress.findMany({
    where: { userId, solved: true, problemId: { in: problemIds } },
    select: { problemId: true },
  });
  const solvedIds = new Set(solvedRows.map((r) => r.problemId));

  const totals = new Map<Pattern, number>();
  const solved = new Map<Pattern, number>();
  for (const { problem } of items) {
    totals.set(problem.pattern, (totals.get(problem.pattern) ?? 0) + 1);
    if (solvedIds.has(problem.id)) {
      solved.set(problem.pattern, (solved.get(problem.pattern) ?? 0) + 1);
    }
  }

  return PATTERN_ORDER.filter((p) => (totals.get(p) ?? 0) > 0)
    .map((pattern) => {
      const total = totals.get(pattern) ?? 0;
      const solvedCount = solved.get(pattern) ?? 0;
      return {
        pattern,
        label: PATTERN_LABELS[pattern],
        solved: solvedCount,
        total,
        pct: total === 0 ? 0 : Math.round((solvedCount / total) * 100),
      };
    })
    .sort((a, b) => b.pct - a.pct || a.label.localeCompare(b.label));
}

export function patternTitleFor(pattern: Pattern): string {
  return PATTERN_TITLES[pattern];
}

/** Solved / total for a set, used for Rank and the progress ring. */
export async function getSetProgress(userId: string, problemSetId: string, db: Db = prisma) {
  const items = await db.problemSetItem.findMany({
    where: { problemSetId },
    select: { problemId: true },
  });
  const problemIds = items.map((i) => i.problemId);
  const solved = await db.userProblemProgress.count({
    where: { userId, solved: true, problemId: { in: problemIds } },
  });
  return { solved, total: problemIds.length };
}
