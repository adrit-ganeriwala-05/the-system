"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, RefreshCw, Trash2, UserMinus, Crown } from "lucide-react";
import {
 deleteGroup,
 leaveGroup,
 regenerateInviteCode,
 removeMember,
 transferOwnership,
} from "@/app/actions/groups";
import { useConfirmDialog } from "./ConfirmDialog";

type Member = { userId: string; name: string | null; role: "OWNER" | "MEMBER" };

export default function GroupSettings({
 groupId,
 inviteCode,
 members,
 viewerId,
 isOwner,
 memberCap,
 baseUrl,
}: {
 groupId: string;
 inviteCode: string;
 members: Member[];
 viewerId: string;
 isOwner: boolean;
 memberCap: number;
 baseUrl: string;
}) {
 const router = useRouter();
 const [code, setCode] = useState(inviteCode);
 const [copied, setCopied] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [pending, startTransition] = useTransition();
 const { confirm, dialog } = useConfirmDialog();

 const inviteUrl = `${baseUrl}/join/${code}`;

 async function copyLink() {
 try {
 await navigator.clipboard.writeText(inviteUrl);
 setCopied(true);
 setTimeout(() => setCopied(false), 2000);
 } catch {
 setError("Couldn't copy to clipboard — select and copy the link manually.");
 }
 }

 function run(fn: () => Promise<unknown>) {
 setError(null);
 startTransition(async () => {
 try {
 await fn();
 router.refresh();
 } catch (e) {
 setError(e instanceof Error ? e.message : "Something went wrong.");
 }
 });
 }

 return (
 <section className="pane p-5">
 <h2 className="mb-4 font-display text-sm font-semibold text-edge">group settings</h2>

 {isOwner && (
 <div className="mb-6">
 <p className="mb-2 text-[10px] ink-2">Invite Link</p>
 <div className="flex flex-wrap items-center gap-2">
 <code className="min-w-0 flex-1 truncate border border-hair bg-transparent px-3 py-2 font-mono text-xs ink-2">
 {inviteUrl}
 </code>
 <button
 onClick={copyLink}
 className="flex items-center gap-1.5 border border-edge px-3 py-2 text-xs text-edge hover:bg-transparent"
 >
 {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
 {copied ? "Copied" : "Copy"}
 </button>
 <button
 disabled={pending}
 onClick={() =>
 run(async () => {
 const res = await regenerateInviteCode(groupId);
 setCode(res.inviteCode);
 })
 }
 className="flex items-center gap-1.5 border border-hair px-3 py-2 text-xs ink-2 hover:bg-transparent disabled:opacity-50"
 >
 <RefreshCw className="h-3.5 w-3.5" />
 Regenerate
 </button>
 </div>
 <p className="mt-2 text-xs ink-3">
 Regenerating instantly invalidates the old link.
 </p>
 </div>
 )}

 <div>
 <p className="mb-2 text-[10px] ink-2">
 Members ({members.length}/{memberCap})
 </p>
 <ul className="divide-y divide-hair border border-hair">
 {members.map((m) => (
 <li key={m.userId} className="flex items-center justify-between gap-3 px-3 py-2.5">
 <span className="flex items-center gap-2 text-sm ink">
 {m.name ?? "Unnamed LeetCoder"}
 {m.role === "OWNER" && <Crown className="h-3.5 w-3.5 text-rank" aria-label="Owner" />}
 {m.userId === viewerId && <span className="text-[10px] text-edge">you</span>}
 </span>
 {isOwner && m.userId !== viewerId && (
 <span className="flex items-center gap-2">
 <button
 disabled={pending}
 onClick={() => run(() => transferOwnership(groupId, m.userId))}
 className=" border border-hair px-2 py-1 text-[11px] ink-2 hover:bg-transparent disabled:opacity-50"
 >
 Make owner
 </button>
 <button
 disabled={pending}
 onClick={() => run(() => removeMember(groupId, m.userId))}
 className="flex items-center gap-1 border border-bad px-2 py-1 text-[11px] text-bad hover:bg-transparent disabled:opacity-50"
 >
 <UserMinus className="h-3 w-3" />
 Remove
 </button>
 </span>
 )}
 </li>
 ))}
 </ul>
 </div>

 {error && <p className="mt-4 text-sm text-bad">{error}</p>}

 <div className="mt-6 flex flex-wrap gap-3 border-t border-hair pt-4">
 {isOwner ? (
 <button
 disabled={pending}
 onClick={async () => {
 const ok = await confirm({
 title: "delete group",
 message: "All memberships are removed. This can't be undone.",
 confirmLabel: "delete",
 danger: true,
 });
 if (ok) run(() => deleteGroup(groupId));
 }}
 className="flex items-center gap-1.5 border border-bad px-3 py-2 text-xs text-bad hover:bg-transparent disabled:opacity-50"
 >
 <Trash2 className="h-3.5 w-3.5" />
 Delete group
 </button>
 ) : (
 <button
 disabled={pending}
 onClick={() => run(async () => {
 await leaveGroup(groupId);
 router.push("/groups");
 })}
 className=" border border-hair px-3 py-2 text-xs ink-2 hover:bg-transparent disabled:opacity-50"
 >
 Leave group
 </button>
 )}
 </div>
 {dialog}
 </section>
 );
}
