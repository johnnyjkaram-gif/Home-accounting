import { prisma } from '@/lib/prisma';
import { computeBillStatus } from '@/lib/recurrence';
import { budgetStatus } from '@/lib/budget';
import { getAllAccountBalances } from '@/lib/server/accounts';

export interface LiveNotification {
  id: string;
  tone: 'warning' | 'danger' | 'neutral';
  title: string;
  message: string;
  href: string;
}

/**
 * Computed live, on every request, from current data — bills/subscriptions
 * due soon, overdue items, and budgets that are over/near their limit.
 * This keeps reminders always accurate without a background job.
 */
export async function getLiveNotifications(householdId: string): Promise<LiveNotification[]> {
  const now = new Date();
  const in3Days = new Date(now.getTime() + 3 * 86400000);

  const [bills, subscriptions, budgets, balances] = await Promise.all([
    prisma.bill.findMany({ where: { householdId } }),
    prisma.subscription.findMany({ where: { householdId, active: true } }),
    prisma.budget.findMany({ where: { householdId }, include: { category: true } }),
    getAllAccountBalances(householdId),
  ]);

  const notifications: LiveNotification[] = [];

  for (const bill of bills) {
    const status = computeBillStatus(bill.dueDate, bill.frequency as any, bill.lastPaidDate, now);
    if (status === 'OVERDUE') {
      notifications.push({ id: `bill-overdue-${bill.id}`, tone: 'danger', title: 'Bill overdue', message: `${bill.name} (${bill.amount} ${bill.currency}) was due ${bill.dueDate.toDateString()}.`, href: '/bills' });
    } else if (status === 'DUE_TODAY' || (bill.dueDate <= in3Days && bill.dueDate >= now)) {
      notifications.push({ id: `bill-due-${bill.id}`, tone: 'warning', title: 'Bill due soon', message: `${bill.name} (${bill.amount} ${bill.currency}) is due ${bill.dueDate.toDateString()}.`, href: '/bills' });
    }
  }

  for (const sub of subscriptions) {
    if (sub.nextPaymentDate <= in3Days && sub.nextPaymentDate >= now) {
      notifications.push({ id: `sub-due-${sub.id}`, tone: 'neutral', title: 'Subscription renewing soon', message: `${sub.name} renews ${sub.nextPaymentDate.toDateString()} (${sub.amount} ${sub.currency}).`, href: '/subscriptions' });
    }
  }

  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  for (const budget of budgets) {
    if (budget.period === 'MONTHLY' && (budget.month !== currentMonth || budget.year !== currentYear)) continue;
    if (budget.period === 'YEARLY' && budget.year !== currentYear) continue;

    const spend = await prisma.transaction.aggregate({
      where: {
        householdId,
        type: 'EXPENSE',
        categoryId: budget.categoryId,
        date: budget.period === 'MONTHLY'
          ? { gte: new Date(currentYear, currentMonth - 1, 1), lte: new Date(currentYear, currentMonth, 0, 23, 59, 59) }
          : { gte: new Date(currentYear, 0, 1), lte: new Date(currentYear, 11, 31, 23, 59, 59) },
      },
      _sum: { baseAmount: true },
    });
    const spent = spend._sum.baseAmount ?? 0;
    const status = budgetStatus(spent, budget.amount);
    if (status === 'over') {
      notifications.push({ id: `budget-over-${budget.id}`, tone: 'danger', title: 'Budget exceeded', message: `${budget.category.name} is over budget.`, href: '/budgets' });
    } else if (status === 'near') {
      notifications.push({ id: `budget-near-${budget.id}`, tone: 'warning', title: 'Budget near limit', message: `${budget.category.name} is close to its budget limit.`, href: '/budgets' });
    }
  }

  const negativeAccounts = balances.filter((b) => b.account.type !== 'CREDIT_CARD' && b.balance < 0);
  for (const { account, balance } of negativeAccounts) {
    notifications.push({ id: `account-negative-${account.id}`, tone: 'danger', title: 'Account balance negative', message: `${account.name} is at ${balance.toFixed(2)} ${account.currency}.`, href: '/accounts' });
  }

  return notifications;
}
