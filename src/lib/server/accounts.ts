import { prisma } from '@/lib/prisma';

/**
 * Compute an account's current balance from its opening balance plus every
 * transaction that has touched it (income/expense/debt/receivable payments
 * add or subtract, transfers move between two accounts). Computed on read
 * rather than cached, so it can never drift out of sync.
 */
export async function getAccountBalance(accountId: string, openingBalance: number, asOf?: Date): Promise<number> {
  const dateFilter = asOf ? { date: { lte: asOf } } : {};

  const [outgoing, incoming] = await Promise.all([
    prisma.transaction.aggregate({
      where: { accountId, ...dateFilter },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { toAccountId: accountId, type: 'TRANSFER', ...dateFilter },
      _sum: { amount: true },
    }),
  ]);

  // For rows keyed on `accountId` (the "from" side): INCOME adds, EXPENSE/TRANSFER/DEBT_PAYMENT
  // subtract, RECEIVABLE_PAYMENT (money coming in) adds. We need per-type sums, not one aggregate,
  // so re-fetch grouped by type for correctness.
  const grouped = await prisma.transaction.groupBy({
    by: ['type'],
    where: { accountId, ...dateFilter },
    _sum: { amount: true },
  });

  let balance = openingBalance;
  for (const g of grouped) {
    const sum = g._sum.amount ?? 0;
    if (g.type === 'INCOME' || g.type === 'RECEIVABLE_PAYMENT') balance += sum;
    else balance -= sum; // EXPENSE, TRANSFER (outgoing leg), DEBT_PAYMENT
  }
  balance += incoming._sum.amount ?? 0; // TRANSFER incoming leg

  return round2(balance);
}

export async function getAllAccountBalances(householdId: string, asOf?: Date) {
  const accounts = await prisma.account.findMany({ where: { householdId }, orderBy: { createdAt: 'asc' } });
  const balances = await Promise.all(
    accounts.map(async (a) => ({ account: a, balance: await getAccountBalance(a.id, a.openingBalance, asOf) })),
  );
  return balances;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
