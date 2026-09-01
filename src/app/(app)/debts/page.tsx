import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { DebtsPageClient } from '@/components/debts-page-client';

export default async function DebtsPage() {
  const session = await getCurrentSession();
  const householdId = session!.user.householdId;
  const debts = await prisma.debt.findMany({ where: { householdId }, include: { payments: { orderBy: { date: 'desc' } } }, orderBy: { createdAt: 'desc' } });
  return <DebtsPageClient debts={debts} />;
}
