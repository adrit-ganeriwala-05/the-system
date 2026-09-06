import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "./prisma";

/**
 * The real auth boundary. Middleware only checks that a session cookie exists; this
 * validates it against the database. Every protected page, layout, and server action
 * must call this (or requireUserId) before touching user data.
 */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");
  return session.user.id;
}

export async function requireUser() {
  const userId = await requireUserId();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { activeProblemSet: true },
  });
  // Session row outlived its user (deleted account) — force a fresh sign-in.
  if (!user) redirect("/signin");
  return user;
}

/**
 * Like requireUserId, but also sends first-time users through onboarding before they can
 * reach any real surface. Used by every signed-in page except /onboarding itself.
 */
export async function requireOnboardedUserId(): Promise<string> {
  const userId = await requireUserId();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { hasCompletedOnboarding: true },
  });
  if (!user) redirect("/signin");
  if (!user.hasCompletedOnboarding) redirect("/onboarding");
  return userId;
}

/** For server actions: throws instead of redirecting, so the client sees a real error. */
export async function requireUserIdForAction(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated.");
  return session.user.id;
}
