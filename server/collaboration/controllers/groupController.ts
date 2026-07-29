import { Response } from "express";
import { GroupService } from "../services/groupService";

export class GroupController {
  static async createGroup(req: any, res: Response) {
    try {
      const { name } = req.body;
      const ownerId = req.user.id;
      const group = await GroupService.createGroup(name, ownerId);
      return res.status(201).json(group);
    } catch (error: any) {
      console.error("Create group controller error:", error);
      return res.status(500).json({ error: error.message || "Failed to create group" });
    }
  }

  static async getGroupDetails(req: any, res: Response) {
    try {
      const groupId = req.params.id;
      const group = await GroupService.getGroupDetails(groupId);
      if (!group) return res.status(404).json({ error: "Group not found" });
      return res.json(group);
    } catch (error: any) {
      console.error("Get group details error:", error);
      return res.status(500).json({ error: error.message || "Failed to fetch group details" });
    }
  }

  static async listUserGroups(req: any, res: Response) {
    try {
      const userId = req.user.id;
      const groups = await GroupService.listUserGroups(userId);
      return res.json(groups);
    } catch (error: any) {
      console.error("List user groups error:", error);
      return res.status(500).json({ error: error.message || "Failed to fetch user groups" });
    }
  }

  static async deleteGroup(req: any, res: Response) {
    try {
      const groupId = req.params.id;
      await GroupService.deleteGroup(groupId);
      return res.json({ success: true, message: "Group deleted successfully" });
    } catch (error: any) {
      console.error("Delete group error:", error);
      return res.status(500).json({ error: error.message || "Failed to delete group" });
    }
  }

  // --- Group Membership Management ---

  static async leaveGroup(req: any, res: Response) {
    try {
      const groupId = req.params.id;
      const userId = req.user.id;
      await GroupService.leaveGroup(groupId, userId);
      return res.json({ success: true, message: "You have left the group" });
    } catch (error: any) {
      console.error("Leave group error:", error);
      const status = error.message?.includes("cannot leave") ? 403 : 500;
      return res.status(status).json({ error: error.message || "Failed to leave group" });
    }
  }

  static async removeMember(req: any, res: Response) {
    try {
      const groupId = req.params.id;
      const { memberId } = req.params;
      await GroupService.removeMember(groupId, memberId);
      return res.json({ success: true, message: "Member removed from group" });
    } catch (error: any) {
      console.error("Remove member error:", error);
      const status = error.message?.includes("cannot be removed")
        ? 403
        : error.message?.includes("not found")
        ? 404
        : 500;
      return res.status(status).json({ error: error.message || "Failed to remove member" });
    }
  }

  static async updateMemberRole(req: any, res: Response) {
    try {
      const groupId = req.params.id;
      const { memberId } = req.params;
      const { role } = req.body;
      const updated = await GroupService.updateMemberRole(groupId, memberId, role);
      return res.json(updated);
    } catch (error: any) {
      console.error("Update member role error:", error);
      const status = error.message?.includes("Cannot change")
        ? 403
        : error.message?.includes("not found")
        ? 404
        : error.message?.includes("Invalid role")
        ? 400
        : 500;
      return res.status(status).json({ error: error.message || "Failed to update member role" });
    }
  }
}
