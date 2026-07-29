import { prisma } from "./db";
import { InvitationStatus, GroupRole } from "@prisma/client";
import { MailService } from "./mailService";

export class InvitationService {
  static async createInvitation(groupId: string, email: string, invitedByUserId: string) {
    const normalizedEmail = email.toLowerCase();

    // 1. Get group details
    const group = await prisma.tripGroup.findUnique({
      where: { id: groupId }
    });
    if (!group) throw new Error("Group not found");

    const inviter = await prisma.user.findUnique({
      where: { id: invitedByUserId }
    });
    const inviterName = inviter?.name || "A travel companion";

    // 2. Check if user with this email is already a member
    const userToInvite = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (userToInvite) {
      const existingMember = await prisma.tripMember.findFirst({
        where: {
          tripGroupId: groupId,
          userId: userToInvite.id
        }
      });
      if (existingMember) {
        throw new Error("User is already a member of this group");
      }
    }

    // 3. Upsert invitation
    const invitation = await prisma.tripInvitation.upsert({
      where: {
        tripGroupId_email: {
          tripGroupId: groupId,
          email: normalizedEmail
        }
      },
      update: {
        status: InvitationStatus.PENDING,
        invitedBy: invitedByUserId
      },
      create: {
        tripGroupId: groupId,
        email: normalizedEmail,
        invitedBy: invitedByUserId,
        status: InvitationStatus.PENDING
      }
    });

    // 4. Send email in background
    MailService.sendInvitationEmail(normalizedEmail, group.name, inviterName, invitation.id);

    return invitation;
  }

  static async listPendingInvitations(email: string) {
    return await prisma.tripInvitation.findMany({
      where: {
        email: email.toLowerCase(),
        status: InvitationStatus.PENDING
      },
      include: {
        tripGroup: {
          include: {
            owner: {
              select: { name: true, email: true }
            }
          }
        }
      }
    });
  }

  static async acceptInvitation(invitationId: string, userId: string, userEmail: string) {
    return await prisma.$transaction(async (tx) => {
      // 1. Retrieve the invitation
      const invite = await tx.tripInvitation.findUnique({
        where: { id: invitationId }
      });
      if (!invite) throw new Error("Invitation not found");
      if (invite.status !== InvitationStatus.PENDING) {
        throw new Error("Invitation is no longer pending");
      }
      if (invite.email.toLowerCase() !== userEmail.toLowerCase()) {
        throw new Error("Access denied. This invitation does not belong to you.");
      }

      // 2. Add member
      const member = await tx.tripMember.upsert({
        where: {
          tripGroupId_userId: {
            tripGroupId: invite.tripGroupId,
            userId: userId
          }
        },
        update: {
          role: GroupRole.EDITOR
        },
        create: {
          tripGroupId: invite.tripGroupId,
          userId: userId,
          role: GroupRole.EDITOR
        }
      });

      // 3. Update invitation status
      await tx.tripInvitation.update({
        where: { id: invitationId },
        data: { status: InvitationStatus.ACCEPTED }
      });

      return member;
    });
  }

  static async declineInvitation(invitationId: string, userEmail: string) {
    const invite = await prisma.tripInvitation.findUnique({
      where: { id: invitationId }
    });
    if (!invite) throw new Error("Invitation not found");
    if (invite.status !== InvitationStatus.PENDING) {
      throw new Error("Invitation is no longer pending");
    }
    if (invite.email.toLowerCase() !== userEmail.toLowerCase()) {
      throw new Error("Access denied. This invitation does not belong to you.");
    }

    return await prisma.tripInvitation.update({
      where: { id: invitationId },
      data: { status: InvitationStatus.DECLINED }
    });
  }
}
