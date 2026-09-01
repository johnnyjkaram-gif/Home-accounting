import { Suspense } from 'react';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { TransactionListPage } from '@/components/transaction-list-page';

export default async function IncomePage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const session = await getCurrentSession();
  const householdId = session!.user.householdId;
  const page = Number(searchParams.page ?? '1');
  const pageSize = 15;

  const where: any = { householdId, type: 'INCOME' };
  if (searchParams.categoryId) where.categoryId = searchParams.categoryId;
  if (searchParams.accountId) where.accountId = searchParams.accountId;
  if (searchParams.q) {
    where.OR = [
      { description: { contains: searchParams.q, mode: 'insensitive' } },
      { payee: { contains: searchParams.q, mode: 'insensitive' } },
    ];
  }
  if (searchParams.from || searchParams.to) {
    where.date = {};
    if (searchParams.from) where.date.gte = new Date(searchParams.from);
    if (searchParams.to) where.date.lte = new Date(searchParams.to);
  }

  const [transactions, total, categories] = await Promise.all([
    prisma.transaction.findMany({ where, include: { category: true, account: true, paymentMethod: true, attachments: true }, orderBy: { date: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.transaction.count({ where }),
    prisma.category.findMany({ where: { householdId, kind: 'INCOME' } }),
  ]);

  return (
    <Suspense>
      <TransactionListPage
        type="INCOME"
        title="Income"
        description="Every payment your household has received."
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
