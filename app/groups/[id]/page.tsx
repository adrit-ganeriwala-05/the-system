import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOnboardedUserId } from "@/lib/session";
import { getGroupLeaderboard } from "@/lib/leaderboard";
import Divider from "@/components/system/Divider";
import GroupLeaderboard from "@/components/GroupLeaderboard";
import GroupSettings from "@/components/GroupSettings";

export const dynamic = "force-dynamic";

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
 const userId = await requireOnboardedUserId();
 const { id } = await params;

 // Membership is the authorization check: a non-member gets a 404, not a peek.
 const membership = await prisma.groupMembership.findUnique({
 where: { userId_groupId: { userId, groupId: id } },
 include: { group: true },
 });
 if (!membership) notFound();

 const [leaderboard, members] = await Promise.all([
 getGroupLeaderboard(id),
 prisma.groupMembership.findMany({
 where: { groupId: id },
 include: { user: { select: { id: true, name: true } } },
 orderBy: { joinedAt: "asc" },
 }),
 ]);

 const h = await headers();
 const host = h.get("host") ?? "localhost:3000";
 const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
 const baseUrl = `${proto}://${host}`;

  return (
    <div className="px-5 pb-8 pt-6 sm:px-7">
      <div className="boot-section" style={{ ["--i" as string]: 0 }}>
        <Divider
          label={membership.group.name.toLowerCase()}
          right={
            <Link href="/groups" className="font-mono text-[11px] lowercase ink-3">
              ← all groups
            </Link>
          }
        />
      </div>

      <div className="boot-section mt-7" style={{ ["--i" as string]: 1 }}>
        <GroupLeaderboard
          allTime={leaderboard.allTime}
          weekly={leaderboard.weekly}
          viewerId={userId}
        />
      </div>

      <div className="boot-section mt-7" style={{ ["--i" as string]: 2 }}>
        <GroupSettings
          groupId={id}
          inviteCode={membership.group.inviteCode}
          memberCap={membership.group.memberCap}
          viewerId={userId}
          isOwner={membership.role === "OWNER"}
          baseUrl={baseUrl}
          members={members.map((m) => ({ userId: m.userId, name: m.user.name, role: m.role }))}
        />
      </div>
    </div>
  );
}
