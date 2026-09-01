import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const householdId = session.user.householdId;

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) return NextResponse.json({ results: [] });

  const [transactions, bills, subscriptions, debts, receivables, accounts] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        householdId,
        OR: [
          { description: { contains: q, mode: 'insensitive' } },
          { payee: { contains: q, mode: 'insensitive' } },
          { notes: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 6,
      orderBy: { date: 'desc' },
    }),
    prisma.bill.findMany({ where: { householdId, name: { contains: q, mode: 'insensitive' } }, take: 4 }),
    prisma.subscription.findMany({ where: { householdId, name: { contains: q, mode: 'insensitive' } }, take: 4 }),
    prisma.debt.findMany({ where: { householdId, creditor: { contains: q, mode: 'insensitive' } }, take: 4 }),
    prisma.receivable.findMany({ where: { householdId, person: { contains: q, mode: 'insensitive' } }, take: 4 }),
    prisma.account.findMany({ where: { householdId, name: { contains: q, mode: 'insensitive' } }, take: 4 }),
  ]);

  const results = [
    ...transactions.map((t) => ({ type: 'Transaction', label: t.description || t.payee || t.type, sub: `${t.amount} ${t.currency}`, href: '/transactions' })),
    ...bills.map((b) => ({ type: 'Bill', label: b.name, sub: `${b.amount} ${b.currency}`, href: '/bills' })),
    ...subscriptions.map((s) => ({ type: 'Subscription', label: s.name, sub: `${s.amount} ${s.currency}`, href: '/subscriptions' })),
    ...debts.map((d) => ({ type: 'Debt', label: d.creditor, sub: `${d.remainingAmount} ${d.currency} remaining`, href: '/debts' })),
    ...receivables.map((r) => ({ type: 'Receivable', label: r.person, sub: `${r.amount} ${r.currency}`, href: '/receivables' })),
    ...accounts.map((a) => ({ type: 'Account', label: a.name, sub: a.currency, href: '/accounts' })),
  ];

  return NextResponse.json({ results: results.slice(0, 20) });
}
