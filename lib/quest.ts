import { prisma } from "./prisma";
import { resolveTrack } from "./constants";
import { dateKey, dateKeyToUtcMidnight, monthKey, todayKey, yesterdayKey } from "./date";
import type { DailyQuest, User } from "@prisma/client";

export type QuestOutcome = {
  quest: DailyQuest;
  /** True when a streak freeze was spent to cover a missed day. */
  freezeConsumed: boolean;
  /** True when the streak was reset because no freeze was available. */
  streakReset: boolean;
};

/**
 * Lazily creates today's quest on first activity of the day (chosen over a midnight cron
 * so the app needs no scheduled infrastructure).
 *
 * Rolling the day over also settles yesterday: an unmet quota either consumes a streak
 * freeze or breaks the streak and escalates today into a Penalty Quest. A gap of several
 * days is settled the same way as a single missed day — one freeze covers the whole gap,
 * since freezes are a leniency allowance, not a per-day currency.
 */
export async function ensureTodayQuest(userId: string): Promise<QuestOutcome> {
  const key = todayKey();
  const todayDate = dateKeyToUtcMidnight(key);

  const existing = await prisma.dailyQuest.findUnique({
    where: { userId_date: { userId, date: todayDate } },
  });
  if (existing) return { quest: existing, freezeConsumed: false, streakReset: false };

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const refreshed = await refillFreezesIfNewMonth(user);
  const track = resolveTrack(refreshed);

  // A review means re-attempting something already solved — with nothing solved yet,
  // there is nothing to revisit, so the review target would be unmeetable.
  const solvedCount = await prisma.userProblemProgress.count({
    where: { userId, solved: true },
  });
  const reviewTarget = solvedCount === 0 ? 0 : track.reviewTarget;

  const prev = await prisma.dailyQuest.findFirst({
    where: { userId, date: { lt: todayDate } },
    orderBy: { date: "desc" },
  });

  // First quest ever — nothing to settle.
  if (!prev) {
    const quest = await prisma.dailyQuest.create({
      data: {
        userId,
        date: todayDate,
        targetNewSolves: track.newTarget,
        targetReviews: reviewTarget,
      },
    });
    return { quest, freezeConsumed: false, streakReset: false };
  }

  const prevKey = dateKey(prev.date);
  const prevWasYesterday = prevKey === yesterdayKey(key);

  // Streak intact: yesterday's quota was met.
  if (prevWasYesterday && prev.isCompleted) {
    const quest = await prisma.dailyQuest.create({
      data: {
        userId,
        date: todayDate,
        targetNewSolves: track.newTarget,
        targetReviews: reviewTarget,
      },
    });
    return { quest, freezeConsumed: false, streakReset: false };
  }

  // A day was missed. Spend a freeze if one remains, otherwise break the streak.
  const canFreeze = refreshed.streakFreezesRemaining > 0 && refreshed.currentStreak > 0;

  if (canFreeze) {
    const [quest] = await prisma.$transaction([
      prisma.dailyQuest.create({
        data: {
          userId,
          date: todayDate,
          targetNewSolves: track.newTarget,
          targetReviews: reviewTarget,
          freezeUsed: true,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { streakFreezesRemaining: { decrement: 1 } },
      }),
    ]);
    return { quest, freezeConsumed: true, streakReset: false };
  }

  // No freeze left: reset the streak and escalate into a Penalty Quest.
  const base = prev.isPenalty ? prev.targetNewSolves : track.newTarget;
  const escalated = Math.min(base + 1, track.penaltyCap);

  const [quest] = await prisma.$transaction([
    prisma.dailyQuest.create({
      data: {
        userId,
        date: todayDate,
        targetNewSolves: escalated,
        targetReviews: 0,
        isPenalty: true,
        penaltyReason: `Quota missed on ${prevKey}. Solve ${escalated} questions today to clear the penalty.`,
      },
    }),
    prisma.user.update({ where: { id: userId }, data: { currentStreak: 0 } }),
  ]);

  return { quest, freezeConsumed: false, streakReset: true };
}

/** Streak freezes refill at the start of each calendar month, per the user's track. */
async function refillFreezesIfNewMonth(user: User): Promise<User> {
  const thisMonth = monthKey();
  const lastReset = user.streakFreezeResetAt ? monthKey(user.streakFreezeResetAt) : null;
  if (lastReset === thisMonth) return user;

  const track = resolveTrack(user);
  return prisma.user.update({
    where: { id: user.id },
    data: {
      streakFreezesRemaining: track.freezesPerMonth,
      streakFreezeResetAt: new Date(),
    },
  });
}
