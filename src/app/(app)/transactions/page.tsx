import { Suspense } from 'react';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { TransactionsPageClient } from '@/components/transactions-page-client';

export default async function TransactionsPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const session = await getCurrentSession();
  const householdId = session!.user.householdId;
  const page = Number(searchParams.page ?? '1');
  const pageSize = 20;
  const sort = searchParams.sort ?? 'date_desc';

  const where: any = { householdId };
  if (searchParams.type) where.type = searchParams.type;
  if (searchParams.categoryId) where.categoryId = searchParams.categoryId;
  if (searchParams.accountId) where.accountId = searchParams.accountId;
  if (searchParams.currency) where.currency = searchParams.currency;
  if (searchParams.paymentMethodId) where.paymentMethodId = searchParams.paymentMethodId;
  if (searchParams.q) {
    where.OR = [
      { description: { contains: searchParams.q, mode: 'insensitive' } },
      { payee: { contains: searchParams.q, mode: 'insensitive' } },
      { notes: { contains: searchParams.q, mode: 'insensitive' } },
    ];
  }
  if (searchParams.from || searchParams.to) {
    where.date = {};
    if (searchParams.from) where.date.gte = new Date(searchParams.from);
    if (searchParams.to) where.date.lte = new Date(searchParams.to + 'T23:59:59');
  }

  const orderBy =
    sort === 'date_asc' ? { date: 'asc' as const } :
    sort === 'amount_desc' ? { amount: 'desc' as const } :
    sort === 'amount_asc' ? { amount: 'asc' as const } :
    { date: 'desc' as const };

  const [transactions, total, categories] = await Promise.all([
    prisma.transaction.findMany({ where, include: { category: true, account: true, toAccount: true, paymentMethod: true, attachments: true }, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.transaction.count({ where }),
    prisma.category.findMany({ where: { householdId } }),
  ]);

  return (
    <Suspense>
      <TransactionsPageClient
        transactions={transactions}
        total={total}
        page={page}
        pageSize={pageSize}
        categories={categories}
        searchParams={searchParams}
      />
    </Suspense>
  );
}
