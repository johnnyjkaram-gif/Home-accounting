import { prisma } from '@/lib/prisma';
import { getAllAccountBalances } from '@/lib/server/accounts';
import { DEFAULT_CURRENCIES } from '@/lib/constants';

export async function getReferenceData(householdId: string) {
  const [household, accountBalances, categories, paymentMethods, customCurrencies] = await Promise.all([
    prisma.household.findUniqueOrThrow({ where: { id: householdId } }),
    getAllAccountBalances(householdId),
    prisma.category.findMany({ where: { householdId }, orderBy: [{ kind: 'asc' }, { name: 'asc' }] }),
    prisma.paymentMethod.findMany({ where: { householdId }, orderBy: { name: 'asc' } }),
    prisma.currency.findMany(),
  ]);

  const currencyMap = new Map<string, { code: string; name: string; symbol: string }>();
  DEFAULT_CURRENCIES.forEach((c) => currencyMap.set(c.code, c));
  customCurrencies.forEach((c) => currencyMap.set(c.code, c));
  if (!currencyMap.has(household.baseCurrency)) {
    currencyMap.set(household.baseCurrency, { code: household.baseCurrency, name: household.baseCurrency, symbol: household.baseCurrency });
  }

  return {
    household,
    accounts: accountBalances.map(({ account, balance }) => ({ ...account, balance })),
    categories,
    paymentMethods,
    currencies: Array.from(currencyMap.values()),
  };
}

export type ReferenceData = Awaited<ReturnType<typeof getReferenceData>>;
