"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserIdForAction } from "@/lib/session";
import { ensureTodayQuest } from "@/lib/quest";
import { getMasteryByPattern, patternTitleFor } from "@/lib/mastery";
import { calcLevel, calcRank, EXP_BY_DIFFICULTY } from "@/lib/constants";
import type { SubmissionStatus } from "@prisma/client";

export type LogAttemptInput = {
  problemId: string;
  status: SubmissionStatus;
  notes?: string;
  runtime?: string;
  memory?: string;
  timeSpentMin?: number;
  submittedAt?: string;
};

export type LogAttemptResult = {
  isFirstClear: boolean;
  expGained: number;
  leveledUp: boolean;
  newLevel: number;
  rankedUp: boolean;
  newRank: string;
  unlockedTitle: string | null;
  questCompleted: boolean;
};

export async function logAttempt(input: LogAttemptInput): Promise<LogAttemptResult> {
  const userId = await requireUserIdForAction();
  if (!input.problemId) throw new Error("problemId is required");

  // Settles yesterday (freeze / penalty / streak) before today's progress is counted.
  await ensureTodayQuest(userId);

  const result = await prisma.$transaction(async (tx) => {
    const problem = await tx.problem.findUniqueOrThrow({ where: { id: input.problemId } });
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });

    const progress = await tx.userProblemProgress.findUnique({
      where: { userId_problemId: { userId, problemId: problem.id } },
    });

    const wasSolved = progress?.solved ?? false;
    const isFirstClear = input.status === "ACCEPTED" && !wasSolved;
    // A "review" is any attempt on a question this user had already solved.
    const isReview = wasSolved;
    const expGained = isFirstClear ? EXP_BY_DIFFICULTY[problem.difficulty] : 0;

    await tx.submission.create({
      data: {
        userId,
        problemId: problem.id,
        status: input.status,
        notes: input.notes,
        runtime: input.runtime,
        memory: input.memory,
        timeSpentMin: input.timeSpentMin,
        isFirstClear,
        submittedAt: input.submittedAt ? new Date(input.submittedAt) : undefined,
      },
    });

    await tx.userProblemProgress.upsert({
      where: { userId_problemId: { userId, problemId: problem.id } },
      update: {
        solved: wasSolved || isFirstClear,
        firstClearedAt: isFirstClear ? new Date() : progress?.firstClearedAt,
        submissionCount: { increment: 1 },
      },
      create: {
        userId,
        problemId: problem.id,
        solved: isFirstClear,
        firstClearedAt: isFirstClear ? new Date() : null,
        submissionCount: 1,
      },
    });

    const newTotalExp = user.totalExp + expGained;
    const newLevel = calcLevel(newTotalExp);
    const leveledUp = newLevel > user.level;

    // Rank is relative to the active set, so it is recomputed rather than stored.
    const activeSetId = user.activeProblemSetId;
    let newRank = "E";
    let oldRank = "E";
    if (activeSetId) {
      const items = await tx.problemSetItem.findMany({
        where: { problemSetId: activeSetId },
        select: { problemId: true },
      });
      const ids = items.map((i) => i.problemId);
      // Counted after the progress upsert above, so this already includes today's clear.
      const solvedInSet = await tx.userProblemProgress.count({
        where: { userId, solved: true, problemId: { in: ids } },
      });
      const clearedInThisSet = isFirstClear && new Set(ids).has(problem.id);
      newRank = calcRank(solvedInSet, ids.length);
      oldRank = calcRank(solvedInSet - (clearedInThisSet ? 1 : 0), ids.length);
    }
    const rankedUp = newRank !== oldRank;

    let unlockedTitle: string | null = null;
    if (isFirstClear && activeSetId) {
      const mastery = await getMasteryByPattern(userId, activeSetId, tx);
      const forPattern = mastery.find((m) => m.pattern === problem.pattern);
      if (forPattern && forPattern.pct === 100) {
        const already = await tx.achievement.findUnique({
          where: { userId_patternKey: { userId, patternKey: problem.pattern } },
        });
        if (!already) {
          const title = patternTitleFor(problem.pattern);
          await tx.achievement.create({
            data: { userId, patternKey: problem.pattern, title },
          });
          unlockedTitle = title;
        }
      }
    }

    const quest = await tx.dailyQuest.findFirstOrThrow({
      where: { userId },
      orderBy: { date: "desc" },
    });
    const completedNewSolves = quest.completedNewSolves + (isFirstClear ? 1 : 0);
    const completedReviews = quest.completedReviews + (isReview ? 1 : 0);
    const nowCompleted =
      completedNewSolves >= quest.targetNewSolves && completedReviews >= quest.targetReviews;
    const justCompleted = nowCompleted && !quest.isCompleted;

    await tx.dailyQuest.update({
      where: { id: quest.id },
      data: {
        completedNewSolves,
        completedReviews,
        isCompleted: nowCompleted,
        isPenalty: nowCompleted ? false : quest.isPenalty,
      },
    });

    let newStreak = user.currentStreak;
    let newLongestStreak = user.longestStreak;
    if (justCompleted) {
      newStreak = user.currentStreak + 1;
      newLongestStreak = Math.max(user.longestStreak, newStreak);
    }

    await tx.user.update({
      where: { id: userId },
      data: {
        totalExp: newTotalExp,
        level: newLevel,
        currentStreak: newStreak,
        longestStreak: newLongestStreak,
        activeTitle: unlockedTitle ?? undefined,
      },
    });

    return {
      isFirstClear,
      expGained,
      leveledUp,
      newLevel,
      rankedUp,
      newRank,
      unlockedTitle,
      questCompleted: justCompleted,
    };
  });

  revalidatePath("/");
  return result;
}
