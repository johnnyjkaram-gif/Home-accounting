import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentSession, canWrite } from '@/lib/auth';

/**
 * Restores data from a JSON backup produced by /api/export (format=json).
 * Additive by design: matches accounts/categories by name (creating any that
 * are missing) and inserts transactions fresh, so importing never silently
 * overwrites existing records. Re-importing the same file will duplicate
 * transactions — this is meant for restoring into a fresh household.
 */
export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canWrite(session.user.role)) return NextResponse.json({ error: 'You do not have permission to import data' }, { status: 403 });
  const householdId = session.user.householdId;

  let dump: any;
  try {
    dump = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON file' }, { status: 400 });
  }

  if (!dump || dump.version !== 1 || !Array.isArray(dump.accounts)) {
    return NextResponse.json({ error: 'This file does not look like a Home Accounting backup (unexpected format).' }, { status: 422 });
  }

  const accountIdMap = new Map<string, string>();
  const categoryIdMap = new Map<string, string>();

  for (const a of dump.accounts) {
    const existing = await prisma.account.findFirst({ where: { householdId, name: a.name, currency: a.currency } });
    if (existing) { accountIdMap.set(a.id, existing.id); continue; }
    const created = await prisma.account.create({ data: { householdId, name: a.name, type: a.type, currency: a.currency, openingBalance: a.openingBalance, color: a.color, icon: a.icon } });
    accountIdMap.set(a.id, created.id);
  }

  for (const c of dump.categories ?? []) {
    const existing = await prisma.category.findFirst({ where: { householdId, name: c.name, kind: c.kind } });
    if (existing) { categoryIdMap.set(c.id, existing.id); continue; }
    const created = await prisma.category.create({ data: { householdId, name: c.name, kind: c.kind, color: c.color, icon: c.icon } });
    categoryIdMap.set(c.id, created.id);
  }

  let imported = 0;
  for (const t of dump.transactions ?? []) {
    const accountId = accountIdMap.get(t.accountId);
    if (!accountId) continue;
    await prisma.transaction.create({
      data: {
        householdId,
        type: t.type,
        date: new Date(t.date),
        amount: t.amount,
        currency: t.currency,
        baseAmount: t.baseAmount,
        baseCurrency: t.baseCurrency,
        exchangeRate: t.exchangeRate,
        accountId,
        toAccountId: t.toAccountId ? accountIdMap.get(t.toAccountId) : undefined,
        categoryId: t.categoryId ? categoryIdMap.get(t.categoryId) : undefined,
        payee: t.payee,
        description: t.description,
        notes: t.notes,
      },
    });
    imported++;
  }

  return NextResponse.json({ ok: true, imported, accountsProcessed: dump.accounts.length });
}
