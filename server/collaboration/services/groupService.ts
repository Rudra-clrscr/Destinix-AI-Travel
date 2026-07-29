import { prisma } from "./db";
import { GroupRole } from "@prisma/client";

export class GroupService {
  static async createGroup(name: string, ownerId: string) {
    return await prisma.$transaction(async (tx) => {
      // 1. Create the group
      const group = await tx.tripGroup.create({
        data: {
          name,
          ownerId
        }
      });

      // 2. Add owner as first member with OWNER role
      await tx.tripMember.create({
        data: {
          tripGroupId: group.id,
          userId: ownerId,
          role: GroupRole.OWNER
        }
      });

      return group;
    });
  }

  static async getGroupDetails(groupId: string) {
    return await prisma.tripGroup.findUnique({
      where: { id: groupId },
      include: {
        owner: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true }
            }
          }
        },
        invitations: true
      }
    });
  }

  static async listUserGroups(userId: string) {
    return await prisma.tripGroup.findMany({
      where: {
        members: {
          some: { userId }
        }
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true }
            }
          }
        }
      },
      orderBy: { updatedAt: "desc" }
    });
  }

  static async deleteGroup(groupId: string) {
    return await prisma.tripGroup.delete({
      where: { id: groupId }
    });
  }

  // --- Group Membership Management ---

  static async leaveGroup(groupId: string, userId: string) {
    const group = await prisma.tripGroup.findUnique({
      where: { id: groupId }
    });
    if (!group) {
      throw new Error("Trip group not found");
    }
    if (group.ownerId === userId) {
      throw new Error("Group owners cannot leave the group. Transfer ownership or delete the group instead.");
    }

    return await prisma.tripMember.delete({
      where: {
        tripGroupId_userId: {
          tripGroupId: groupId,
          userId
        }
      }
    });
  }

  static async removeMember(groupId: string, memberId: string) {
    const member = await prisma.tripMember.findUnique({
      where: { id: memberId }
    });
    if (!member || member.tripGroupId !== groupId) {
      throw new Error("Member not found in this group");
    }

    const group = await prisma.tripGroup.findUnique({
      where: { id: groupId }
    });
    if (!group) {
      throw new Error("Trip group not found");
    }
    if (group.ownerId === member.userId) {
      throw new Error("The group owner cannot be removed. Transfer ownership or delete the group instead.");
    }

    return await prisma.tripMember.delete({
      where: { id: memberId }
    });
  }

  static async updateMemberRole(groupId: string, memberId: string, role: GroupRole) {
    const allowedRoles: GroupRole[] = [GroupRole.EDITOR, GroupRole.VIEWER];
    if (!allowedRoles.includes(role)) {
      throw new Error(`Invalid role. Allowed roles: ${allowedRoles.join(", ")}`);
    }

    const member = await prisma.tripMember.findUnique({
      where: { id: memberId }
    });
    if (!member || member.tripGroupId !== groupId) {
      throw new Error("Member not found in this group");
    }

    const group = await prisma.tripGroup.findUnique({
      where: { id: groupId }
    });
    if (!group) {
      throw new Error("Trip group not found");
    }
    if (group.ownerId === member.userId) {
      throw new Error("Cannot change the group owner's role. Transfer ownership or delete the group instead.");
    }

    return await prisma.tripMember.update({
      where: { id: memberId },
      data: { role }
    });
  }
}
