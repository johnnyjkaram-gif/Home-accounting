import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SubscriptionsPageClient } from '@/components/subscriptions-page-client';

export default async function SubscriptionsPage() {
  const session = await getCurrentSession();
  const householdId = session!.user.householdId;
  const subscriptions = await prisma.subscription.findMany({ where: { householdId }, include: { category: true, account: true }, orderBy: { nextPaymentDate: 'asc' } });
  return <SubscriptionsPageClient subscriptions={subscriptions} />;
}
