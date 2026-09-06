import { APP_TIMEZONE } from "./constants";

/** Returns the current date as a YYYY-MM-DD string in APP_TIMEZONE. */
export function todayKey(now = new Date()): string {
  return dateKey(now);
}

export function dateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Midnight (00:00:00) of the given YYYY-MM-DD key, stored as a UTC Date for the DB. */
export function dateKeyToUtcMidnight(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

export function addDaysToKey(key: string, days: number): string {
  const d = dateKeyToUtcMidnight(key);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function yesterdayKey(key: string): string {
  return addDaysToKey(key, -1);
}

export function daysBetweenKeys(from: string, to: string): number {
  const a = dateKeyToUtcMidnight(from).getTime();
  const b = dateKeyToUtcMidnight(to).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** YYYY-MM in APP_TIMEZONE — used to decide when monthly streak freezes refill. */
export function monthKey(date = new Date()): string {
  return dateKey(date).slice(0, 7);
}

/** Offset of APP_TIMEZONE from UTC, in ms, at the given instant. */
function tzOffsetMs(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const asIfUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );
  return asIfUtc - at.getTime();
}

/**
 * The real instant at which a calendar day begins in APP_TIMEZONE.
 *
 * `dateKeyToUtcMidnight` returns a date *label* (fine for DailyQuest.date, which is a day,
 * not a moment). Filtering timestamps needs the actual instant, which differs by the zone
 * offset — under America/New_York, local Monday 00:00 is Monday 05:00 UTC, so using UTC
 * midnight would leak several hours of Sunday's submissions into the week.
 */
export function zonedDayStart(key: string): Date {
  const guess = dateKeyToUtcMidnight(key);
  // Two passes so a DST shift between the guess and the true instant still resolves.
  let instant = new Date(guess.getTime() - tzOffsetMs(guess));
  instant = new Date(guess.getTime() - tzOffsetMs(instant));
  return instant;
}

/** Instant at which the current week began (Monday 00:00 in APP_TIMEZONE). */
export function startOfWeek(now = new Date()): Date {
  const key = dateKey(now);
  const dayOfWeek = dateKeyToUtcMidnight(key).getUTCDay(); // 0=Sun..6=Sat
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  return zonedDayStart(addDaysToKey(key, -daysSinceMonday));
}

/** Milliseconds until the next APP_TIMEZONE midnight, for a client-side countdown. */
export function msUntilNextMidnight(now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(now);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const hour = get("hour") % 24;
  const secondsIntoDay = hour * 3600 + get("minute") * 60 + get("second");
  const secondsRemaining = 24 * 3600 - secondsIntoDay;
  return secondsRemaining * 1000;
}
