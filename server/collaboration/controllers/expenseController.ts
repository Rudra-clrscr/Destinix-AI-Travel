import { Response } from "express";
import { ExpenseService } from "../services/expenseService";

export class ExpenseController {
  static async addExpense(req: any, res: Response) {
    try {
      const groupId = req.params.id;
      const { title, amount } = req.body;
      const paidBy = req.user.id;

      const expense = await ExpenseService.addExpense(groupId, title, Number(amount), paidBy);

      if (req.io) {
        req.io.to(groupId).emit("expense:created", expense);
      }

      return res.status(201).json(expense);
    } catch (error: any) {
      console.error("Add expense error:", error);
      return res.status(500).json({ error: error.message || "Failed to add expense" });
    }
  }

  static async listExpenses(req: any, res: Response) {
    try {
      const groupId = req.params.id;
      const expenses = await ExpenseService.listExpenses(groupId);
      return res.json(expenses);
    } catch (error: any) {
      console.error("List expenses error:", error);
      return res.status(500).json({ error: error.message || "Failed to fetch expenses" });
    }
  }

  static async getExpenseSummary(req: any, res: Response) {
    try {
      const groupId = req.params.id;
      const summary = await ExpenseService.getExpenseSummary(groupId);
      return res.json(summary);
    } catch (error: any) {
      console.error("Get expense summary error:", error);
      return res.status(500).json({ error: error.message || "Failed to fetch expense summary" });
    }
  }

  // Editing/deleting an expense is restricted to the original payer or the
  // group owner (not just any OWNER/EDITOR role holder), so this check is
  // done here rather than via checkGroupRole in the route middleware.
  static async updateExpense(req: any, res: Response) {
    try {
      const expenseId = req.params.id;
      const { title, amount, tripGroupId } = req.body;
      const userId = req.user.id;

      const expense = await ExpenseService.getExpenseById(expenseId);
      if (!expense) {
        return res.status(404).json({ error: "Expense not found" });
      }

      const isPayer = expense.paidBy === userId;
      const isGroupOwner = expense.tripGroup?.ownerId === userId;

      if (!isPayer && !isGroupOwner) {
        return res.status(403).json({
          error: "Access denied. Only the original payer or the group owner can edit this expense."
        });
      }

      const updated = await ExpenseService.updateExpense(expenseId, title, Number(amount));

      if (req.io && tripGroupId) {
        req.io.to(tripGroupId).emit("expense:updated", updated);
      }

      return res.json(updated);
    } catch (error: any) {
      console.error("Update expense error:", error);
      return res.status(500).json({ error: error.message || "Failed to update expense" });
    }
  }

  static async deleteExpense(req: any, res: Response) {
    try {
      const expenseId = req.params.id;
      const { tripGroupId } = req.query;
      const userId = req.user.id;

      const expense = await ExpenseService.getExpenseById(expenseId);
      if (!expense) {
        return res.status(404).json({ error: "Expense not found" });
      }

      const isPayer = expense.paidBy === userId;
      const isGroupOwner = expense.tripGroup?.ownerId === userId;

      if (!isPayer && !isGroupOwner) {
        return res.status(403).json({
          error: "Access denied. Only the original payer or the group owner can delete this expense."
        });
      }

      await ExpenseService.deleteExpense(expenseId);

      if (req.io && tripGroupId) {
        req.io.to(tripGroupId as string).emit("expense:updated", { id: expenseId, deleted: true });
      }

      return res.json({ success: true, message: "Expense deleted" });
    } catch (error: any) {
      console.error("Delete expense error:", error);
      return res.status(500).json({ error: error.message || "Failed to delete expense" });
    }
  }
}
