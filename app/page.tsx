import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import Dashboard from "@/components/Dashboard";
import Landing from "@/components/Landing";
import { getDashboardData } from "@/lib/dashboard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();

  // Signed out: the public landing page, the only surface that needs no account.
  if (!session?.user?.id) {
    async function signInWithGoogle() {
      "use server";
      await signIn("google", { redirectTo: "/" });
    }

    return <Landing signInAction={signInWithGoogle} />;
  }

  // First sign-in goes through onboarding before the dashboard is ever shown.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { hasCompletedOnboarding: true },
  });
  if (!user) redirect("/signin");
  if (!user.hasCompletedOnboarding) redirect("/onboarding");

  const data = await getDashboardData(session.user.id);
  return <Dashboard data={data} />;
}
