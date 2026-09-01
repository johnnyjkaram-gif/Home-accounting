import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { BudgetsPageClient } from '@/components/budgets-page-client';

export default async function BudgetsPage({ searchParams }: { searchParams: { month?: string; year?: string } }) {
  const session = await getCurrentSession();
  const householdId = session!.user.householdId;
  const now = new Date();
  const month = Number(searchParams.month ?? now.getMonth() + 1);
  const year = Number(searchParams.year ?? now.getFullYear());

  const [budgets, categories] = await Promise.all([
    prisma.budget.findMany({ where: { householdId, OR: [{ period: 'MONTHLY', month, year }, { period: 'YEARLY', year }] }, include: { category: true } }),
    prisma.category.findMany({ where: { householdId, kind: 'EXPENSE' } }),
  ]);

  const withSpend = await Promise.all(
    budgets.map(async (b) => {
      const range = b.period === 'MONTHLY'
        ? { gte: new Date(year, month - 1, 1), lte: new Date(year, month, 0, 23, 59, 59, 999) }
        : { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31, 23, 59, 59, 999) };
      const spend = await prisma.transaction.aggregate({ where: { householdId, type: 'EXPENSE', categoryId: b.categoryId, date: range }, _sum: { baseAmount: true } });
      return { ...b, spent: spend._sum.baseAmount ?? 0 };
    }),
  );

  return <BudgetsPageClient budgets={withSpend} categories={categories} month={month} year={year} />;
}
