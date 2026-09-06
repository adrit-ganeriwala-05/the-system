import { requireOnboardedUserId } from "@/lib/session";
import { getCalendarMonth } from "@/lib/calendar";
import Divider from "@/components/system/Divider";
import CalendarView from "@/components/CalendarView";

export const dynamic = "force-dynamic";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>;
}) {
  const userId = await requireOnboardedUserId();
  const params = await searchParams;

  const now = new Date();
  const year = params.y ? Number(params.y) : now.getUTCFullYear();
  const month = params.m ? Number(params.m) : now.getUTCMonth() + 1;

  const data = await getCalendarMonth(userId, year, month);

  return (
    <div className="flex min-h-0 flex-1 flex-col px-5 pb-8 pt-6 sm:px-7">
      <div className="boot-section flex min-h-0 flex-1 flex-col" style={{ ["--i" as string]: 0 }}>
        <Divider label="calendar" right="attempt log" />
        <CalendarView data={data} />
      </div>
    </div>
  );
}
