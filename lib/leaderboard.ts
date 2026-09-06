import { prisma } from "./prisma";
import { calcLevel } from "./constants";
import { startOfWeek } from "./date";

export type LeaderboardRow = {
  userId: string;
  name: string | null;
  image: string | null;
  role: "OWNER" | "MEMBER";
  level: number;
  totalExp: number;
  weeklyExp: number;
  questionsSolved: number;
  currentStreak: number;
};

/**
 * Ranking uses EXP and unique questions solved — never the Rank letter. Rank is relative
 * to each member's own active set, so two members showing "B-Rank" can represent very
 * different amounts of work; EXP stays comparable across sets.
 *
 * Computed live at query time; there is no stored leaderboard table to fall out of date.
 */
export async function getGroupLeaderboard(groupId: string) {
  const memberships = await prisma.groupMembership.findMany({
    where: { groupId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
          totalExp: true,
          currentStreak: true,
        },
      },
    },
  });

  const userIds = memberships.map((m) => m.userId);
  if (userIds.length === 0) return { allTime: [], weekly: [] };

  const weekStart = startOfWeek();

  const [solvedCounts, weeklyExpRows, firstClearTimes] = await Promise.all([
    prisma.userProblemProgress.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds }, solved: true },
      _count: { _all: true },
    }),
    // Weekly EXP is summed from first-clear submissions inside the current week, so it
    // reflects new work only — re-submissions grant no EXP and must not inflate it.
    prisma.submission.findMany({
      where: {
        userId: { in: userIds },
        isFirstClear: true,
        submittedAt: { gte: weekStart },
      },
      select: { userId: true, problem: { select: { difficulty: true } } },
    }),
    // Tiebreak for All-Time: whoever reached their total first.
    prisma.submission.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds }, isFirstClear: true },
      _max: { submittedAt: true },
    }),
  ]);

  const EXP = { EASY: 50, MEDIUM: 100, HARD: 150 } as const;

  const solvedByUser = new Map(solvedCounts.map((r) => [r.userId, r._count._all]));
  const lastClearByUser = new Map(firstClearTimes.map((r) => [r.userId, r._max.submittedAt]));
  const weeklyByUser = new Map<string, number>();
  for (const row of weeklyExpRows) {
    weeklyByUser.set(row.userId, (weeklyByUser.get(row.userId) ?? 0) + EXP[row.problem.difficulty]);
  }

  const rows: LeaderboardRow[] = memberships.map((m) => ({
    userId: m.userId,
    name: m.user.name,
    image: m.user.image,
    role: m.role,
    level: calcLevel(m.user.totalExp),
    totalExp: m.user.totalExp,
    weeklyExp: weeklyByUser.get(m.userId) ?? 0,
    questionsSolved: solvedByUser.get(m.userId) ?? 0,
    currentStreak: m.user.currentStreak,
  }));

  const allTime = [...rows].sort((a, b) => {
    if (b.totalExp !== a.totalExp) return b.totalExp - a.totalExp;
    // Same EXP: whoever got there first ranks higher.
    const aAt = lastClearByUser.get(a.userId)?.getTime() ?? Infinity;
    const bAt = lastClearByUser.get(b.userId)?.getTime() ?? Infinity;
    if (aAt !== bAt) return aAt - bAt;
    return a.userId.localeCompare(b.userId);
  });

  const weekly = [...rows].sort((a, b) => {
    if (b.weeklyExp !== a.weeklyExp) return b.weeklyExp - a.weeklyExp;
    return a.userId.localeCompare(b.userId); // stable order
  });

  return { allTime, weekly };
}
