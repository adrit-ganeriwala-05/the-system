"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createGroup, joinGroup } from "@/app/actions/groups";

export default function CreateGroupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [invite, setInvite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ id: string }>) {
    setError(null);
    startTransition(async () => {
      try {
        const g = await fn();
        router.push(`/groups/${g.id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "that did not work.");
      }
    });
  }

  return (
    <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(() => createGroup(name));
        }}
        className="flex items-baseline gap-3"
      >
        <label className="label" htmlFor="g-name">
          new
        </label>
        <input
          id="g-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder="group name"
          className="w-52 border-0 border-b border-hair bg-transparent py-1 font-mono text-[12px] ink outline-none placeholder:opacity-50 focus:border-edge"
        />
        <button
          type="submit"
          disabled={pending || !name.trim()}
          className="border border-edge px-3 py-1 font-mono text-[12px] lowercase text-edge disabled:opacity-40"
        >
          create
        </button>
      </form>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const code = invite.trim().split("/").filter(Boolean).pop() ?? "";
          if (!code) return setError("paste an invite link or code.");
          run(() => joinGroup(code).then((r) => ({ id: r.id })));
        }}
        className="flex items-baseline gap-3"
      >
        <label className="label" htmlFor="g-invite">
          join
        </label>
        <input
          id="g-invite"
          value={invite}
          onChange={(e) => setInvite(e.target.value)}
          placeholder="invite link or code"
          className="w-56 border-0 border-b border-hair bg-transparent py-1 font-mono text-[12px] ink outline-none placeholder:opacity-50 focus:border-edge"
        />
        <button
          type="submit"
          disabled={pending || !invite.trim()}
          className="border border-hair px-3 py-1 font-mono text-[12px] lowercase ink-2 disabled:opacity-40"
        >
          join
        </button>
      </form>

      {error && <p className="w-full text-[12px] text-bad">{error}</p>}
    </div>
  );
}
