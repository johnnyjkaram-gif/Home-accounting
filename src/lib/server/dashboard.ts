import { prisma } from '@/lib/prisma';
import { getAllAccountBalances } from '@/lib/server/accounts';
import { tryConvertToBase } from '@/lib/server/currency-helper';
import { computeBillStatus } from '@/lib/recurrence';
import { generateInsights, type Insight } from '@/lib/insights';
import { startOfMonth, endOfMonth } from '@/lib/utils';

export type PeriodKey = 'this_month' | 'last_month' | 'last_30' | 'last_90' | 'this_year' | 'last_year';

export function resolvePeriod(key: PeriodKey, now: Date = new Date()): { start: Date; end: Date; label: string } {
  switch (key) {
    case 'last_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { start, end, label: 'Last month' };
    }
    case 'last_30':
      return { start: new Date(now.getTime() - 30 * 86400000), end: now, label: 'Last 30 days' };
    case 'last_90':
      return { start: new Date(now.getTime() - 90 * 86400000), end: now, label: 'Last 90 days' };
    case 'this_year':
      return { start: new Date(now.getFullYear(), 0, 1), end: now, label: 'This year' };
    case 'last_year':
      return { start: new Date(now.getFullYear() - 1, 0, 1), end: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999), label: 'Last year' };
    case 'this_month':
    default:
      return { start: startOfMonth(now), end: endOfMonth(now), label: 'This month' };
  }
}

export async function getDashboardData(householdId: string, periodKey: PeriodKey) {
  const now = new Date();
  const { start, end } = resolvePeriod(periodKey, now);
  const household = await prisma.household.findUniqueOrThrow({ where: { id: householdId } });
  const baseCurrency = household.baseCurrency;

  const [accountBalances, categories] = await Promise.all([
    getAllAccountBalances(householdId),
    prisma.category.findMany({ where: { householdId } }),
  ]);

  // --- Current balance across all accounts, converted to base currency ---
  let currentBalance = 0;
  for (const { account, balance } of accountBalances) {
    const converted = await tryConvertToBase(householdId, balance, account.currency, baseCurrency, now);
    currentBalance += converted ?? (account.currency === baseCurrency ? balance : 0);
  }

  // --- Income / Expenses for the selected period (baseAmount is already a base-currency snapshot) ---
  const [incomeAgg, expenseAgg] = await Promise.all([
    prisma.transaction.aggregate({ where: { householdId, type: 'INCOME', date: { gte: start, lte: end } }, _sum: { baseAmount: true } }),
    prisma.transaction.aggregate({ where: { householdId, type: 'EXPENSE', date: { gte: start, lte: end } }, _sum: { baseAmount: true } }),
  ]);
  const totalIncome = incomeAgg._sum.baseAmount ?? 0;
  const totalExpenses = expenseAgg._sum.baseAmount ?? 0;
  const netCashFlow = totalIncome - totalExpenses; // "Savings" for the period, per spec's own worked example

  // --- Debts & receivables (outstanding balances, converted to base "today") ---
  const [debts, receivables] = await Promise.all([
    prisma.debt.findMany({ where: { householdId } }),
    prisma.receivable.findMany({ where: { householdId, status: { not: 'PAID' } }, include: { payments: true } }),
  ]);
  let totalDebt = 0;
  for (const d of debts) totalDebt += (await tryConvertToBase(householdId, d.remainingAmount, d.currency, baseCurrency, now)) ?? 0;
  let totalReceivables = 0;
  for (const r of receivables) {
    const paid = r.payments.reduce((s, p) => s + p.amount, 0);
    totalReceivables += (await tryConvertToBase(householdId, r.amount - paid, r.currency, baseCurrency, now)) ?? 0;
  }

  // --- Upcoming bills (next 14 days, including anything already overdue) ---
  const bills = await prisma.bill.findMany({ where: { householdId } });
  const in14 = new Date(now.getTime() + 14 * 86400000);
  let upcomingBillsTotal = 0;
  const upcomingBillsList: any[] = [];
  for (const b of bills) {
    const status = computeBillStatus(b.dueDate, b.frequency as any, b.lastPaidDate, now);
    if (status === 'OVERDUE' || (b.dueDate <= in14 && status !== 'PAID')) {
      upcomingBillsTotal += (await tryConvertToBase(householdId, b.amount, b.currency, baseCurrency, now)) ?? 0;
      upcomingBillsList.push({ ...b, status });
    }
  }
  upcomingBillsList.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  const subscriptions = await prisma.subscription.findMany({ where: { householdId, active: true, nextPaymentDate: { lte: in14 } } });

  // --- Charts: income vs expense, last 6 months ---
  const monthly: { month: string; income: number; expenses: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
    const [inc, exp] = await Promise.all([
      prisma.transaction.aggregate({ where: { householdId, type: 'INCOME', date: { gte: mStart, lte: mEnd } }, _sum: { baseAmount: true } }),
      prisma.transaction.aggregate({ where: { householdId, type: 'EXPENSE', date: { gte: mStart, lte: mEnd } }, _sum: { baseAmount: true } }),
    ]);
    monthly.push({ month: mStart.toLocaleDateString('en-US', { month: 'short' }), income: round(inc._sum.baseAmount ?? 0), expenses: round(exp._sum.baseAmount ?? 0) });
  }

  // --- Expense category breakdown for selected period ---
  const categorySpendRaw = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where: { householdId, type: 'EXPENSE', date: { gte: start, lte: end } },
    _sum: { baseAmount: true },
  });
  const categoryBreakdown = categorySpendRaw
    .map((row) => {
      const cat = categories.find((c) => c.id === row.categoryId);
      return { categoryId: row.categoryId ?? 'uncategorized', name: cat?.name ?? 'Uncategorized', color: cat?.color ?? '#94a3b8', amount: round(row._sum.baseAmount ?? 0) };
    })
    .filter((r) => r.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  // --- Spending trend: last 12 months, daily granularity for last 30/90 handled client-side from this same series ---
  const spendingTrend: { date: string; amount: number }[] = [];
  const trendStart = new Date(now.getTime() - 365 * 86400000);
  const dailyExpenses = await prisma.transaction.findMany({
    where: { householdId, type: 'EXPENSE', date: { gte: trendStart, lte: now } },
    select: { date: true, baseAmount: true },
  });
  const byDay = new Map<string, number>();
  for (const t of dailyExpenses) {
    const key = t.date.toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + t.baseAmount);
  }
  for (let i = 364; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    spendingTrend.push({ date: key, amount: round(byDay.get(key) ?? 0) });
  }

  // --- Budgets (current month) ---
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const budgets = await prisma.budget.findMany({
    where: { householdId, OR: [{ period: 'MONTHLY', month: currentMonth, year: currentYear }, { period: 'YEARLY', year: currentYear }] },
    include: { category: true },
  });
  const budgetStatusList = await Promise.all(
    budgets.map(async (b) => {
      const range = b.period === 'MONTHLY'
        ? { gte: new Date(currentYear, currentMonth - 1, 1), lte: new Date(currentYear, currentMonth, 0, 23, 59, 59, 999) }
        : { gte: new Date(currentYear, 0, 1), lte: new Date(currentYear, 11, 31, 23, 59, 59, 999) };
      const spend = await prisma.transaction.aggregate({ where: { householdId, type: 'EXPENSE', categoryId: b.categoryId, date: range }, _sum: { baseAmount: true } });
      return { id: b.id, category: b.category.name, color: b.category.color, budgeted: b.amount, spent: round(spend._sum.baseAmount ?? 0), currency: baseCurrency };
    }),
  );

  // --- Recent transactions ---
  const recentTransactions = await prisma.transaction.findMany({
    where: { householdId },
    orderBy: { date: 'desc' },
    take: 8,
    include: { category: true, account: true },
  });

  // --- Insights ---
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);

  const [curCat, prevCat, curInc, curExp, prevInc, prevExp, ytdInc, ytdExp, activeSubs, last30] = await Promise.all([
    prisma.transaction.groupBy({ by: ['categoryId'], where: { householdId, type: 'EXPENSE', date: { gte: thisMonthStart, lte: thisMonthEnd } }, _sum: { baseAmount: true } }),
    prisma.transaction.groupBy({ by: ['categoryId'], where: { householdId, type: 'EXPENSE', date: { gte: prevMonthStart, lte: prevMonthEnd } }, _sum: { baseAmount: true } }),
    prisma.transaction.aggregate({ where: { householdId, type: 'INCOME', date: { gte: thisMonthStart, lte: thisMonthEnd } }, _sum: { baseAmount: true } }),
    prisma.transaction.aggregate({ where: { householdId, type: 'EXPENSE', date: { gte: thisMonthStart, lte: thisMonthEnd } }, _sum: { baseAmount: true } }),
    prisma.transaction.aggregate({ where: { householdId, type: 'INCOME', date: { gte: prevMonthStart, lte: prevMonthEnd } }, _sum: { baseAmount: true } }),
    prisma.transaction.aggregate({ where: { householdId, type: 'EXPENSE', date: { gte: prevMonthStart, lte: prevMonthEnd } }, _sum: { baseAmount: true } }),
    prisma.transaction.aggregate({ where: { householdId, type: 'INCOME', date: { gte: new Date(currentYear, 0, 1), lte: now } }, _sum: { baseAmount: true } }),
    prisma.transaction.aggregate({ where: { householdId, type: 'EXPENSE', date: { gte: new Date(currentYear, 0, 1), lte: now } }, _sum: { baseAmount: true } }),
    prisma.subscription.findMany({ where: { householdId, active: true } }),
    prisma.transaction.aggregate({ where: { householdId, type: 'EXPENSE', date: { gte: new Date(now.getTime() - 30 * 86400000), lte: now } }, _sum: { baseAmount: true } }),
  ]);

  let monthlySubCost = 0;
  for (const s of activeSubs) {
    const monthlyEquivalent = s.billingCycle === 'YEARLY' ? s.amount / 12 : s.billingCycle === 'WEEKLY' ? s.amount * 4.345 : s.amount;
    monthlySubCost += (await tryConvertToBase(householdId, monthlyEquivalent, s.currency, baseCurrency, now)) ?? 0;
  }

  const nextIncomeTxn = await prisma.transaction.findFirst({
    where: { householdId, type: 'INCOME', isRecurring: true, recurringRule: { nextRunDate: { gte: now } } },
    include: { recurringRule: true },
    orderBy: { recurringRule: { nextRunDate: 'asc' } },
  });

  const insights: Insight[] = generateInsights({
    currency: baseCurrency,
    currentMonthIncome: curInc._sum.baseAmount ?? 0,
    currentMonthExpenses: curExp._sum.baseAmount ?? 0,
    previousMonthIncome: prevInc._sum.baseAmount ?? 0,
    previousMonthExpenses: prevExp._sum.baseAmount ?? 0,
    currentMonthCategorySpend: curCat.map((c) => ({ categoryId: c.categoryId ?? 'uncategorized', name: categories.find((cat) => cat.id === c.categoryId)?.name ?? 'Uncategorized', amount: c._sum.baseAmount ?? 0 })),
    previousMonthCategorySpend: prevCat.map((c) => ({ categoryId: c.categoryId ?? 'uncategorized', name: categories.find((cat) => cat.id === c.categoryId)?.name ?? 'Uncategorized', amount: c._sum.baseAmount ?? 0 })),
    monthlySubscriptionCost: round(monthlySubCost),
    yearToDateIncome: ytdInc._sum.baseAmount ?? 0,
    yearToDateExpenses: ytdExp._sum.baseAmount ?? 0,
    monthsElapsedInYear: now.getMonth() + 1,
    currentBalance,
    upcomingBillsNext14Days: upcomingBillsTotal,
    nextExpectedIncomeAmount: nextIncomeTxn?.amount ?? null,
    daysUntilNextIncome: nextIncomeTxn?.recurringRule ? Math.max(0, Math.round((nextIncomeTxn.recurringRule.nextRunDate.getTime() - now.getTime()) / 86400000)) : null,
    avgDailySpend30d: (last30._sum.baseAmount ?? 0) / 30,
  });

  return {
    baseCurrency,
    currentBalance: round(currentBalance),
    totalIncome: round(totalIncome),
    totalExpenses: round(totalExpenses),
    netCashFlow: round(netCashFlow),
    totalDebt: round(totalDebt),
    totalReceivables: round(totalReceivables),
    upcomingBillsTotal: round(upcomingBillsTotal),
    upcomingBillsList: upcomingBillsList.slice(0, 6),
    subscriptionsDueSoon: subscriptions,
    monthly,
    categoryBreakdown,
    spendingTrend,
    budgetStatusList,
    recentTransactions,
    insights,
    period: resolvePeriod(periodKey, now),
    accountBalances,
  };
}

function round(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
