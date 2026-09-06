import { dateKey } from "./date";

export type SubmissionLike = { submittedAt: Date | string; status: string };

export function buildActivitySeries(submissions: SubmissionLike[], days = 14) {
  const counts = new Map<string, number>();
  for (const s of submissions) {
    const key = dateKey(new Date(s.submittedAt));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const series: { date: string; label: string; submissions: number }[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const key = dateKey(d);
    series.push({
      date: key,
      label: key.slice(5),
      submissions: counts.get(key) ?? 0,
    });
  }
  return series;
}
