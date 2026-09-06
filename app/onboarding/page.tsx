import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import OnboardingWizard from "@/components/OnboardingWizard";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const userId = await requireUserId();

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  // One-time only: anyone who already finished goes straight to the dashboard.
  if (user.hasCompletedOnboarding) redirect("/");

  const problemSets = await prisma.problemSet.findMany({ orderBy: { totalCount: "asc" } });

  return (
    <OnboardingWizard
      initialName={user.name ?? ""}
      googleImage={user.image}
      problemSets={problemSets.map((s) => ({ id: s.id, key: s.key, name: s.name }))}
    />
  );
}
