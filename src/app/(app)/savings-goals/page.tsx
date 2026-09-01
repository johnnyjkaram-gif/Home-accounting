import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SavingsGoalsPageClient } from '@/components/savings-goals-page-client';

export default async function SavingsGoalsPage() {
  const session = await getCurrentSession();
  const householdId = session!.user.householdId;
  const goals = await prisma.savingsGoal.findMany({ where: { householdId }, include: { account: true }, orderBy: { createdAt: 'desc' } });
  return <SavingsGoalsPageClient goals={goals} />;
}
