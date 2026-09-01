/**
 * Multi-currency helpers.
 *
 * Golden rule enforced throughout the app: a transaction's `amount` +
 * `currency` are the ORIGINAL values and are never mutated by a currency
 * conversion. `baseAmount` + `baseCurrency` + `exchangeRate` are a SNAPSHOT
 * computed once (at save time, using the rate effective on that date) purely
 * so dashboards/reports can aggregate across currencies without re-querying
 * rates for every historical row. Editing exchange rates later does not
 * retroactively change past transactions (mirrors real accounting practice).
 */

export interface RateRow {
  baseCurrency: string;
  targetCurrency: string;
  rate: number; // 1 baseCurrency = rate targetCurrency
  date: Date;
}

/**
 * Find the exchange rate to convert `from` -> `to`, using the most recent
 * rate on or before `onDate`. Falls back to:
 *  - identity (1) when from === to
 *  - the inverse of a stored to->from rate
 *  - a two-hop conversion via a common currency (usually the household's
 *    base currency) when no direct rate exists
 * Returns null when no path can be found (caller should prompt for a manual rate).
 */
export function findRate(rates: RateRow[], from: string, to: string, onDate: Date): number | null {
  if (from === to) return 1;

  const eligible = rates.filter((r) => r.date.getTime() <= onDate.getTime());

  const direct = latestFor(eligible, from, to);
  if (direct != null) return direct;

  const inverse = latestFor(eligible, to, from);
  if (inverse != null && inverse !== 0) return 1 / inverse;

  // Two-hop: from -> X -> to, using every currency X that has rates both ways.
  const currencies = new Set<string>();
  eligible.forEach((r) => {
    currencies.add(r.baseCurrency);
    currencies.add(r.targetCurrency);
  });
  for (const mid of currencies) {
    if (mid === from || mid === to) continue;
    const leg1 = latestFor(eligible, from, mid) ?? invert(latestFor(eligible, mid, from));
    const leg2 = latestFor(eligible, mid, to) ?? invert(latestFor(eligible, to, mid));
    if (leg1 != null && leg2 != null) return leg1 * leg2;
  }

  return null;
}

function invert(v: number | null | undefined): number | null {
  if (v == null || v === 0) return null;
  return 1 / v;
}

function latestFor(rates: RateRow[], from: string, to: string): number | null {
  const matches = rates
    .filter((r) => r.baseCurrency === from && r.targetCurrency === to)
    .sort((a, b) => b.date.getTime() - a.date.getTime());
  return matches.length ? matches[0].rate : null;
}

export function convert(amount: number, rate: number): number {
  return amount * rate;
}

export function formatMoney(amount: number, currency: string, locale = 'en-US'): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: currency === 'LBP' ? 0 : 2,
      maximumFractionDigits: currency === 'LBP' ? 0 : 2,
    }).format(amount);
  } catch {
    // Unknown currency code (custom currencies) - fall back to a plain format.
    return `${amount.toLocaleString(locale, { maximumFractionDigits: 2 })} ${currency}`;
  }
}
