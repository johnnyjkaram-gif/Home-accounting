import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { BillsPageClient } from '@/components/bills-page-client';
import { computeBillStatus } from '@/lib/recurrence';

export default async function BillsPage() {
  const session = await getCurrentSession();
  const householdId = session!.user.householdId;
  const bills = await prisma.bill.findMany({ where: { householdId }, include: { category: true, account: true }, orderBy: { dueDate: 'asc' } });

  const withStatus = bills.map((b) => ({ ...b, status: computeBillStatus(b.dueDate, b.frequency as any, b.lastPaidDate) }));

  return <BillsPageClient bills={withStatus} />;
}
