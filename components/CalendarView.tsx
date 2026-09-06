"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CalendarMonth, CalendarDay } from "@/lib/calendar";

const DIFF_DOT: Record<string, string> = {
  EASY: "text-easy",
  MEDIUM: "text-med",
  HARD: "text-hard",
};

const WEEKDAY_LABELS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function prevMonth(year: number, month: number) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}
function nextMonth(year: number, month: number) {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

export default function CalendarView({ data }: { data: CalendarMonth }) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const prev = prevMonth(data.year, data.month);
  const next = nextMonth(data.year, data.month);

  const selectedDay: CalendarDay | undefined = data.weeks
    .flat()
    .find((d) => d.key === selectedKey);

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between">
        <Link
          href={`/calendar?y=${prev.year}&m=${prev.month}`}
          className="p-1 ink-3 transition-opacity duration-150 hover:opacity-100"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <h2 className="font-display text-lg font-semibold ink">{data.monthLabel}</h2>
        <Link
          href={`/calendar?y=${next.year}&m=${next.month}`}
          className="p-1 ink-3 transition-opacity duration-150 hover:opacity-100"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-px">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="figure pb-2 text-center text-[11px] ink-3">
            {w}
          </div>
        ))}

        {data.weeks.flat().map((day) => {
          const active = day.key === selectedKey;
          const shown = day.entries.slice(0, 4);
          const overflow = day.entries.length - shown.length;
          return (
            <button
              key={day.key}
              onClick={() => setSelectedKey(active ? null : day.key)}
              disabled={day.entries.length === 0}
              className={`flex min-h-16 flex-col items-start gap-1 border-t border-hair p-1.5 text-left transition-opacity duration-150 sm:min-h-20 sm:p-2 ${
                day.inMonth ? "" : "opacity-30"
              } ${active ? "bg-edge/10" : ""} ${day.entries.length === 0 ? "cursor-default" : "cursor-pointer hover:opacity-90"}`}
              style={active ? { boxShadow: "inset 0 0 0 1px var(--v-edge)" } : undefined}
            >
              <span
                className={`figure text-[12px] ${day.isToday ? "text-edge" : day.inMonth ? "ink-2" : "ink-3"}`}
              >
                {day.dayOfMonth}
              </span>
              {day.entries.length > 0 && (
                <span className="flex flex-wrap items-center gap-0.5" aria-hidden>
                  {shown.map((e) => (
                    <span key={e.submissionId} className={`text-[10px] ${DIFF_DOT[e.difficulty]}`}>
                      ●
                    </span>
                  ))}
                  {overflow > 0 && <span className="figure text-[9px] ink-3">+{overflow}</span>}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {selectedDay && (
          <motion.div
            key={selectedDay.key}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="mt-2 overflow-hidden border-t border-hair"
          >
            <div className="pt-4">
              <p className="label mb-3">{selectedDay.key}</p>
              {selectedDay.entries.length === 0 ? (
                <p className="text-sm ink-3">nothing logged this day.</p>
              ) : (
                <ul>
                  {selectedDay.entries.map((e) => (
                    <li
                      key={e.submissionId}
                      className="flex items-baseline gap-3 border-b border-hair py-2 last:border-b-0"
                    >
                      <span className={`text-[11px] ${DIFF_DOT[e.difficulty]}`} aria-hidden>
                        ●
                      </span>
                      <span className="flex-1 text-sm ink">{e.title}</span>
                      <span
                        className={`figure text-[11px] ${e.status === "ACCEPTED" ? "text-ok" : "text-bad"}`}
                      >
                        {e.status === "ACCEPTED" ? (e.isFirstClear ? "cleared" : "revisited") : e.status.toLowerCase()}
                      </span>
                      <span className="figure text-[11px] ink-3">
                        {new Date(e.submittedAt).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
