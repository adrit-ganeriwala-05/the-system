import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireOnboardedUserId } from "@/lib/session";
import Divider from "@/components/system/Divider";
import CreateGroupForm from "@/components/CreateGroupForm";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const userId = await requireOnboardedUserId();

  const memberships = await prisma.groupMembership.findMany({
    where: { userId },
    include: { group: { include: { _count: { select: { members: true } } } } },
    orderBy: { joinedAt: "asc" },
  });

  return (
    <div className="px-5 pb-8 pt-6 sm:px-7">
      <div className="boot-section" style={{ ["--i" as string]: 0 }}>
        <Divider label="groups" right={`${memberships.length} joined`} />
        <p className="mt-3 text-sm ink-2">
          Leaderboards are per group and rank by EXP and questions solved.
        </p>
      </div>

      <div className="boot-section mt-7" style={{ ["--i" as string]: 1 }}>
        <Divider label="join or create" />
        <CreateGroupForm />
      </div>

      <div className="boot-section mt-7" style={{ ["--i" as string]: 2 }}>
        <Divider label="your groups" />
        {memberships.length === 0 ? (
          <p className="mt-4 text-sm ink-3">
            not in any groups yet — create one above, or open an invite link.
          </p>
        ) : (
          <ul className="mt-3">
            {memberships.map((m) => (
              <li key={m.groupId} className="border-b border-hair">
                <Link
                  href={`/groups/${m.groupId}`}
                  className="flex items-baseline gap-4 py-2.5"
                >
                  <span className="flex-1 text-[14px] lowercase ink">{m.group.name}</span>
                  {m.role === "OWNER" && (
                    <span className="figure text-[11px] text-rank">owner</span>
                  )}
                  <span className="figure text-[11px] ink-3">
                    {m.group._count.members}/{m.group.memberCap}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
