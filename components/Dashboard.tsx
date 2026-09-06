"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import StatusView from "./StatusView";
import SystemNotification, { type Notification } from "./SystemNotification";
import type { DashboardData } from "@/lib/dashboard";

export default function Dashboard({ data }: { data: DashboardData }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const idRef = useRef(0);
  const router = useRouter();

  const push = useCallback((text: string, tone?: Notification["tone"]) => {
    const id = String(idRef.current++);
    setNotifications((prev) => [...prev, { id, text, tone }]);
    setTimeout(() => setNotifications((prev) => prev.filter((n) => n.id !== id)), 4000);
  }, []);

  // Surface what the server settled at day-rollover.
  const { freezeConsumed, streakReset } = data.questNotices;
  useEffect(() => {
    if (freezeConsumed) push("streak freeze spent — streak held.", "ok");
    if (streakReset) push("quota missed. streak reset, penalty issued.", "bad");
  }, [freezeConsumed, streakReset, push]);

  useEffect(() => {
    router.refresh();
    // Refresh once on mount so a stale cached pane cannot outlive a logged attempt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <SystemNotification notifications={notifications} />
      <StatusView data={data} />
    </>
  );
}
