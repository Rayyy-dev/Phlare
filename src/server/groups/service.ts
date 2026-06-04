import { prisma } from "@/server/db";
import { recordAudit } from "@/server/audit/log";
import { groupSchema, type GroupInput } from "@/lib/validation";
import type { Group } from "@prisma/client";

/** Raised when a group name already belongs to an *active* group. */
export class DuplicateGroupError extends Error {
  constructor(public existingId: string) {
    super("A group with this name already exists.");
  }
}

/**
 * Groups with their active-member count. Soft-deleted recipients are excluded
 * from the count so it matches what targeting will actually use.
 */
export async function listGroups() {
  const groups = await prisma.group.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { members: { where: { recipient: { deletedAt: null } } } } },
    },
  });
  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    description: g.description,
    memberCount: g._count.members,
  }));
}

export async function getGroupWithMembers(id: string) {
  const group = await prisma.group.findFirst({
    where: { id, deletedAt: null },
    include: {
      members: {
        where: { recipient: { deletedAt: null } },
        include: { recipient: true },
        orderBy: { recipient: { lastName: "asc" } },
      },
    },
  });
  if (!group) return null;

  const memberIds = new Set(group.members.map((m) => m.recipientId));
  // Active recipients not yet in this group, offered in the "add member" picker.
  const candidates = await prisma.recipient.findMany({
    where: { deletedAt: null, id: { notIn: [...memberIds] } },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return { group, members: group.members.map((m) => m.recipient), candidates };
}

export async function createGroup(
  input: GroupInput,
  actorId: string
): Promise<Group> {
  const data = groupSchema.parse(input);

  const existing = await prisma.group.findUnique({ where: { name: data.name } });
  if (existing) {
    if (existing.deletedAt) {
      // Reuse the soft-deleted record with the same name rather than colliding
      // on the unique constraint — mirrors recipient reactivation.
      const revived = await prisma.group.update({
        where: { id: existing.id },
        data: { ...data, deletedAt: null },
      });
      await recordAudit({
        actorAdminId: actorId,
        action: "group.reactivated",
        entityType: "Group",
        entityId: revived.id,
      });
      return revived;
    }
    throw new DuplicateGroupError(existing.id);
  }

  const group = await prisma.group.create({ data });
  await recordAudit({
    actorAdminId: actorId,
    action: "group.created",
    entityType: "Group",
    entityId: group.id,
    details: { name: group.name },
  });
  return group;
}

export async function updateGroup(
  id: string,
  input: GroupInput,
  actorId: string
): Promise<Group> {
  const data = groupSchema.parse(input);

  // Include soft-deleted groups: the name unique constraint spans them, so a
  // rename onto a deleted group's name must be rejected, not left to crash.
  const clash = await prisma.group.findFirst({
    where: { name: data.name, id: { not: id } },
  });
  if (clash) throw new DuplicateGroupError(clash.id);

  const group = await prisma.group.update({ where: { id }, data });
  await recordAudit({
    actorAdminId: actorId,
    action: "group.updated",
    entityType: "Group",
    entityId: id,
  });
  return group;
}

export async function softDeleteGroup(id: string, actorId: string): Promise<void> {
  // Remove membership rows so the join table doesn't retain a deleted group.
  await prisma.$transaction([
    prisma.groupMember.deleteMany({ where: { groupId: id } }),
    prisma.group.update({ where: { id }, data: { deletedAt: new Date() } }),
  ]);
  await recordAudit({
    actorAdminId: actorId,
    action: "group.deleted",
    entityType: "Group",
    entityId: id,
  });
}

export async function addMembers(
  groupId: string,
  recipientIds: string[],
  actorId: string
): Promise<void> {
  if (recipientIds.length === 0) return;
  await prisma.groupMember.createMany({
    data: recipientIds.map((recipientId) => ({ groupId, recipientId })),
    skipDuplicates: true,
  });
  await recordAudit({
    actorAdminId: actorId,
    action: "group.members_added",
    entityType: "Group",
    entityId: groupId,
    details: { count: recipientIds.length },
  });
}

export async function removeMember(
  groupId: string,
  recipientId: string,
  actorId: string
): Promise<void> {
  await prisma.groupMember.delete({
    where: { groupId_recipientId: { groupId, recipientId } },
  });
  await recordAudit({
    actorAdminId: actorId,
    action: "group.member_removed",
    entityType: "Group",
    entityId: groupId,
    details: { recipientId },
  });
}
