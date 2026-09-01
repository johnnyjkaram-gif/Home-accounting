import { prisma } from '@/lib/prisma';
import { MONTH_NAMES } from '@/lib/constants';

export async function getMonthlyReport(householdId: string, year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  const [incomeTx, expenseTx, categories] = await Promise.all([
    prisma.transaction.findMany({ where: { householdId, type: 'INCOME', date: { gte: start, lte: end } }, include: { category: true } }),
    prisma.transaction.findMany({ where: { householdId, type: 'EXPENSE', date: { gte: start, lte: end } }, include: { category: true } }),
    prisma.category.findMany({ where: { householdId } }),
  ]);

  const totalIncome = sum(incomeTx, 'baseAmount');
  const totalExpenses = sum(expenseTx, 'baseAmount');
  const largestExpense = [...expenseTx].sort((a, b) => b.baseAmount - a.baseAmount)[0] ?? null;
  const largestIncome = [...incomeTx].sort((a, b) => b.baseAmount - a.baseAmount)[0] ?? null;

  const categoryBreakdown = groupByCategory(expenseTx, categories);

  return {
    label: `${MONTH_NAMES[month - 1]} ${year}`,
    start, end,
    totalIncome, totalExpenses, netIncome: totalIncome - totalExpenses, savings: totalIncome - totalExpenses,
    largestExpense, largestIncome, categoryBreakdown,
    incomeCount: incomeTx.length, expenseCount: expenseTx.length,
  };
}

export async function getYearlyReport(householdId: string, year: number) {
  const months = [];
  for (let m = 1; m <= 12; m++) {
    const start = new Date(year, m - 1, 1);
    const end = new Date(year, m, 0, 23, 59, 59, 999);
    const [inc, exp] = await Promise.all([
      prisma.transaction.aggregate({ where: { householdId, type: 'INCOME', date: { gte: start, lte: end } }, _sum: { baseAmount: true } }),
      prisma.transaction.aggregate({ where: { householdId, type: 'EXPENSE', date: { gte: start, lte: end } }, _sum: { baseAmount: true } }),
    ]);
    months.push({ month: MONTH_NAMES[m - 1], income: round(inc._sum.baseAmount ?? 0), expenses: round(exp._sum.baseAmount ?? 0) });
  }
  const totalIncome = round(months.reduce((s, m) => s + m.income, 0));
  const totalExpenses = round(months.reduce((s, m) => s + m.expenses, 0));
  return { year, months, totalIncome, totalExpenses, netIncome: round(totalIncome - totalExpenses) };
}

export async function getExpenseReport(householdId: string, start: Date, end: Date) {
  const [transactions, categories] = await Promise.all([
    prisma.transaction.findMany({ where: { householdId, type: 'EXPENSE', date: { gte: start, lte: end } }, include: { category: true } }),
    prisma.category.findMany({ where: { householdId } }),
  ]);
  return { start, end, categoryBreakdown: groupByCategory(transactions, categories), total: sum(transactions, 'baseAmount') };
}

export async function getAccountReport(householdId: string, start: Date, end: Date) {
  const accounts = await prisma.account.findMany({ where: { householdId } });
  const rows = await Promise.all(
    accounts.map(async (a) => {
      const [income, expense, transferOut, transferIn] = await Promise.all([
        prisma.transaction.aggregate({ where: { accountId: a.id, type: 'INCOME', date: { gte: start, lte: end } }, _sum: { amount: true } }),
        prisma.transaction.aggregate({ where: { accountId: a.id, type: 'EXPENSE', date: { gte: start, lte: end } }, _sum: { amount: true } }),
        prisma.transaction.aggregate({ where: { accountId: a.id, type: 'TRANSFER', date: { gte: start, lte: end } }, _sum: { amount: true } }),
        prisma.transaction.aggregate({ where: { toAccountId: a.id, type: 'TRANSFER', date: { gte: start, lte: end } }, _sum: { amount: true } }),
      ]);
      const txCount = await prisma.transaction.count({ where: { OR: [{ accountId: a.id }, { toAccountId: a.id }], date: { gte: start, lte: end } } });
      return {
        account: a.name, currency: a.currency,
        income: round(income._sum.amount ?? 0), expense: round(expense._sum.amount ?? 0),
        transferOut: round(transferOut._sum.amount ?? 0), transferIn: round(transferIn._sum.amount ?? 0),
        transactionCount: txCount,
      };
    }),
  );
  return { start, end, rows };
}

export async function getSavingsReport(householdId: string) {
  const goals = await prisma.savingsGoal.findMany({ where: { householdId }, include: { contributions: { orderBy: { date: 'asc' } } } });
  return goals.map((g) => ({
    name: g.name, currency: g.currency, target: g.targetAmount, current: g.currentAmount,
    progressPct: Math.round((g.currentAmount / g.targetAmount) * 100),
    contributions: g.contributions.map((c) => ({ date: c.date, amount: c.amount })),
  }));
}

export async function getDebtReport(householdId: string) {
  const debts = await prisma.debt.findMany({ where: { householdId }, include: { payments: { orderBy: { date: 'asc' } } } });
  return debts.map((d) => ({
    creditor: d.creditor, currency: d.currency, original: d.originalAmount, remaining: d.remainingAmount,
    paidOffPct: Math.round(((d.originalAmount - d.remainingAmount) / d.originalAmount) * 100),
    payments: d.payments.map((p) => ({ date: p.date, amount: p.amount })),
  }));
}

function sum(rows: { baseAmount: number }[], key: 'baseAmount') {
  return round(rows.reduce((s, r) => s + r[key], 0));
}

function groupByCategory(transactions: any[], categories: any[]) {
  const map = new Map<string, { name: string; color: string; amount: number; count: number }>();
  for (const t of transactions) {
    const cat = categories.find((c) => c.id === t.categoryId);
    const key = t.categoryId ?? 'uncategorized';
    const existing = map.get(key) ?? { name: cat?.name ?? 'Uncategorized', color: cat?.color ?? '#94a3b8', amount: 0, count: 0 };
    existing.amount += t.baseAmount;
    existing.count += 1;
    map.set(key, existing);
  }
  return Array.from(map.values()).map((v) => ({ ...v, amount: round(v.amount) })).sort((a, b) => b.amount - a.amount);
}

function round(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
