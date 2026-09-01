import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SettingsPageClient } from '@/components/settings-page-client';
import { isLiveRatesConfigured } from '@/lib/exchange-rate-api';

export default async function SettingsPage() {
  const session = await getCurrentSession();
  const householdId = session!.user.householdId;

  const [household, categories, exchangeRates, paymentMethods, users, currencies] = await Promise.all([
    prisma.household.findUniqueOrThrow({ where: { id: householdId } }),
    prisma.category.findMany({ where: { householdId }, orderBy: [{ kind: 'asc' }, { name: 'asc' }] }),
    prisma.exchangeRate.findMany({ where: { householdId }, orderBy: { date: 'desc' } }),
    prisma.paymentMethod.findMany({ where: { householdId }, orderBy: { name: 'asc' } }),
    prisma.user.findMany({ where: { householdId }, select: { id: true, name: true, email: true, role: true } }),
    prisma.currency.findMany({ orderBy: { code: 'asc' } }),
  ]);

  return (
    <SettingsPageClient
      household={household}
      categories={categories}
      exchangeRates={exchangeRates}
      paymentMethods={paymentMethods}
      users={users}
      currentRole={session!.user.role}
      currentUserId={session!.user.id}
      currencies={currencies}
      liveRatesConfigured={isLiveRatesConfigured()}
    />
  );
}
