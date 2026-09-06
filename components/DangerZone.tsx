"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteAccount } from "@/app/actions/settings";
import { useConfirmDialog } from "./ConfirmDialog";
import Divider from "./system/Divider";

export default function DangerZone() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { confirm, dialog } = useConfirmDialog();

  async function run() {
    const ok = await confirm({
      title: "delete account",
      message:
        "Every submission, quest, streak and group you own is permanently removed. This cannot be undone.",
      confirmLabel: "delete",
      danger: true,
    });
    if (!ok) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteAccount();
      } catch (e) {
        setError(e instanceof Error ? e.message : "could not delete the account.");
      }
    });
  }

  return (
    <div>
      <Divider label="danger zone" />
      <p className="mt-3 text-sm ink-2">
        Deleting your account removes all progress, submissions, and groups you own. There is
        no way back from this.
      </p>
      <button
        onClick={run}
        disabled={pending}
        className="mt-4 flex items-center gap-1.5 border border-bad px-3 py-1.5 font-mono text-[12px] lowercase text-bad disabled:opacity-40"
      >
        <Trash2 className="h-3.5 w-3.5" />
        {pending ? "deleting…" : "delete account"}
      </button>
      {error && <p className="mt-3 text-[12px] text-bad">{error}</p>}
      {dialog}
    </div>
  );
}
