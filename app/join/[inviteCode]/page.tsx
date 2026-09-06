import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import JoinConfirm from "@/components/JoinConfirm";

export const dynamic = "force-dynamic";

export default async function JoinPage({
 params,
}: {
 params: Promise<{ inviteCode: string }>;
}) {
 // requireUserId redirects to /signin, and middleware preserves the callback URL,
 // so an invite link works even when the recipient has never signed in before.
 const userId = await requireUserId();
 const { inviteCode } = await params;

 const group = await prisma.group.findUnique({
 where: { inviteCode },
 include: { _count: { select: { members: true } } },
 });

 if (!group) {
 return (
 <Shell title="Invite not valid">
 <p className="text-sm ink-2">
 This invite link has expired or been regenerated. Ask the group owner for a new one.
 </p>
 <Link href="/groups" className="mt-4 inline-block text-sm text-edge hover:underline">
 Back to groups
 </Link>
 </Shell>
 );
 }

 const existing = await prisma.groupMembership.findUnique({
 where: { userId_groupId: { userId, groupId: group.id } },
 });
 if (existing) redirect(`/groups/${group.id}`);

 const isFull = group._count.members >= group.memberCap;

 return (
 <Shell title={`Join ${group.name}?`}>
 {isFull ? (
 <>
 <p className="text-sm text-bad">
 This group is full ({group._count.members}/{group.memberCap} members).
 </p>
 <Link href="/groups" className="mt-4 inline-block text-sm text-edge hover:underline">
 Back to groups
 </Link>
 </>
 ) : (
 <>
 <p className="text-sm ink-2">
 {group._count.members}/{group.memberCap} members. Your Level, EXP, streak, and
 questions solved will be visible to this group. Your notes and code stay private.
 </p>
 <JoinConfirm inviteCode={inviteCode} />
 </>
 )}
 </Shell>
 );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
 return (
 <main className="flex flex-1 items-center justify-center p-6">
 <div className="pane w-full max-w-md p-8 text-center">
 <p className="text-xs text-edge">group invite</p>
 <h1 className="figure mt-3 text-2xl font-bold ink">{title}</h1>
 <div className="mt-4">{children}</div>
 </div>
 </main>
 );
}
