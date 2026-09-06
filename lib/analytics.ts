import { dateKey } from "./date";

export type SubmissionLike = { submittedAt: Date | string; status: string; isReview: boolean };

/**
 * Every submission is either a review (the problem was already solved before this
 * attempt) or a fresh attempt (it wasn't yet) — the two counts are mutually exclusive and
 * cover every row, so the chart's two lines never double-count a submission.
 */
export function buildActivitySeries(submissions: SubmissionLike[], days = 14) {
  const attempted = new Map<string, number>();
  const reviewed = new Map<string, number>();
  for (const s of submissions) {
    const key = dateKey(new Date(s.submittedAt));
    const bucket = s.isReview ? reviewed : attempted;
    bucket.set(key, (bucket.get(key) ?? 0) + 1);
  }

  const series: { date: string; label: string; attempted: number; reviewed: number }[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const key = dateKey(d);
    series.push({
      date: key,
      label: key.slice(5),
      attempted: attempted.get(key) ?? 0,
      reviewed: reviewed.get(key) ?? 0,
    });
  }
  return series;
}
