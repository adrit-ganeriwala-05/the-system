"use client";

import { Trash2 } from "lucide-react";
import { deleteAccount } from "@/app/actions/settings";
import { useConfirmDialog } from "./ConfirmDialog";
import Divider from "./system/Divider";

export default function DangerZone() {
  const { confirm, dialog } = useConfirmDialog();

  function run() {
    void confirm({
      title: "delete account",
      message:
        "Every submission, quest, streak and group you own is permanently removed. This cannot be undone.",
      confirmLabel: "delete",
      danger: true,
      action: deleteAccount,
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
        className="mt-4 flex items-center gap-1.5 border border-bad px-3 py-1.5 font-mono text-[12px] lowercase text-bad"
      >
        <Trash2 className="h-3.5 w-3.5" />
        delete account
      </button>
      {dialog}
    </div>
  );
}
