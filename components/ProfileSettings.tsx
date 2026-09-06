"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setDisplayName } from "@/app/actions/settings";
import Divider from "./system/Divider";

export default function ProfileSettings({ name }: { name: string | null }) {
  const router = useRouter();
  const [value, setValue] = useState(name ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await setDisplayName(value);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "could not save that.");
      }
    });
  }

  return (
    <div>
      <Divider label="profile" />
      <div className="mt-4 flex flex-wrap items-baseline gap-4">
        <label className="flex items-baseline gap-3">
          <span className="label">display name</span>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={40}
            placeholder="unnamed"
            className="w-56 border-0 border-b border-hair bg-transparent py-1 font-mono text-[12px] ink outline-none placeholder:opacity-50 focus:border-edge"
          />
        </label>
        <button
          onClick={save}
          disabled={pending || !value.trim()}
          className="border border-edge px-3 py-1 font-mono text-[12px] lowercase text-edge disabled:opacity-40"
        >
          {pending ? "saving…" : "save"}
        </button>
        {saved && <span className="font-mono text-[12px] text-ok">saved</span>}
      </div>
      {error && <p className="mt-2 text-[12px] text-bad">{error}</p>}
    </div>
  );
}
