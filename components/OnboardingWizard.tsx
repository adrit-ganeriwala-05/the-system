"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import type { CommitmentTrack } from "@prisma/client";
import { completeOnboarding } from "@/app/actions/onboarding";
import { CUSTOM_LIMITS } from "@/lib/constants";

type ProblemSetOption = { id: string; key: string; name: string };

const TRACK_CHOICES: {
 value: CommitmentTrack;
 title: string;
 blurb: string;
 recommended?: boolean;
}[] = [
 { value: "CASUAL", title: "Casual", blurb: "1 question a day, easygoing pace." },
 {
 value: "STANDARD",
 title: "Standard",
 blurb: "2 a day plus 1 review. A steady pace most people can keep.",
 recommended: true,
 },
 { value: "INTENSE", title: "Intense", blurb: "4 a day plus 2 reviews, for focused prep." },
 { value: "CUSTOM", title: "Custom", blurb: "Set your own numbers." },
];

const SET_BLURBS: Record<string, string> = {
 pareto49: "The 49 highest-leverage problems — best if you're just starting out.",
 blind75: "The original 75 essentials.",
 neetcode150: "The full 150-problem sweep.",
};

const STEPS = ["Profile", "Difficulty", "Starting set"] as const;

export default function OnboardingWizard({
 initialName,
 googleImage,
 problemSets,
}: {
 initialName: string;
 googleImage: string | null;
 problemSets: ProblemSetOption[];
}) {
 const router = useRouter();
 const reduce = useReducedMotion();

 const [step, setStep] = useState(0);
 const [direction, setDirection] = useState(1);
 const [name, setName] = useState(initialName);
 const [track, setTrack] = useState<CommitmentTrack>("STANDARD");
 const [newTarget, setNewTarget] = useState(2);
 const [reviewTarget, setReviewTarget] = useState(1);
 const [setId, setSetId] = useState(
 problemSets.find((s) => s.key === "pareto49")?.id ?? problemSets[0]?.id ?? "",
 );
 const [error, setError] = useState<string | null>(null);
 const [pending, startTransition] = useTransition();

 const spring = reduce
 ? { duration: 0.2 }
 : { type: "spring" as const, stiffness: 260, damping: 26 };

 // Reduced motion collapses the slide into a plain crossfade.
 //
 // `mode="wait"` plays exit to completion before enter, so a spring on both sides leaves
 // the card visibly empty for about a second. Exit is a short tween and only enter gets
 // the spring, which reads as a crisp handoff rather than a gap.
 const exitTween = { duration: reduce ? 0.1 : 0.12, ease: "easeIn" as const };
 const variants = reduce
 ? {
 enter: { opacity: 0 },
 center: { opacity: 1, transition: { duration: 0.2 } },
 exit: { opacity: 0, transition: exitTween },
 }
 : {
 enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
 center: { opacity: 1, x: 0, transition: spring },
 exit: (dir: number) => ({
 opacity: 0,
 x: dir > 0 ? -28 : 28,
 transition: exitTween,
 }),
 };

 function go(next: number) {
 setDirection(next > step ? 1 : -1);
 setError(null);
 setStep(next);
 }

 function submit() {
 setError(null);
 startTransition(async () => {
 try {
 await completeOnboarding({
 name,
 image: googleImage,
 track,
 customNewTarget: newTarget,
 customReviewTarget: reviewTarget,
 problemSetId: setId,
 });
 router.push("/");
 router.refresh();
 } catch (e) {
 setError(e instanceof Error ? e.message : "Couldn't finish setup.");
 }
 });
 }

 const chosenSet = problemSets.find((s) => s.id === setId);
 const chosenTrack = TRACK_CHOICES.find((t) => t.value === track);
 const isConfirm = step === 3;
 const canAdvance = step !== 0 || name.trim().length > 0;

 return (
 <div className="px-5 pb-8 pt-6 sm:px-7">
 <div>
 {/* Progress */}
 <div className="mb-6">
 <div className="mb-3 flex items-center justify-between">
 <p className="text-xs text-edge">
 {isConfirm ? "Confirm" : `Step ${step + 1} of 3`}
 </p>
 <p className="figure text-xs ink-3">
 {isConfirm ? "Ready" : STEPS[step]}
 </p>
 </div>
 <div className="flex gap-2">
 {STEPS.map((label, i) => (
 <div key={label} className="relative h-1.5 flex-1 bg-transparent">
 {(isConfirm || i <= step) && (
 <motion.div
 // Shared layout id lets the marker glide between steps.
 layoutId={i === step && !isConfirm ? "progress-marker" : undefined}
 className="absolute inset-0 bg-edge"
 transition={spring}
 />
 )}
 </div>
 ))}
 </div>
 </div>

 {/* Min height keeps the card from collapsing while one step swaps for the next. */}
 <div className="min-h-80">
 <AnimatePresence mode="wait" custom={direction} initial={false}>
 <motion.div
 key={step}
 custom={direction}
 variants={variants}
 initial="enter"
 animate="center"
 exit="exit"
 >
 {step === 0 && (
 <StepProfile name={name} setName={setName} />
 )}
 {step === 1 && (
 <StepTrack
 track={track}
 setTrack={setTrack}
 newTarget={newTarget}
 setNewTarget={setNewTarget}
 reviewTarget={reviewTarget}
 setReviewTarget={setReviewTarget}
 reduce={!!reduce}
 />
 )}
 {step === 2 && (
 <StepSet
 problemSets={problemSets}
 setId={setId}
 setSetId={setSetId}
 reduce={!!reduce}
 />
 )}
 {isConfirm && (
 <Summary
 name={name}
 image={googleImage}
 trackTitle={chosenTrack?.title ?? ""}
 trackBlurb={
 track === "CUSTOM"
 ? `${newTarget} new + ${reviewTarget} review per day`
 : (chosenTrack?.blurb ?? "")
 }
 setName={chosenSet?.name ?? ""}
 />
 )}
 </motion.div>
 </AnimatePresence>
 </div>

 {error && <p className="mt-4 text-sm text-bad">{error}</p>}

 <div className="mt-8 flex items-center justify-between gap-3">
 <button
 onClick={() => go(step - 1)}
 disabled={step === 0 || pending}
 className="flex items-center gap-1.5 border border-hair px-4 py-2 text-sm ink-2 transition-colors duration-200 hover:bg-transparent disabled:opacity-40"
 >
 <ArrowLeft className="h-4 w-4" /> Back
 </button>

 {isConfirm ? (
 <button
 onClick={submit}
 disabled={pending}
 className="flex items-center gap-2 bg-edge px-5 py-2 text-sm font-semibold text-void transition-[filter] duration-200 hover:brightness-110 disabled:opacity-50"
 >
 {pending && <Loader2 className="h-4 w-4 animate-spin" />}
 Enter the System
 </button>
 ) : (
 <button
 onClick={() => go(step + 1)}
 disabled={!canAdvance || pending}
 className="flex items-center gap-1.5 bg-edge px-5 py-2 text-sm font-semibold text-void transition-[filter] duration-200 hover:brightness-110 disabled:opacity-40"
 >
 {step === 2 ? "Review" : "Next"} <ArrowRight className="h-4 w-4" />
 </button>
 )}
 </div>
 </div>

 <p className="mt-4 text-center text-xs ink-3">
 You can change any of this later in Settings.
 </p>
 </div>
 );
}

function stagger(reduce: boolean, i: number) {
 return reduce
 ? { duration: 0.2 }
 : { type: "spring" as const, stiffness: 300, damping: 28, delay: i * 0.05 };
}

function StepProfile({
 name,
 setName,
}: {
 name: string;
 setName: (v: string) => void;
}) {
 return (
 <div>
 <h1 className="text-xl font-semibold ink">What should we call you?</h1>
 <p className="mt-1 text-sm ink-2">
 This is the name your friends see on group leaderboards.
 </p>

 <label className="mt-6 block text-xs ink-2">
 <span className="mb-1 block ">Display name</span>
 <input
 value={name}
 onChange={(e) => setName(e.target.value)}
 maxLength={60}
 className="w-full border border-hair bg-transparent px-3 py-2 ink outline-none focus:border-edge"
 />
 </label>
 </div>
 );
}

function StepTrack({
 track,
 setTrack,
 newTarget,
 setNewTarget,
 reviewTarget,
 setReviewTarget,
 reduce,
}: {
 track: CommitmentTrack;
 setTrack: (t: CommitmentTrack) => void;
 newTarget: number;
 setNewTarget: (n: number) => void;
 reviewTarget: number;
 setReviewTarget: (n: number) => void;
 reduce: boolean;
}) {
 return (
 <div>
 <h1 className="text-xl font-semibold ink">How hard do you want this?</h1>
 <p className="mt-1 text-sm ink-2">
 This sets your daily goal. Pick something you can keep up on a busy day.
 </p>

 <div className="mt-6 grid gap-3 sm:grid-cols-2">
 {TRACK_CHOICES.map((choice, i) => {
 const active = track === choice.value;
 return (
 <motion.button
 key={choice.value}
 type="button"
 onClick={() => setTrack(choice.value)}
 aria-pressed={active}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={stagger(reduce, i)}
 className={` border p-4 text-left transition-colors duration-200 ${
 active
 ? "border-edge bg-transparent"
 : "border-hair bg-transparent hover:border-hair"
 }`}
 >
 <span className="flex items-center gap-2">
 <span className={`text-sm font-semibold ${active ? "text-edge" : "ink"}`}>
 {choice.title}
 </span>
 {choice.recommended && (
 <span className=" border border-edge px-1.5 py-0.5 text-[10px] text-edge">
 Recommended
 </span>
 )}
 </span>
 <span className="mt-1 block text-xs leading-relaxed ink-2">
 {choice.blurb}
 </span>
 </motion.button>
 );
 })}
 </div>

 {track === "CUSTOM" && (
 <div className="mt-4 grid gap-4 border border-hair bg-transparent p-4 sm:grid-cols-2">
 <label className="block text-xs ink-2">
 <span className="mb-1 block ">
 New per day ({CUSTOM_LIMITS.newMin}–{CUSTOM_LIMITS.newMax})
 </span>
 <input
 type="number"
 min={CUSTOM_LIMITS.newMin}
 max={CUSTOM_LIMITS.newMax}
 value={newTarget}
 onChange={(e) => setNewTarget(Number(e.target.value))}
 className="w-full border border-hair bg-transparent px-3 py-2 ink outline-none focus:border-edge"
 />
 </label>
 <label className="block text-xs ink-2">
 <span className="mb-1 block ">
 Reviews per day ({CUSTOM_LIMITS.reviewMin}–{CUSTOM_LIMITS.reviewMax})
 </span>
 <input
 type="number"
 min={CUSTOM_LIMITS.reviewMin}
 max={CUSTOM_LIMITS.reviewMax}
 value={reviewTarget}
 onChange={(e) => setReviewTarget(Number(e.target.value))}
 className="w-full border border-hair bg-transparent px-3 py-2 ink outline-none focus:border-edge"
 />
 </label>
 </div>
 )}
 </div>
 );
}

function StepSet({
 problemSets,
 setId,
 setSetId,
 reduce,
}: {
 problemSets: ProblemSetOption[];
 setId: string;
 setSetId: (id: string) => void;
 reduce: boolean;
}) {
 return (
 <div>
 <h1 className="text-xl font-semibold ink">Where do you want to start?</h1>
 <p className="mt-1 text-sm ink-2">
 You can switch sets any time — progress carries across, since they overlap.
 </p>

 <div className="mt-6 space-y-3">
 {problemSets.map((set, i) => {
 const active = setId === set.id;
 return (
 <motion.button
 key={set.id}
 type="button"
 onClick={() => setSetId(set.id)}
 aria-pressed={active}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={stagger(reduce, i)}
 className={`block w-full border p-4 text-left transition-colors duration-200 ${
 active
 ? "border-edge bg-transparent"
 : "border-hair bg-transparent hover:border-hair"
 }`}
 >
 <span className="flex items-center gap-2">
 <span className={`text-sm font-semibold ${active ? "text-edge" : "ink"}`}>
 {set.name}
 </span>
 {set.key === "pareto49" && (
 <span className=" border border-edge px-1.5 py-0.5 text-[10px] text-edge">
 Recommended
 </span>
 )}
 </span>
 <span className="mt-1 block text-xs leading-relaxed ink-2">
 {SET_BLURBS[set.key]}
 </span>
 </motion.button>
 );
 })}
 </div>
 </div>
 );
}

function Summary({
 name,
 image,
 trackTitle,
 trackBlurb,
 setName,
}: {
 name: string;
 image: string | null;
 trackTitle: string;
 trackBlurb: string;
 setName: string;
}) {
 return (
 <div>
 <h1 className="text-xl font-semibold ink">You&rsquo;re all set</h1>
 <p className="mt-1 text-sm ink-2">Here&rsquo;s what we&rsquo;ll start you with.</p>

 <ul className="mt-6 divide-y divide-hair border border-hair">
 <li className="flex items-center gap-3 px-4 py-3">
 {image && (
 // eslint-disable-next-line @next/next/no-img-element
 <img src={image} alt="" className="h-9 w-9 object-cover" />
 )}
 <span>
 <span className="block text-[10px] ink-3">Name</span>
 <span className="text-sm font-medium ink">{name}</span>
 </span>
 </li>
 <li className="px-4 py-3">
 <span className="block text-[10px] ink-3">
 Daily goal
 </span>
 <span className="text-sm font-medium ink">{trackTitle}</span>
 <span className="ml-2 text-xs ink-2">{trackBlurb}</span>
 </li>
 <li className="px-4 py-3">
 <span className="block text-[10px] ink-3">
 Starting set
 </span>
 <span className="text-sm font-medium ink">{setName}</span>
 </li>
 </ul>

 <p className="mt-4 flex items-center gap-1.5 text-xs text-edge">
 <Check className="h-3.5 w-3.5" /> Your first daily quest starts as soon as you enter.
 </p>
 </div>
 );
}
