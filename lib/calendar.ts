import { prisma } from "./prisma";
import { dateKey, zonedDayStart, addDaysToKey } from "./date";

export type CalendarEntry = {
  submissionId: string;
  title: string;
  slug: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  status: "ACCEPTED" | "WRONG_ANSWER" | "TLE";
  isFirstClear: boolean;
  submittedAt: Date;
};

export type CalendarDay = {
  key: string;
  dayOfMonth: number;
  inMonth: boolean;
  isToday: boolean;
  entries: CalendarEntry[];
};

export type CalendarMonth = {
  year: number;
  month: number; // 1-12
  monthLabel: string;
  weeks: CalendarDay[][];
};

/** Builds a full 6-row calendar grid (Mon-Sun) for the given month, with each day's log. */
export async function getCalendarMonth(
  userId: string,
  year: number,
  month: number,
): Promise<CalendarMonth> {
  const firstOfMonthKey = `${year}-${String(month).padStart(2, "0")}-01`;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lastOfMonthKey = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

  // Grid starts on the Monday on/before the 1st and ends on the Sunday on/after the last day.
  const firstWeekday = dayOfWeekMonFirst(firstOfMonthKey);
  const gridStartKey = addDaysToKey(firstOfMonthKey, -firstWeekday);
  const lastWeekday = dayOfWeekMonFirst(lastOfMonthKey);
  const gridEndKey = addDaysToKey(lastOfMonthKey, 6 - lastWeekday);

  const rangeStart = zonedDayStart(gridStartKey);
  const rangeEnd = zonedDayStart(addDaysToKey(gridEndKey, 1));

  const submissions = await prisma.submission.findMany({
    where: { userId, submittedAt: { gte: rangeStart, lt: rangeEnd } },
    orderBy: { submittedAt: "asc" },
    include: { problem: { select: { title: true, slug: true, difficulty: true } } },
  });

  const byDay = new Map<string, CalendarEntry[]>();
  for (const s of submissions) {
    const key = dateKey(s.submittedAt);
    const list = byDay.get(key) ?? [];
    list.push({
      submissionId: s.id,
      title: s.problem.title,
      slug: s.problem.slug,
      difficulty: s.problem.difficulty,
      status: s.status,
      isFirstClear: s.isFirstClear,
      submittedAt: s.submittedAt,
    });
    byDay.set(key, list);
  }

  const todayKeyVal = dateKey(new Date());
  const weeks: CalendarDay[][] = [];
  let cursor = gridStartKey;
  while (cursor <= gridEndKey) {
    const week: CalendarDay[] = [];
    for (let i = 0; i < 7; i++) {
      week.push({
        key: cursor,
        dayOfMonth: Number(cursor.slice(8, 10)),
        inMonth: cursor.slice(0, 7) === `${year}-${String(month).padStart(2, "0")}`,
        isToday: cursor === todayKeyVal,
        entries: byDay.get(cursor) ?? [],
      });
      cursor = addDaysToKey(cursor, 1);
    }
    weeks.push(week);
  }

  const monthLabel = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return { year, month, monthLabel, weeks };
}

function dayOfWeekMonFirst(key: string): number {
  const jsDay = new Date(`${key}T00:00:00.000Z`).getUTCDay(); // 0=Sun..6=Sat
  return (jsDay + 6) % 7; // 0=Mon..6=Sun
}
