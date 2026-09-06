"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The single window everything is projected into.
 *
 * The border is an SVG overlay rather than a CSS border so it can trace itself on boot,
 * and so the corner brackets and edge ticks are real geometry rather than decoration
 * faked with pseudo-elements.
 */
export default function Pane({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setBox({ w: Math.round(width), h: Math.round(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { w, h } = box;
  const c = 14; // corner cut, matches the clip-path
  const outline = w
    ? `M ${c} 0 L ${w - c} 0 L ${w} ${c} L ${w} ${h - c} L ${w - c} ${h} L ${c} ${h} L 0 ${h - c} L 0 ${c} Z`
    : "";
  const perimeter = w ? 2 * (w + h) : 4000;

  return (
    <div className="relative flex flex-1 flex-col">
      <div ref={ref} className="pane flex flex-1 flex-col">
        {w > 0 && (
          <svg
            className="pane-edge"
            width={w}
            height={h}
            viewBox={`0 0 ${w} ${h}`}
            aria-hidden
          >
            {/* The frame traces itself in. */}
            <path
              d={outline}
              className="boot-trace edge-glow"
              strokeWidth={1}
              strokeOpacity={0.55}
              style={{ ["--trace-len" as string]: perimeter }}
            />
            <Brackets w={w} h={h} c={c} />
            <Ticks w={w} h={h} />
          </svg>
        )}
        <div className="relative z-1 flex flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}

/** Short L-shaped brackets that snap into place once the frame exists. */
function Brackets({ w, h, c }: { w: number; h: number; c: number }) {
  const len = 26;
  const corners = [
    `M ${c} 0 L ${c + len} 0 M 0 ${c} L 0 ${c + len}`,
    `M ${w - c} 0 L ${w - c - len} 0 M ${w} ${c} L ${w} ${c + len}`,
    `M ${c} ${h} L ${c + len} ${h} M 0 ${h - c} L 0 ${h - c - len}`,
    `M ${w - c} ${h} L ${w - c - len} ${h} M ${w} ${h - c} L ${w} ${h - c - len}`,
  ];
  return (
    <g className="boot-bracket edge-glow">
      {corners.map((d, i) => (
        <path key={i} d={d} strokeWidth={2} strokeOpacity={0.95} />
      ))}
    </g>
  );
}

/** Index ticks along the top and bottom edges — machine-like, not decorative. */
function Ticks({ w, h }: { w: number; h: number }) {
  const step = followStep(w);
  const marks = [];
  for (let x = step; x < w - step; x += step) {
    const major = Math.round(x / step) % 5 === 0;
    marks.push(
      <line key={`t${x}`} x1={x} y1={0} x2={x} y2={major ? 6 : 3} strokeWidth={1} strokeOpacity={major ? 0.5 : 0.28} />,
      <line key={`b${x}`} x1={x} y1={h} x2={x} y2={h - (major ? 6 : 3)} strokeWidth={1} strokeOpacity={major ? 0.5 : 0.28} />,
    );
  }
  return <g className="boot-bracket">{marks}</g>;
}

function followStep(w: number) {
  if (w > 1200) return 32;
  if (w > 700) return 26;
  return 20;
}
