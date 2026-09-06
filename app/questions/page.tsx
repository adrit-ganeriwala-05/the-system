import QuestionBoard from "@/components/QuestionBoard";
import { getDashboardData } from "@/lib/dashboard";
import { requireOnboardedUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function QuestionsPage() {
  const userId = await requireOnboardedUserId();
  const data = await getDashboardData(userId);
  return <QuestionBoard problems={data.problems} setName={data.activeSet.name} />;
}
