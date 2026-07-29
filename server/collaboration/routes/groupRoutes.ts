import { Router } from "express";
import { GroupController } from "../controllers/groupController";
import { InvitationController } from "../controllers/invitationController";
import { ItineraryController } from "../controllers/itineraryController";
import { SuggestionController } from "../controllers/suggestionController";
import { DiscussionController } from "../controllers/discussionController";
import { BookingController } from "../controllers/bookingController";
import { ExpenseController } from "../controllers/expenseController";

import { authenticate } from "../middleware/authenticate";
import { checkGroupMembership } from "../middleware/checkGroupMembership";
import { checkGroupRole } from "../middleware/checkGroupRole";
import { validateBody } from "../validators/collaborationValidator";
import { prisma } from "../services/db";

const router = Router();

// User Sync (Bridges the frontend mock auth into the PostgreSQL DB)
router.post(
  "/auth/sync",
  authenticate,
  validateBody(["name"]),
  async (req: any, res: any) => {
    try {
      const { name, avatar, id } = req.body;
      const user = await prisma.user.upsert({
        where: { email: req.user.email },
        update: {
          name,
          avatar: avatar || null
        },
        create: {
          id: id || req.user.id,
          email: req.user.email,
          name,
          avatar: avatar || null
        }
      });
      return res.json(user);
    } catch (error: any) {
      console.error("User sync error:", error);
      return res.status(500).json({ error: error.message || "Failed to sync user" });
    }
  }
);

// --- Group Management ---
router.post("/groups", authenticate, validateBody(["name"]), GroupController.createGroup);
router.get("/groups/user/my-groups", authenticate, GroupController.listUserGroups);
router.get("/groups/:id", authenticate, checkGroupMembership, GroupController.getGroupDetails);
router.delete("/groups/:id", authenticate, checkGroupMembership, checkGroupRole(["OWNER"]), GroupController.deleteGroup);

// --- Group Membership Management ---
router.delete(
  "/groups/:id/leave",
  authenticate,
  checkGroupMembership,
  GroupController.leaveGroup
);
router.delete(
  "/groups/:id/members/:memberId",
  authenticate,
  checkGroupMembership,
  checkGroupRole(["OWNER"]),
  GroupController.removeMember
);
router.patch(
  "/groups/:id/members/:memberId/role",
  authenticate,
  checkGroupMembership,
  checkGroupRole(["OWNER"]),
  validateBody(["role"]),
  GroupController.updateMemberRole
);

// --- Invitations ---
router.post(
  "/groups/:id/invite",
  authenticate,
  checkGroupMembership,
  checkGroupRole(["OWNER", "EDITOR"]),
  validateBody(["email"]),
  InvitationController.inviteMember
);
router.get("/invitations", authenticate, InvitationController.listPendingInvitations);
router.post("/invitations/:id/accept", authenticate, InvitationController.acceptInvitation);
router.post("/invitations/:id/decline", authenticate, InvitationController.declineInvitation);

// --- Shared Itinerary ---
router.get("/groups/:id/itinerary", authenticate, checkGroupMembership, ItineraryController.getItinerary);
router.post(
  "/groups/:id/itinerary",
  authenticate,
  checkGroupMembership,
  checkGroupRole(["OWNER", "EDITOR"]),
  validateBody(["title", "dayNumber"]),
  ItineraryController.createItineraryItem
);
router.put(
  "/itinerary/:id",
  authenticate,
  checkGroupMembership,
  checkGroupRole(["OWNER", "EDITOR"]),
  validateBody(["title", "dayNumber", "tripGroupId"]),
  ItineraryController.updateItineraryItem
);
router.delete(
  "/itinerary/:id",
  authenticate,
  checkGroupMembership,
  checkGroupRole(["OWNER", "EDITOR"]),
  ItineraryController.deleteItineraryItem
);

// --- Destination Suggestions ---
router.get("/groups/:id/suggestions", authenticate, checkGroupMembership, SuggestionController.getSuggestions);
router.post(
  "/groups/:id/suggestions",
  authenticate,
  checkGroupMembership,
  checkGroupRole(["OWNER", "EDITOR"]),
  validateBody(["destinationName"]),
  SuggestionController.createSuggestion
);
router.post(
  "/suggestions/:id/vote",
  authenticate,
  checkGroupMembership,
  validateBody(["tripGroupId"]),
  SuggestionController.voteSuggestion
);
router.delete(
  "/suggestions/:id/vote",
  authenticate,
  checkGroupMembership,
  SuggestionController.removeVote
);

// --- Discussion Board ---
router.get("/groups/:id/messages", authenticate, checkGroupMembership, DiscussionController.getMessages);
router.post(
  "/groups/:id/messages",
  authenticate,
  checkGroupMembership,
  validateBody(["message"]),
  DiscussionController.createMessage
);

// --- Shared Bookings ---
router.get("/groups/:id/bookings", authenticate, checkGroupMembership, BookingController.getBookings);
router.post(
  "/groups/:id/bookings",
  authenticate,
  checkGroupMembership,
  checkGroupRole(["OWNER", "EDITOR"]),
  validateBody(["bookingReference", "bookingType", "amount", "status"]),
  BookingController.createBookingRecord
);

// --- Expense Tracking ---
router.get("/groups/:id/expenses", authenticate, checkGroupMembership, ExpenseController.listExpenses);
router.get("/groups/:id/expenses/summary", authenticate, checkGroupMembership, ExpenseController.getExpenseSummary);
router.post(
  "/groups/:id/expenses",
  authenticate,
  checkGroupMembership,
  validateBody(["title", "amount"]),
  ExpenseController.addExpense
);

export default router;
