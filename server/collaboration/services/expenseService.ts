import { prisma } from "./db";

export class ExpenseService {
  static async addExpense(groupId: string, title: string, amount: number, paidByUserId: string) {
    return await prisma.expense.create({
      data: {
        tripGroupId: groupId,
        title,
        amount,
        paidBy: paidByUserId
      },
      include: {
        payer: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      }
    });
  }

  static async listExpenses(groupId: string) {
    return await prisma.expense.findMany({
      where: { tripGroupId: groupId },
      include: {
        payer: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  static async getExpenseById(id: string) {
    return await prisma.expense.findUnique({
      where: { id },
      include: {
        payer: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        tripGroup: true
      }
    });
  }

  static async updateExpense(id: string, title: string, amount: number) {
    return await prisma.expense.update({
      where: { id },
      data: { title, amount },
      include: {
        payer: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      }
    });
  }

  static async deleteExpense(id: string) {
    return await prisma.expense.delete({
      where: { id }
    });
  }

  static async getExpenseSummary(groupId: string) {
    // 1. Fetch group members
    const members = await prisma.tripMember.findMany({
      where: { tripGroupId: groupId },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      }
    });

    if (members.length === 0) {
      return {
        totalExpenses: 0,
        averageShare: 0,
        memberSummary: [],
        transfers: []
      };
    }

    // 2. Fetch all expenses
    const expenses = await prisma.expense.findMany({
      where: { tripGroupId: groupId }
    });

    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const numMembers = members.length;
    const averageShare = totalExpenses / numMembers;

    // 3. Compute what each user has paid
    const paidByMember: Record<string, number> = {};
    members.forEach(m => {
      paidByMember[m.userId] = 0;
    });
    expenses.forEach(exp => {
      if (paidByMember[exp.paidBy] !== undefined) {
        paidByMember[exp.paidBy] += exp.amount;
      } else {
        // Fallback in case a user is no longer a member or wasn't tracked
        paidByMember[exp.paidBy] = exp.amount;
      }
    });

    // 4. Create member balances list
    const balances = members.map(m => {
      const paid = paidByMember[m.userId] || 0;
      const net = paid - averageShare;
      return {
        userId: m.userId,
        name: m.user.name,
        avatar: m.user.avatar,
        email: m.user.email,
        paid,
        net
      };
    });

    // 5. Calculate transfers (settlements)
    const transfers: Array<{ from: string; fromName: string; to: string; toName: string; amount: number }> = [];
    
    // Split into debtors (net < 0) and creditors (net > 0)
    const debtors = balances
      .filter(b => b.net < -0.01)
      .map(b => ({ ...b, net: Math.abs(b.net) }))
      .sort((a, b) => b.net - a.net); // Sort descending to solve largest balances first
      
    const creditors = balances
      .filter(b => b.net > 0.01)
      .map(b => ({ ...b }))
      .sort((a, b) => b.net - a.net);

    let dIdx = 0;
    let cIdx = 0;

    while (dIdx < debtors.length && cIdx < creditors.length) {
      const debtor = debtors[dIdx];
      const creditor = creditors[cIdx];

      const transferAmount = Math.min(debtor.net, creditor.net);
      
      if (transferAmount > 0.01) {
        transfers.push({
          from: debtor.userId,
          fromName: debtor.name,
          to: creditor.userId,
          toName: creditor.name,
          amount: parseFloat(transferAmount.toFixed(2))
        });
      }

      debtor.net -= transferAmount;
      creditor.net -= transferAmount;

      if (debtor.net < 0.01) dIdx++;
      if (creditor.net < 0.01) cIdx++;
    }

    return {
      totalExpenses: parseFloat(totalExpenses.toFixed(2)),
      averageShare: parseFloat(averageShare.toFixed(2)),
      memberSummary: balances.map(b => ({
        ...b,
        paid: parseFloat(b.paid.toFixed(2)),
        net: parseFloat(b.net.toFixed(2))
      })),
      transfers
    };
  }
}
