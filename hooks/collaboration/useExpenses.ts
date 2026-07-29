import { useState, useEffect } from "react";
import * as expenseService from "../../services/collaboration/expenseService";
import { getSocket } from "../../services/collaboration/socket";

export const useExpenses = (groupId: string | undefined) => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    totalExpenses: 0,
    averageShare: 0,
    memberSummary: [],
    transfers: []
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExpensesAndSummary = async () => {
    if (!groupId) return;
    setLoading(true);
    setError(null);
    try {
      const expData = await expenseService.listExpenses(groupId);
      const sumData = await expenseService.getExpenseSummary(groupId);
      setExpenses(expData);
      setSummary(sumData);
    } catch (err: any) {
      setError(err.message || "Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

  const addExpense = async (title: string, amount: number) => {
    if (!groupId) return;
    try {
      return await expenseService.addExpense(groupId, title, amount);
    } catch (err: any) {
      throw new Error(err.message || "Failed to add expense");
    }
  };

  const updateExpense = async (id: string, title: string, amount: number) => {
    if (!groupId) return;
    try {
      return await expenseService.updateExpense(id, groupId, title, amount);
    } catch (err: any) {
      throw new Error(err.message || "Failed to update expense");
    }
  };

  const deleteExpense = async (id: string) => {
    if (!groupId) return;
    try {
      await expenseService.deleteExpense(id, groupId);
    } catch (err: any) {
      throw new Error(err.message || "Failed to delete expense");
    }
  };

  useEffect(() => {
    if (!groupId) return;

    fetchExpensesAndSummary();

    const socket = getSocket();
    socket.emit("group:join", groupId);

    const handleCreated = () => {
      // Re-fetch all expenses and compute summaries to keep them aligned
      fetchExpensesAndSummary();
    };

    const handleUpdated = () => {
      // Covers both edits and deletes; re-fetch to keep balances/settlements accurate
      fetchExpensesAndSummary();
    };

    socket.on("expense:created", handleCreated);
    socket.on("expense:updated", handleUpdated);

    return () => {
      socket.off("expense:created", handleCreated);
      socket.off("expense:updated", handleUpdated);
    };
  }, [groupId]);

  return {
    expenses,
    summary,
    loading,
    error,
    fetchExpensesAndSummary,
    addExpense,
    updateExpense,
    deleteExpense
  };
};
