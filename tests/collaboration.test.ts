import { vi, describe, it, expect, beforeEach } from "vitest";
import { GroupService } from "../server/collaboration/services/groupService";
import { InvitationService } from "../server/collaboration/services/invitationService";
import { ItineraryService } from "../server/collaboration/services/itineraryService";
import { SuggestionService } from "../server/collaboration/services/suggestionService";
import { DiscussionService } from "../server/collaboration/services/discussionService";
import { ExpenseService } from "../server/collaboration/services/expenseService";

// Mock the mail service to prevent network calls in tests
vi.mock("../server/collaboration/services/mailService", () => {
  return {
    MailService: {
      sendInvitationEmail: vi.fn()
    }
  };
});

// Mock database module
vi.mock("../server/collaboration/services/db", () => {
  const mockPrisma = {
    $transaction: vi.fn((cb) => cb(mockPrisma)),
    tripGroup: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn()
    },
    tripMember: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn()
    },
    tripInvitation: {
      upsert: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn()
    },
    sharedItinerary: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn()
    },
    destinationSuggestion: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn()
    },
    destinationVote: {
      upsert: vi.fn(),
      delete: vi.fn()
    },
    discussionMessage: {
      create: vi.fn(),
      findMany: vi.fn()
    },
    sharedBooking: {
      create: vi.fn(),
      findMany: vi.fn()
    },
    expense: {
      create: vi.fn(),
      findMany: vi.fn()
    },
    user: {
      findUnique: vi.fn(),
      create: vi.fn()
    }
  };
  return { prisma: mockPrisma };
});

import { prisma } from "../server/collaboration/services/db";

describe("Collaborative Trip Planning Services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Group Operations", () => {
    it("should create a group and add the owner as member", async () => {
      const mockGroup = { id: "group_1", name: "Summer Trip", ownerId: "user_owner" };
      vi.mocked(prisma.tripGroup.create).mockResolvedValue(mockGroup as any);
      vi.mocked(prisma.tripMember.create).mockResolvedValue({} as any);

      const result = await GroupService.createGroup("Summer Trip", "user_owner");

      expect(prisma.tripGroup.create).toHaveBeenCalledWith({
        data: { name: "Summer Trip", ownerId: "user_owner" }
      });
      expect(prisma.tripMember.create).toHaveBeenCalledWith({
        data: { tripGroupId: "group_1", userId: "user_owner", role: "OWNER" }
      });
      expect(result).toEqual(mockGroup);
    });
  });

  describe("Invitations Operations", () => {
    it("should accept invitation and add user as editor", async () => {
      const mockInvite = { id: "invite_1", tripGroupId: "group_1", email: "user@test.com", status: "PENDING" };
      vi.mocked(prisma.tripInvitation.findUnique).mockResolvedValue(mockInvite as any);
      vi.mocked(prisma.tripMember.upsert).mockResolvedValue({ id: "member_1" } as any);
      vi.mocked(prisma.tripInvitation.update).mockResolvedValue({} as any);

      const result = await InvitationService.acceptInvitation("invite_1", "user_joiner", "USER@test.com");

      expect(prisma.tripMember.upsert).toHaveBeenCalledWith({
        where: { tripGroupId_userId: { tripGroupId: "group_1", userId: "user_joiner" } },
        update: { role: "EDITOR" },
        create: { tripGroupId: "group_1", userId: "user_joiner", role: "EDITOR" }
      });
      expect(prisma.tripInvitation.update).toHaveBeenCalledWith({
        where: { id: "invite_1" },
        data: { status: "ACCEPTED" }
      });
      expect(result).toEqual({ id: "member_1" });
    });

    it("should reject accepting an invitation that does not belong to the caller", async () => {
      const mockInvite = { id: "invite_1", tripGroupId: "group_1", email: "user@test.com", status: "PENDING" };
      vi.mocked(prisma.tripInvitation.findUnique).mockResolvedValue(mockInvite as any);

      await expect(
        InvitationService.acceptInvitation("invite_1", "attacker_user", "attacker@test.com")
      ).rejects.toThrow("Access denied. This invitation does not belong to you.");

      expect(prisma.tripMember.upsert).not.toHaveBeenCalled();
      expect(prisma.tripInvitation.update).not.toHaveBeenCalled();
    });

    it("should reject declining an invitation that does not belong to the caller", async () => {
      const mockInvite = { id: "invite_1", tripGroupId: "group_1", email: "user@test.com", status: "PENDING" };
      vi.mocked(prisma.tripInvitation.findUnique).mockResolvedValue(mockInvite as any);

      await expect(
        InvitationService.declineInvitation("invite_1", "attacker@test.com")
      ).rejects.toThrow("Access denied. This invitation does not belong to you.");

      expect(prisma.tripInvitation.update).not.toHaveBeenCalled();
    });

    it("should allow declining an invitation by the actual invitee (case-insensitive email match)", async () => {
      const mockInvite = { id: "invite_1", tripGroupId: "group_1", email: "user@test.com", status: "PENDING" };
      vi.mocked(prisma.tripInvitation.findUnique).mockResolvedValue(mockInvite as any);
      vi.mocked(prisma.tripInvitation.update).mockResolvedValue({ ...mockInvite, status: "DECLINED" } as any);

      const result = await InvitationService.declineInvitation("invite_1", "USER@test.com");

      expect(prisma.tripInvitation.update).toHaveBeenCalledWith({
        where: { id: "invite_1" },
        data: { status: "DECLINED" }
      });
      expect(result.status).toBe("DECLINED");
    });
  });

  describe("Itinerary Operations", () => {
    it("should create and update itinerary items", async () => {
      vi.mocked(prisma.sharedItinerary.create).mockResolvedValue({ id: "item_1" } as any);
      vi.mocked(prisma.sharedItinerary.update).mockResolvedValue({ id: "item_1", title: "New Title" } as any);

      const created = await ItineraryService.createItineraryItem("group_1", "Day 1", "Arrive", 1, "user_1");
      expect(prisma.sharedItinerary.create).toHaveBeenCalled();
      expect(created).toEqual({ id: "item_1" });

      const updated = await ItineraryService.updateItineraryItem("item_1", "New Title", "Arrive", 1, "user_1");
      expect(prisma.sharedItinerary.update).toHaveBeenCalled();
      expect(updated.title).toBe("New Title");
    });
  });

  describe("Suggestions & Voting", () => {
    it("should support suggestion voting constraints", async () => {
      vi.mocked(prisma.destinationVote.upsert).mockResolvedValue({} as any);
      vi.mocked(prisma.destinationSuggestion.findUnique).mockResolvedValue({ id: "sug_1", votes: [] } as any);

      await SuggestionService.voteSuggestion("sug_1", "user_1");
      expect(prisma.destinationVote.upsert).toHaveBeenCalledWith({
        where: { suggestionId_userId: { suggestionId: "sug_1", userId: "user_1" } },
        update: {},
        create: { suggestionId: "sug_1", userId: "user_1" }
      });
    });
  });

  describe("Discussion Operations", () => {
    it("should post discussion messages", async () => {
      vi.mocked(prisma.discussionMessage.create).mockResolvedValue({ id: "msg_1", message: "Hello" } as any);

      const msg = await DiscussionService.createMessage("group_1", "Hello", "user_1");
      expect(prisma.discussionMessage.create).toHaveBeenCalled();
      expect(msg.message).toBe("Hello");
    });
  });

  describe("Expense split calculations", () => {
    it("should calculate correct split balances and settlements", async () => {
      // 3 members: Alice, Bob, Charlie
      const mockMembers = [
        { userId: "alice", user: { name: "Alice", email: "alice@test.com", avatar: "" } },
        { userId: "bob", user: { name: "Bob", email: "bob@test.com", avatar: "" } },
        { userId: "charlie", user: { name: "Charlie", email: "charlie@test.com", avatar: "" } }
      ];

      // Total expense = 3000
      // Alice paid 3000, Bob paid 0, Charlie paid 0
      // Share = 1000 each
      // Balances: Alice +2000, Bob -1000, Charlie -1000
      // Transfers: Bob owes Alice 1000, Charlie owes Alice 1000
      const mockExpenses = [
        { paidBy: "alice", amount: 3000 }
      ];

      vi.mocked(prisma.tripMember.findMany).mockResolvedValue(mockMembers as any);
      vi.mocked(prisma.expense.findMany).mockResolvedValue(mockExpenses as any);

      const summary = await ExpenseService.getExpenseSummary("group_1");

      expect(summary.totalExpenses).toBe(3000);
      expect(summary.averageShare).toBe(1000);
      
      const aliceSum = summary.memberSummary.find(m => m.userId === "alice");
      const bobSum = summary.memberSummary.find(m => m.userId === "bob");
      
      expect(aliceSum?.net).toBe(2000);
      expect(bobSum?.net).toBe(-1000);

      expect(summary.transfers).toContainEqual({
        from: "bob",
        fromName: "Bob",
        to: "alice",
        toName: "Alice",
        amount: 1000
      });
      expect(summary.transfers).toContainEqual({
        from: "charlie",
        fromName: "Charlie",
        to: "alice",
        toName: "Alice",
        amount: 1000
      });
    });
  });
});
