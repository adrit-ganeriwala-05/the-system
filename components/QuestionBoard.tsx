"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Manifest from "./Manifest";
import SystemNotification, { type Notification } from "./SystemNotification";
import { useConfirmDialog } from "./ConfirmDialog";
import type { ProblemRow } from "./ProblemTable";
import type { LogAttemptResult } from "@/app/actions/attempt";

export default function QuestionBoard({
  problems,
  setName,
}: {
  problems: ProblemRow[];
  setName: string;
}) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const idRef = useRef(0);
  const { confirm, dialog } = useConfirmDialog();

  const push = useCallback((text: string, tone?: Notification["tone"]) => {
    const id = String(idRef.current++);
    setNotifications((prev) => [...prev, { id, text, tone }]);
    setTimeout(() => setNotifications((prev) => prev.filter((n) => n.id !== id)), 4000);
  }, []);

  function handleResult(result: LogAttemptResult, problem: ProblemRow) {
    if (result.isFirstClear) {
      push(`${problem.title.toLowerCase()} cleared · +${result.expGained} exp`, "ok");
    } else {
      push(`attempt logged · ${problem.title.toLowerCase()}`);
    }
    if (result.questCompleted) push("daily quota met. streak extended.", "ok");
    if (result.leveledUp) {
      void confirm({
        title: "ascension",
        message: `Congratulations, you're ascended to level ${result.newLevel}.`,
        confirmLabel: "continue",
        hideCancel: true,
        rank: true,
      });
    }
    if (result.rankedUp) push(`rank reassessed — ${result.newRank}-rank`, "rank");
    if (result.unlockedTitle) push(`title unlocked — ${result.unlockedTitle.toLowerCase()}`, "rank");
    router.refresh();
  }

  return (
    <>
      <SystemNotification notifications={notifications} />
      <Manifest problems={problems} setName={setName} onResult={handleResult} />
      {dialog}
    </>
  );
}
