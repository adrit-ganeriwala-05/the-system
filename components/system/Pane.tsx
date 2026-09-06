"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { usePaneMotion } from "./PaneMotionContext";

type Morph = "dot" | "line" | "full";

const SCALE: Record<Morph, { scaleX: number; scaleY: number }> = {
  dot: { scaleX: 0.02, scaleY: 0.02 },
  line: { scaleX: 1, scaleY: 0.012 },
  full: { scaleX: 1, scaleY: 1 },
};

/**
 * The single window everything is projected into.
 *
 * Its shape is a small state machine (see PaneMotionContext), rendered here as a uniform
 * transform-scale on the whole box rather than animating width/height directly — the pane
 * is fluid (sized by flex-1), so scaling around its own true, already-laid-out size is what
 * lets the dot/line/box morph track that real size instead of fighting the layout for it.
 *
 * The border is an SVG overlay rather than a CSS border so it can trace itself on boot,
 * and so the corner brackets and edge ticks are real geometry rather than decoration
 * faked with pseudo-elements. The same outline doubles as the path a comet travels while
 * the route behind the pane is loading.
 */
export default function Pane({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const { phase } = usePaneMotion();
  const reduce = useReducedMotion();
  const [morph, setMorph] = useState<Morph>(reduce ? "full" : "dot");

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

  // Boot: dot -> line -> full, once, the moment the pane first exists. (Local state starts
  // at "dot" already via useState above, so only the two later steps need scheduling.)
  useEffect(() => {
    if (phase !== "boot" || reduce) return;
    const t1 = setTimeout(() => setMorph("line"), 140);
    const t2 = setTimeout(() => setMorph("full"), 340);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [phase, reduce]);

  // Sign-out / delete-account: full -> line, then hold there until the redirect lands.
  useEffect(() => {
    if (phase !== "collapsing" && phase !== "collapsed") return;
    const id = setTimeout(() => setMorph("line"), 0);
    return () => clearTimeout(id);
  }, [phase]);

  // The redirect landed on a new route while collapsed: line -> full again.
  useEffect(() => {
    if (phase !== "reopening") return;
    const id0 = setTimeout(() => setMorph(reduce ? "full" : "line"), 0);
    const id1 = reduce ? undefined : setTimeout(() => setMorph("full"), 40);
    return () => {
      clearTimeout(id0);
      if (id1) clearTimeout(id1);
    };
  }, [phase, reduce]);

  const full = morph === "full";
  const { w, h } = box;
  const c = 14; // corner cut, matches the clip-path
  const outline = w
    ? `M ${c} 0 L ${w - c} 0 L ${w} ${c} L ${w} ${h - c} L ${w - c} ${h} L ${c} ${h} L 0 ${h - c} L 0 ${c} Z`
    : "";
  const perimeter = w ? 2 * (w + h) : 4000;

  return (
    <div className="relative flex flex-1 flex-col">
      <motion.div
        ref={ref}
        className="pane flex flex-1 flex-col"
        style={{
          transformOrigin: "50% 50%",
          pointerEvents: full ? "auto" : "none",
          // backdrop-filter recomputes its sampled backdrop every frame an element's
          // screen-space bounds change — animating a transform on the same element that
          // carries the pane's blur is a known-heavy combination that can visibly stall
          // weaker hardware. There is nothing behind the pane worth blurring differently
          // while it is squished to a dot/line anyway, so the blur is simply off for that
          // brief window and switches back on the instant the box holds still.
          backdropFilter: full ? undefined : "none",
          WebkitBackdropFilter: full ? undefined : "none",
          willChange: full ? "auto" : "transform",
        }}
        animate={SCALE[morph]}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 28 }}
      >
        {w > 0 && (
          <motion.svg
            className="pane-edge"
            width={w}
            height={h}
            viewBox={`0 0 ${w} ${h}`}
            aria-hidden
            animate={{ opacity: full ? 1 : 0 }}
            transition={{ duration: reduce ? 0 : 0.2, delay: full && !reduce ? 0.05 : 0 }}
          >
            {/* The frame traces itself in, once, on boot. */}
            <path
              d={outline}
              className="boot-trace edge-glow"
              strokeWidth={1}
              strokeOpacity={0.55}
              style={{ ["--trace-len" as string]: perimeter }}
            />
            <Brackets w={w} h={h} c={c} />
            <Ticks w={w} h={h} />
            {phase === "loading" && (
              <LoadingComet outline={outline} perimeter={perimeter} reduce={!!reduce} />
            )}
          </motion.svg>
        )}
        <motion.div
          className="relative z-1 flex flex-1 flex-col"
          animate={{ opacity: full ? 1 : 0 }}
          transition={{ duration: reduce ? 0 : 0.22, delay: full && !reduce ? 0.06 : 0 }}
        >
          {children}
        </motion.div>
        {phase === "loading" && <LoadingOverlay />}
      </motion.div>
    </div>
  );
}

/** A bright dash chasing clockwise around the pane's own cut-corner outline. */
function LoadingComet({
  outline,
  perimeter,
  reduce,
}: {
  outline: string;
  perimeter: number;
  reduce: boolean;
}) {
  const dash = Math.min(90, perimeter * 0.06);
  return (
    <motion.path
      d={outline}
      fill="none"
      stroke="var(--v-edge)"
      strokeWidth={2}
      strokeOpacity={0.9}
      className="edge-glow"
      strokeDasharray={`${dash} ${perimeter}`}
      initial={{ strokeDashoffset: 0 }}
      animate={reduce ? undefined : { strokeDashoffset: -perimeter }}
      transition={{ duration: 1.7, repeat: Infinity, ease: "linear" }}
    />
  );
}

/** Center-of-page "loading" readout with a cycling ellipsis, shown while a route streams in. */
function LoadingOverlay() {
  const [dotCount, setDotCount] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setDotCount((n) => (n + 1) % 4), 350);
    return () => clearInterval(id);
  }, []);
  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-2 flex items-center justify-center bg-void/50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <p className="figure text-sm text-edge">
        loading
        <span className="inline-block w-4 text-left">{".".repeat(dotCount)}</span>
      </p>
    </motion.div>
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
