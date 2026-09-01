import { prisma } from '@/lib/prisma';
import { findRate, type RateRow } from '@/lib/currency';
import { ApiError } from '@/lib/api-helpers';

/**
 * Resolve the exchange rate to convert `currency` -> household base currency
 * as of `date`, using the household's stored manual/API exchange rates.
 * Throws ApiError(422) with a clear message when no rate can be found and
 * none was supplied, so the caller (a form) can prompt the user for one.
 */
export async function resolveBaseAmount(
  householdId: string,
  amount: number,
  currency: string,
  baseCurrency: string,
  date: Date,
  manualRate?: number | null,
): Promise<{ baseAmount: number; exchangeRate: number }> {
  if (currency === baseCurrency) {
    return { baseAmount: amount, exchangeRate: 1 };
  }

  if (manualRate && manualRate > 0) {
    return { baseAmount: amount * manualRate, exchangeRate: manualRate };
  }

  const rates = await prisma.exchangeRate.findMany({
    where: { householdId, OR: [{ baseCurrency: currency }, { targetCurrency: currency }, { baseCurrency }, { targetCurrency: baseCurrency }] },
    orderBy: { date: 'desc' },
  });

  const rateRows: RateRow[] = rates.map((r) => ({ baseCurrency: r.baseCurrency, targetCurrency: r.targetCurrency, rate: r.rate, date: r.date }));
  const rate = findRate(rateRows, currency, baseCurrency, date);

  if (rate == null) {
    throw new ApiError(
      `No exchange rate found for ${currency} → ${baseCurrency}. Add one in Settings → Currency, or enter it manually on this form.`,
      422,
    );
  }

  return { baseAmount: amount * rate, exchangeRate: rate };
}

/** Like resolveBaseAmount but never throws — returns null when no rate path exists (caller decides how to handle it). */
export async function tryConvertToBase(
  householdId: string,
  amount: number,
  currency: string,
  baseCurrency: string,
  date: Date = new Date(),
): Promise<number | null> {
  try {
    const { baseAmount } = await resolveBaseAmount(householdId, amount, currency, baseCurrency, date);
    return baseAmount;
  } catch {
    return null;
  }
}
