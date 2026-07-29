import { getCurrentUser } from "../authService";

const getHeaders = () => {
  const user = getCurrentUser();
  return {
    "Content-Type": "application/json",
    ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {})
  };
};

export const listExpenses = async (groupId: string) => {
  const res = await fetch(`/api/groups/${groupId}/expenses`, {
    headers: getHeaders()
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to list expenses");
  }
  return await res.json();
};

export const getExpenseSummary = async (groupId: string) => {
  const res = await fetch(`/api/groups/${groupId}/expenses/summary`, {
    headers: getHeaders()
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch expense summary");
  }
  return await res.json();
};

export const addExpense = async (groupId: string, title: string, amount: number) => {
  const res = await fetch(`/api/groups/${groupId}/expenses`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ title, amount })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to add expense");
  }
  return await res.json();
};

export const updateExpense = async (id: string, tripGroupId: string, title: string, amount: number) => {
  const res = await fetch(`/api/expenses/${id}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify({ title, amount, tripGroupId })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to update expense");
  }
  return await res.json();
};

export const deleteExpense = async (id: string, tripGroupId: string) => {
  const res = await fetch(`/api/expenses/${id}?tripGroupId=${tripGroupId}`, {
    method: "DELETE",
    headers: getHeaders()
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to delete expense");
  }
  return await res.json();
};
