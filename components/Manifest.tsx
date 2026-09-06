"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Difficulty, Pattern, SubmissionStatus } from "@prisma/client";
import Divider from "./system/Divider";
import { logAttempt, type LogAttemptResult } from "@/app/actions/attempt";
import { PATTERN_LABELS, PATTERN_ORDER } from "@/lib/constants";
import type { ProblemRow } from "./ProblemTable";

/**
 * Difficulty as a colored dot rather than a pill badge — green / yellow / red, read as a
 * traffic light. Colour alone never carries it: every dot also has a text label for
 * assistive tech, and the legend below the filters names all three.
 */
const DIFF_DOT: Record<Difficulty, string> = {
  EASY: "text-easy",
  MEDIUM: "text-med",
  HARD: "text-hard",
};
const DIFF_TITLE: Record<Difficulty, string> = { EASY: "easy", MEDIUM: "medium", HARD: "hard" };
const DIFF_ORDER: Difficulty[] = ["EASY", "MEDIUM", "HARD"];

const STATUS_GLYPH = { UNATTEMPTED: "○", IN_PROGRESS: "◑", CLEARED: "●" } as const;

type StatusKey = "unsolved" | "solved";
const STATUS_KEYS: StatusKey[] = ["unsolved", "solved"];

/** Toggle membership in a facet. */
function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/** "YYYY-MM-DD" from the viewer's local calendar day — `toISOString` reads the UTC date,
 *  which is already tomorrow near midnight in any negative-UTC-offset timezone. */
function localDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** The date picker only carries a calendar day, not a time — combining it with the
 *  literal UTC midnight of that day (via `new Date(dateString)`) stamped every log at the
 *  same fixed clock time once rendered back in local time. Pairing the picked day with the
 *  actual current time-of-day instead means a same-day log gets its real timestamp, and a
 *  backdated one at least gets a plausible time rather than a frozen midnight artifact. */
function combineDateWithNow(dateStr: string): Date {
  const [y, m, day] = dateStr.split("-").map(Number);
  const now = new Date();
  return new Date(y, m - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());
}

/**
 * Lags a value behind its source by `delay` — used so the row list re-filters only after
 * the toggle's underline has finished emerging, rather than snapping instantly. Skipped
 * entirely under reduced motion.
 */
function useDelayed<T>(value: T, delay: number, skip: boolean): T {
  const [delayed, setDelayed] = useState(value);
  useEffect(() => {
    if (skip) return;
    const id = setTimeout(() => setDelayed(value), delay);
    return () => clearTimeout(id);
  }, [value, delay, skip]);
  return skip ? value : delayed;
}

/** Whether the facet item on either side of index `i` is already active — used to grow a
 *  newly-selected filter's underline out from the edge touching its active neighbor. */
function emergeOrigin<T>(list: T[], active: T[], i: number): "left" | "right" {
  const leftActive = i > 0 && active.includes(list[i - 1]);
  const rightActive = i < list.length - 1 && active.includes(list[i + 1]);
  return leftActive ? "left" : rightActive ? "right" : "left";
}

export default function Manifest({
  problems,
  setName,
  onResult,
}: {
  problems: ProblemRow[];
  setName: string;
  onResult: (result: LogAttemptResult, problem: ProblemRow) => void;
}) {
  // Three independent facets. Within a facet the selections OR together; across facets
  // they AND. An empty facet means "no constraint", so nothing is ever filtered to zero
  // just because a facet was left untouched.
  const [statuses, setStatuses] = useState<StatusKey[]>([]);
  const [difficulties, setDifficulties] = useState<Difficulty[]>([]);
  const [selectedPatterns, setSelectedPatterns] = useState<Pattern[]>([]);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const reduce = useReducedMotion();

  // Only the patterns this set actually contains — 9 for Pareto 49, 18 for NeetCode 150.
  const patterns = useMemo(
    () => PATTERN_ORDER.filter((p) => problems.some((q) => q.pattern === p)),
    [problems],
  );

  // Switching the active set can retire selected patterns; drop them rather than
  // silently rendering an empty manifest.
  const activePatterns = useMemo(
    () => selectedPatterns.filter((p) => patterns.includes(p)),
    [selectedPatterns, patterns],
  );

  const anyFilter =
    statuses.length > 0 || difficulties.length > 0 || activePatterns.length > 0;

  // Rows re-filter slightly after the toggle state changes, so an emerging underline
  // finishes its motion before the manifest reflows underneath it.
  const delayedStatuses = useDelayed(statuses, 220, !!reduce);
  const delayedDifficulties = useDelayed(difficulties, 220, !!reduce);
  const delayedPatterns = useDelayed(activePatterns, 220, !!reduce);

  const rows = useMemo(() => {
    return problems.filter((p) => {
      if (query && !p.title.toLowerCase().includes(query.toLowerCase())) return false;
      if (delayedPatterns.length > 0 && !delayedPatterns.includes(p.pattern)) return false;
      if (delayedDifficulties.length > 0 && !delayedDifficulties.includes(p.difficulty)) return false;
      if (delayedStatuses.length > 0) {
        const solved = p.status === "CLEARED";
        const wanted = delayedStatuses.some((k) => (k === "solved" ? solved : !solved));
        if (!wanted) return false;
      }
      return true;
    });
  }, [problems, delayedStatuses, delayedDifficulties, delayedPatterns, query]);

  function clearAll() {
    setStatuses([]);
    setDifficulties([]);
    setSelectedPatterns([]);
  }

  return (
    <div className="px-5 pb-8 pt-6 sm:px-7">
      <div className="boot-section" style={{ ["--i" as string]: 0 }}>
        <Divider label={`manifest · ${setName.toLowerCase()}`} right={`${rows.length} items`} />

        {/* Terse toggles rather than dropdowns. Every facet is multi-select: clicking
            adds to the selection instead of replacing it. */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Toggle active={!anyFilter} onClick={clearAll} reduce={!!reduce}>
            all
          </Toggle>
          <Sep />
          {STATUS_KEYS.map((k, i) => (
            <Toggle
              key={k}
              active={statuses.includes(k)}
              onClick={() => setStatuses((v) => toggle(v, k))}
              reduce={!!reduce}
              origin={emergeOrigin(STATUS_KEYS, statuses, i)}
            >
              {k}
            </Toggle>
          ))}
          <Sep />
          {DIFF_ORDER.map((d, i) => (
            <Toggle
              key={d}
              active={difficulties.includes(d)}
              onClick={() => setDifficulties((v) => toggle(v, d))}
              reduce={!!reduce}
              dot={DIFF_DOT[d]}
              origin={emergeOrigin(DIFF_ORDER, difficulties, i)}
            >
              {DIFF_TITLE[d]}
            </Toggle>
          ))}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="search…"
            aria-label="Search questions"
            className="ml-auto w-40 border-0 border-b border-hair bg-transparent py-1 font-mono text-[12px] ink outline-none placeholder:opacity-50 focus:border-edge"
          />
        </div>

        {/* Pattern is a third facet, ANDed with the two above. */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-hair pt-3">
          <Toggle
            active={activePatterns.length === 0}
            onClick={() => setSelectedPatterns([])}
            reduce={!!reduce}
          >
            all patterns
          </Toggle>
          {patterns.map((p, i) => (
            <Toggle
              key={p}
              active={activePatterns.includes(p)}
              onClick={() => setSelectedPatterns((v) => toggle(v, p))}
              reduce={!!reduce}
              origin={emergeOrigin(patterns, activePatterns, i)}
            >
              {PATTERN_LABELS[p].toLowerCase()}
            </Toggle>
          ))}
        </div>
      </div>

      <ul className="boot-section mt-5" style={{ ["--i" as string]: 1 }}>
        {rows.length === 0 && (
          <li className="py-8 text-center text-sm ink-3">nothing matches those filters.</li>
        )}
        {/* The manifest reflows when a facet changes: rows that no longer match fade out
            and the survivors close the gap. popLayout keeps exiting rows out of the flow
            so the list does not jump. */}
        <AnimatePresence initial={false} mode="popLayout">
          {rows.map((p) => (
            <ManifestRow
              key={p.id}
              problem={p}
              open={openId === p.id}
              onToggle={() => setOpenId(openId === p.id ? null : p.id)}
              onResult={onResult}
              reduce={!!reduce}
            />
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

function ManifestRow({
  problem,
  open,
  onToggle,
  onResult,
  reduce,
}: {
  problem: ProblemRow;
  open: boolean;
  onToggle: () => void;
  onResult: (result: LogAttemptResult, problem: ProblemRow) => void;
  reduce: boolean;
}) {
  const hair = { borderColor: "rgb(var(--v-light) / var(--a-hairline))" };

  return (
    <motion.li
      layout={reduce ? false : "position"}
      initial={reduce ? false : { opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }}
      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 40 }}
      className="border-b"
      style={hair}
    >
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="group flex w-full items-baseline gap-4 py-2 text-left"
      >
        <span className="figure w-9 shrink-0 text-[11px] ink-3">
          {String(problem.orderIndex).padStart(3, "0")}
        </span>
        <span
          className={`w-3 shrink-0 text-center text-[11px] ${DIFF_DOT[problem.difficulty]}`}
          title={DIFF_TITLE[problem.difficulty]}
        >
          <span className="sr-only">{DIFF_TITLE[problem.difficulty]}</span>
          <span aria-hidden>●</span>
        </span>
        <span
          className={`flex-1 truncate text-[14px] lowercase transition-opacity duration-150 ${
            problem.status === "CLEARED" ? "ink-3" : "ink group-hover:opacity-100"
          }`}
        >
          {problem.title.toLowerCase()}
        </span>
        <span className="figure w-8 shrink-0 text-right text-[11px] ink-3">
          {problem.submissionCount || ""}
        </span>
        {/* Monochrome: green/red stay reserved for attempt outcomes, so a board full
            of solved rows does not dilute what those two hues mean. */}
        <span
          className={`figure w-4 shrink-0 text-center text-[12px] ${
            problem.status === "CLEARED" ? "ink" : "ink-3"
          }`}
          title={problem.status.toLowerCase()}
        >
          {STATUS_GLYPH[problem.status]}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={reduce ? { duration: 0.12 } : { duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <LogForm problem={problem} onDone={onToggle} onResult={onResult} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

const OUTCOMES: { value: SubmissionStatus; label: string; tone: string }[] = [
  { value: "ACCEPTED", label: "accepted", tone: "text-ok" },
  { value: "WRONG_ANSWER", label: "wrong answer", tone: "text-bad" },
  { value: "TLE", label: "tle", tone: "text-bad" },
];

/** Resolves inside the pane. No dialog, nothing floats above the window. */
function LogForm({
  problem,
  onDone,
  onResult,
}: {
  problem: ProblemRow;
  onDone: () => void;
  onResult: (result: LogAttemptResult, problem: ProblemRow) => void;
}) {
  const [outcome, setOutcome] = useState<SubmissionStatus>("ACCEPTED");
  const [date, setDate] = useState(() => localDateInputValue(new Date()));
  const [minutes, setMinutes] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hair = { borderColor: "rgb(var(--v-light) / var(--a-hairline))" };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await logAttempt({
        problemId: problem.id,
        status: outcome,
        notes: notes || undefined,
        timeSpentMin: minutes ? Number(minutes) : undefined,
        submittedAt: combineDateWithNow(date).toISOString(),
      });
      onResult(result, problem);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "could not log that attempt.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="border-l-2 py-4 pl-4" style={{ borderColor: "var(--v-edge)" }}>
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-3">
        <fieldset className="flex items-baseline gap-3">
          <legend className="sr-only">Outcome</legend>
          <span className="label">outcome</span>
          {OUTCOMES.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setOutcome(o.value)}
              aria-pressed={outcome === o.value}
              className={`font-mono text-[12px] lowercase transition-opacity duration-150 ${
                outcome === o.value ? `${o.tone} underline underline-offset-4` : "ink-3"
              }`}
            >
              {o.label}
            </button>
          ))}
        </fieldset>

        <label className="flex items-baseline gap-2">
          <span className="label">date</span>
          <input
            type="date"
            value={date}
            max={localDateInputValue(new Date())}
            onChange={(e) => setDate(e.target.value)}
            className="border-0 border-b bg-transparent py-0.5 font-mono text-[12px] ink outline-none focus:border-edge"
            style={hair}
          />
        </label>

        <label className="flex items-baseline gap-2">
          <span className="label">minutes</span>
          <input
            type="number"
            min={0}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            placeholder="—"
            className="w-16 border-0 border-b bg-transparent py-0.5 font-mono text-[12px] ink outline-none placeholder:opacity-50 focus:border-edge"
            style={hair}
          />
        </label>
      </div>

      <label className="mt-4 block">
        <span className="label">notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="optional"
          className="mt-1 w-full border bg-transparent p-2 font-mono text-[12px] ink outline-none placeholder:opacity-50 focus:border-edge"
          style={hair}
        />
      </label>

      {error && <p className="mt-2 text-[12px] text-bad">{error}</p>}

      <div className="mt-4 flex items-center gap-5">
        <button
          type="submit"
          disabled={busy}
          className="border px-4 py-1.5 font-mono text-[12px] lowercase text-edge transition-opacity duration-150 disabled:opacity-40"
          style={{ borderColor: "var(--v-edge)" }}
        >
          {busy ? "committing…" : "commit"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="font-mono text-[12px] lowercase ink-3 transition-opacity duration-150 hover:opacity-100"
        >
          cancel
        </button>
      </div>
    </form>
  );
}

/** A thin divider between facet groups in the filter row. */
function Sep() {
  return <span className="h-3 w-px shrink-0 bg-hair" aria-hidden />;
}

/**
 * Multi-select filter toggle.
 *
 * Selection is a real state change, so it gets motion: the underline grows in, rooted at
 * whichever edge touches an already-active neighbor (`origin`), so a second filter in the
 * same group visibly emerges from the first rather than appearing on its own. Reduced
 * motion drops to a plain opacity change.
 */
function Toggle({
  active,
  onClick,
  children,
  reduce,
  dot,
  origin = "left",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  reduce: boolean;
  dot?: string;
  origin?: "left" | "right";
}) {
  return (
    <motion.button
      onClick={onClick}
      aria-pressed={active}
      whileTap={reduce ? undefined : { scale: 0.94 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={`relative flex items-center gap-1.5 pb-0.5 font-mono text-[12px] lowercase ${
        active ? "ink" : "ink-3 hover:opacity-100"
      }`}
    >
      {dot && (
        <motion.span
          className={`text-[10px] ${dot}`}
          aria-hidden
          animate={{ opacity: active ? 1 : 0.55 }}
          transition={{ duration: reduce ? 0 : 0.15 }}
        >
          ●
        </motion.span>
      )}
      <span>{children}</span>
      <motion.span
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-px bg-edge edge-glow"
        style={{ transformOrigin: origin === "right" ? "100% 50%" : "0% 50%" }}
        initial={false}
        animate={{ scaleX: active ? 1 : 0, opacity: active ? 1 : 0 }}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }}
      />
    </motion.button>
  );
}
