import { prisma } from '@/lib/prisma';
import { generateOccurrences, type Frequency } from '@/lib/recurrence';

export interface CalendarEvent {
  date: string; // yyyy-mm-dd
  kind: 'income' | 'bill' | 'expense' | 'debt' | 'subscription';
  label: string;
  amount: number;
  currency: string;
}

export async function getCalendarEvents(householdId: string, year: number, month: number): Promise<CalendarEvent[]> {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

  const [recurringIncome, recurringExpense, bills, subscriptions, debts] = await Promise.all([
    prisma.transaction.findMany({ where: { householdId, type: 'INCOME', isRecurring: true }, include: { recurringRule: true, category: true } }),
    prisma.transaction.findMany({ where: { householdId, type: 'EXPENSE', isRecurring: true }, include: { recurringRule: true, category: true } }),
    prisma.bill.findMany({ where: { householdId } }),
    prisma.subscription.findMany({ where: { householdId, active: true } }),
    prisma.debt.findMany({ where: { householdId, dueDate: { not: null } } }),
  ]);

  const events: CalendarEvent[] = [];

  // Recurring income/expense: project occurrences of their rule into this month.
  const seenRules = new Set<string>();
  for (const t of [...recurringIncome, ...recurringExpense]) {
    if (!t.recurringRule || seenRules.has(t.recurringRule.id)) continue;
    seenRules.add(t.recurringRule.id);
    const occurrences = generateOccurrences(t.recurringRule.startDate, t.recurringRule.frequency as Frequency, t.recurringRule.interval, monthStart, monthEnd, t.recurringRule.endDate);
    for (const d of occurrences) {
      events.push({ date: iso(d), kind: t.type === 'INCOME' ? 'income' : 'expense', label: `${t.description || t.payee || t.category?.name || (t.type === 'INCOME' ? 'Income' : 'Expense')}`, amount: t.type === 'INCOME' ? t.amount : -t.amount, currency: t.currency });
    }
  }

  // Bills: project from their current due date forward using their frequency.
  for (const b of bills) {
    const occurrences = generateOccurrences(b.dueDate, b.frequency as Frequency, 1, monthStart, monthEnd);
    for (const d of occurrences) {
      events.push({ date: iso(d), kind: 'bill', label: b.name, amount: -b.amount, currency: b.currency });
    }
  }

  // Subscriptions
  for (const s of subscriptions) {
    const occurrences = generateOccurrences(s.nextPaymentDate, s.billingCycle as Frequency, 1, monthStart, monthEnd);
    for (const d of occurrences) {
      events.push({ date: iso(d), kind: 'subscription', label: s.name, amount: -s.amount, currency: s.currency });
    }
  }

  // Debt due dates (one-off reminder, not a recurring projection since debts don't have a cycle field)
  for (const d of debts) {
    if (d.dueDate && d.dueDate >= monthStart && d.dueDate <= monthEnd && d.remainingAmount > 0) {
      events.push({ date: iso(d.dueDate), kind: 'debt', label: `${d.creditor} payment due`, amount: -(d.monthlyPayment ?? d.remainingAmount), currency: d.currency });
    }
  }

  return events.sort((a, b) => a.date.localeCompare(b.date));
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
