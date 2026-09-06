"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserIdForAction } from "@/lib/session";

function newInviteCode(): string {
  return randomBytes(8).toString("base64url");
}

async function assertOwner(groupId: string, userId: string) {
  const membership = await prisma.groupMembership.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });
  if (!membership || membership.role !== "OWNER") {
    throw new Error("Only the group owner can do that.");
  }
}

const MEMBER_CAP_MIN = 2;
const MEMBER_CAP_MAX = 10;

export async function createGroup(name: string, memberCap: number = MEMBER_CAP_MAX) {
  const userId = await requireUserIdForAction();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Group name is required.");
  if (trimmed.length > 60) throw new Error("Group name must be 60 characters or fewer.");

  const cap = Math.max(MEMBER_CAP_MIN, Math.min(MEMBER_CAP_MAX, Math.round(memberCap)));

  const group = await prisma.group.create({
    data: {
      name: trimmed,
      ownerId: userId,
      inviteCode: newInviteCode(),
      memberCap: cap,
      members: { create: { userId, role: "OWNER" } },
    },
  });

  revalidatePath("/groups");
  return { id: group.id };
}

export async function joinGroup(inviteCode: string) {
  const userId = await requireUserIdForAction();

  const group = await prisma.group.findUnique({
    where: { inviteCode },
    include: { _count: { select: { members: true } } },
  });
  if (!group) throw new Error("That invite link is no longer valid.");

  const existing = await prisma.groupMembership.findUnique({
    where: { userId_groupId: { userId, groupId: group.id } },
  });
  if (existing) return { id: group.id, alreadyMember: true };

  if (group._count.members >= group.memberCap) {
    throw new Error("That group is full.");
  }

  await prisma.groupMembership.create({
    data: { userId, groupId: group.id, role: "MEMBER" },
  });

  revalidatePath("/groups");
  return { id: group.id, alreadyMember: false };
}

export async function regenerateInviteCode(groupId: string) {
  const userId = await requireUserIdForAction();
  await assertOwner(groupId, userId);

  const group = await prisma.group.update({
    where: { id: groupId },
    data: { inviteCode: newInviteCode() },
  });

  revalidatePath(`/groups/${groupId}`);
  return { inviteCode: group.inviteCode };
}

export async function leaveGroup(groupId: string) {
  const userId = await requireUserIdForAction();

  const membership = await prisma.groupMembership.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });
  if (!membership) throw new Error("You are not a member of that group.");

  // An owner leaving would orphan the group — they must hand it over or delete it.
  if (membership.role === "OWNER") {
    throw new Error("Transfer ownership or delete the group before leaving.");
  }

  await prisma.groupMembership.delete({ where: { id: membership.id } });
  revalidatePath("/groups");
}

export async function removeMember(groupId: string, targetUserId: string) {
  const userId = await requireUserIdForAction();
  await assertOwner(groupId, userId);
  if (targetUserId === userId) throw new Error("The owner cannot remove themselves.");

  await prisma.groupMembership.deleteMany({ where: { groupId, userId: targetUserId } });
  revalidatePath(`/groups/${groupId}`);
}

export async function transferOwnership(groupId: string, targetUserId: string) {
  const userId = await requireUserIdForAction();
  await assertOwner(groupId, userId);

  const target = await prisma.groupMembership.findUnique({
    where: { userId_groupId: { userId: targetUserId, groupId } },
  });
  if (!target) throw new Error("That person is not in this group.");

  await prisma.$transaction([
    prisma.groupMembership.update({
      where: { userId_groupId: { userId: targetUserId, groupId } },
      data: { role: "OWNER" },
    }),
    prisma.groupMembership.update({
      where: { userId_groupId: { userId, groupId } },
      data: { role: "MEMBER" },
    }),
    prisma.group.update({ where: { id: groupId }, data: { ownerId: targetUserId } }),
  ]);

  revalidatePath(`/groups/${groupId}`);
}

export async function deleteGroup(groupId: string) {
  const userId = await requireUserIdForAction();
  await assertOwner(groupId, userId);

  await prisma.group.delete({ where: { id: groupId } });
  revalidatePath("/groups");
  redirect("/groups");
}
