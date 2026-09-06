"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { joinGroup } from "@/app/actions/groups";

export default function JoinConfirm({ inviteCode }: { inviteCode: string }) {
 const router = useRouter();
 const [error, setError] = useState<string | null>(null);
 const [pending, startTransition] = useTransition();

 function handleJoin() {
 setError(null);
 startTransition(async () => {
 try {
 const group = await joinGroup(inviteCode);
 router.push(`/groups/${group.id}`);
 } catch (err) {
 setError(err instanceof Error ? err.message : "Couldn't join that group.");
 }
 });
 }

 return (
 <div className="mt-6">
 <button
 onClick={handleJoin}
 disabled={pending}
 className="flex w-full items-center justify-center gap-2 bg-edge px-4 py-3 text-sm font-semibold text-void hover:brightness-110 disabled:opacity-50"
 >
 {pending && <Loader2 className="h-4 w-4 animate-spin" />}
 Join Group
 </button>
 {error && <p className="mt-3 text-sm text-bad">{error}</p>}
 </div>
 );
}
