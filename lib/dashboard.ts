import { prisma } from "./prisma";
import { ensureTodayQuest } from "./quest";
import { getMasteryByPattern } from "./mastery";
import { calcRank, RANK_LABELS, resolveTrack, LEVEL_DIVISOR } from "./constants";
import { msUntilNextMidnight } from "./date";

export async function getDashboardData(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { activeProblemSet: true },
  });

  // Every user has an active set; fall back to the smallest if one was never assigned
  // (e.g. a row created before the set existed).
  let activeSet = user.activeProblemSet;
  if (!activeSet) {
    activeSet = await prisma.problemSet.findUniqueOrThrow({ where: { key: "pareto49" } });
    await prisma.user.update({
      where: { id: userId },
      data: { activeProblemSetId: activeSet.id },
    });
  }

  const { quest, freezeConsumed, streakReset } = await ensureTodayQuest(userId);

  const [problemSets, items, progressRows, achievements, recentSubmissions] = await Promise.all([
    prisma.problemSet.findMany({ orderBy: { totalCount: "asc" } }),
    prisma.problemSetItem.findMany({
      where: { problemSetId: activeSet.id },
      orderBy: { orderIndex: "asc" },
      include: { problem: true },
    }),
    prisma.userProblemProgress.findMany({ where: { userId } }),
    prisma.achievement.findMany({ where: { userId }, orderBy: { unlockedAt: "asc" } }),
    prisma.submission.findMany({
      where: { userId },
      orderBy: { submittedAt: "desc" },
      take: 200,
      select: { submittedAt: true, status: true, isReview: true },
    }),
  ]);

  const progressByProblemId = new Map(progressRows.map((p) => [p.problemId, p]));

  const problems = items.map((item) => {
    const p = progressByProblemId.get(item.problemId);
    return {
      id: item.problem.id,
      title: item.problem.title,
      slug: item.problem.slug,
      leetcodeUrl: item.problem.leetcodeUrl,
      pattern: item.problem.pattern,
      difficulty: item.problem.difficulty,
      orderIndex: item.orderIndex,
      status: p?.solved ? ("CLEARED" as const) : p ? ("IN_PROGRESS" as const) : ("UNATTEMPTED" as const),
      submissionCount: p?.submissionCount ?? 0,
    };
  });

  const solvedCount = problems.filter((p) => p.status === "CLEARED").length;
  const totalInSet = problems.length;
  const rank = calcRank(solvedCount, totalInSet);
  const mastery = await getMasteryByPattern(userId, activeSet.id);
  const track = resolveTrack(user);

  // Projected pace — an estimate, not a promise.
  const remaining = totalInSet - solvedCount;
  const projectedDays =
    track.newTarget > 0 && remaining > 0 ? Math.ceil(remaining / track.newTarget) : 0;

  return {
    user: {
      id: user.id,
      name: user.name,
      image: user.image,
      level: user.level,
      totalExp: user.totalExp,
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      activeTitle: user.activeTitle,
      streakFreezesRemaining: user.streakFreezesRemaining,
      rank,
      rankLabel: RANK_LABELS[rank],
    },
    levelDivisor: LEVEL_DIVISOR,
    activeSet: { id: activeSet.id, key: activeSet.key, name: activeSet.name },
    problemSets: problemSets.map((s) => ({ id: s.id, key: s.key, name: s.name })),
    problems,
    solvedCount,
    totalInSet,
    remaining,
    projectedDays,
    mastery,
    achievements,
    recentSubmissions,
    quest,
    track,
    questNotices: { freezeConsumed, streakReset },
    msUntilMidnight: msUntilNextMidnight(),
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
