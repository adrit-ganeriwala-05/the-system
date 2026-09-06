"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserIdForAction } from "@/lib/session";
import { ensureTodayQuest } from "@/lib/quest";
import { clamp, CUSTOM_LIMITS } from "@/lib/constants";
import type { CommitmentTrack } from "@prisma/client";

export type OnboardingInput = {
  name: string;
  image: string | null;
  track: CommitmentTrack;
  customNewTarget?: number;
  customReviewTarget?: number;
  problemSetId: string;
};

export async function completeOnboarding(input: OnboardingInput) {
  const userId = await requireUserIdForAction();

  const name = input.name.trim();
  if (!name) throw new Error("Display name is required.");
  if (name.length > 60) throw new Error("Display name must be 60 characters or fewer.");

  const set = await prisma.problemSet.findUnique({ where: { id: input.problemSetId } });
  if (!set) throw new Error("Unknown problem set.");

  const isCustom = input.track === "CUSTOM";

  await prisma.user.update({
    where: { id: userId },
    data: {
      name,
      image: input.image,
      commitmentTrack: input.track,
      customNewTarget: isCustom
        ? clamp(input.customNewTarget ?? 2, CUSTOM_LIMITS.newMin, CUSTOM_LIMITS.newMax)
        : null,
      customReviewTarget: isCustom
        ? clamp(input.customReviewTarget ?? 0, CUSTOM_LIMITS.reviewMin, CUSTOM_LIMITS.reviewMax)
        : null,
      activeProblemSetId: set.id,
      hasCompletedOnboarding: true,
    },
  });

  // Generated after the track is saved so day one already uses the chosen targets.
  await ensureTodayQuest(userId);

  revalidatePath("/");
}
