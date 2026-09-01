import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const householdId = session.user.householdId;
  const format = req.nextUrl.searchParams.get('format') ?? 'json';

  if (format === 'csv') {
    const transactions = await prisma.transaction.findMany({
      where: { householdId },
      include: { category: true, account: true, toAccount: true },
      orderBy: { date: 'desc' },
    });
    const header = ['Date', 'Type', 'Category', 'Description', 'Payee', 'Account', 'To Account', 'Amount', 'Currency', 'Base Amount', 'Base Currency'];
    const rows = transactions.map((t) => [
      t.date.toISOString().slice(0, 10), t.type, t.category?.name ?? '', t.description ?? '', t.payee ?? '',
      t.account.name, t.toAccount?.name ?? '', t.amount, t.currency, t.baseAmount, t.baseCurrency,
    ]);
    const csv = [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
    return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="transactions.csv"' } });
  }

  // Full JSON backup — everything needed to restore this household's data.
  const [household, accounts, categories, paymentMethods, transactions, bills, subscriptions, budgets, savingsGoals, debts, receivables, exchangeRates] = await Promise.all([
    prisma.household.findUniqueOrThrow({ where: { id: householdId } }),
    prisma.account.findMany({ where: { householdId } }),
    prisma.category.findMany({ where: { householdId } }),
    prisma.paymentMethod.findMany({ where: { householdId } }),
    prisma.transaction.findMany({ where: { householdId } }),
    prisma.bill.findMany({ where: { householdId } }),
    prisma.subscription.findMany({ where: { householdId } }),
    prisma.budget.findMany({ where: { householdId } }),
    prisma.savingsGoal.findMany({ where: { householdId }, include: { contributions: true } }),
    prisma.debt.findMany({ where: { householdId }, include: { payments: true } }),
    prisma.receivable.findMany({ where: { householdId }, include: { payments: true } }),
    prisma.exchangeRate.findMany({ where: { householdId } }),
  ]);

  const dump = {
    exportedAt: new Date().toISOString(),
    version: 1,
    household: { name: household.name, baseCurrency: household.baseCurrency, dateFormat: household.dateFormat, language: household.language },
    accounts, categories, paymentMethods, transactions, bills, subscriptions, budgets, savingsGoals, debts, receivables, exchangeRates,
  };

  return new NextResponse(JSON.stringify(dump, null, 2), {
    headers: { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="home-accounting-backup-${new Date().toISOString().slice(0, 10)}.json"` },
  });
}

function csvCell(v: any): string {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
