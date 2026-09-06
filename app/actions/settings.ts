"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserIdForAction } from "@/lib/session";
import { clamp, CUSTOM_LIMITS, resolveTrack } from "@/lib/constants";
import type { CommitmentTrack } from "@prisma/client";

export async function setActiveProblemSet(problemSetId: string) {
  const userId = await requireUserIdForAction();

  const set = await prisma.problemSet.findUnique({ where: { id: problemSetId } });
  if (!set) throw new Error("Unknown problem set.");

  await prisma.user.update({
    where: { id: userId },
    data: { activeProblemSetId: set.id },
  });

  revalidatePath("/");
}

export async function setCommitmentTrack(input: {
  track: CommitmentTrack;
  customNewTarget?: number;
  customReviewTarget?: number;
}) {
  const userId = await requireUserIdForAction();

  const customNewTarget =
    input.track === "CUSTOM"
      ? clamp(input.customNewTarget ?? 2, CUSTOM_LIMITS.newMin, CUSTOM_LIMITS.newMax)
      : null;
  const customReviewTarget =
    input.track === "CUSTOM"
      ? clamp(input.customReviewTarget ?? 0, CUSTOM_LIMITS.reviewMin, CUSTOM_LIMITS.reviewMax)
      : null;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      commitmentTrack: input.track,
      customNewTarget,
      customReviewTarget,
    },
  });

  // A track change takes effect on the next generated quest — today's targets and all
  // past history stay exactly as they were. Only the freeze allowance is topped up, and
  // only downward-safe: never grant more than the new track allows.
  const track = resolveTrack(user);
  if (user.streakFreezesRemaining > track.freezesPerMonth) {
    await prisma.user.update({
      where: { id: userId },
      data: { streakFreezesRemaining: track.freezesPerMonth },
    });
  }

  revalidatePath("/");
  revalidatePath("/settings");
}
