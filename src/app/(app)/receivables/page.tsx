import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ReceivablesPageClient } from '@/components/receivables-page-client';

export default async function ReceivablesPage() {
  const session = await getCurrentSession();
  const householdId = session!.user.householdId;
  const receivables = await prisma.receivable.findMany({ where: { householdId }, include: { payments: { orderBy: { date: 'desc' } } }, orderBy: { createdAt: 'desc' } });
  return <ReceivablesPageClient receivables={receivables} />;
}
