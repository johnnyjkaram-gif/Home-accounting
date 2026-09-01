/**
 * Optional integration with a free-tier exchange-rate API
 * (https://www.exchangerate-api.com/ by default). Entirely optional:
 * the app works fully with manual exchange rates when no key is set.
 *
 * To use a different provider, change `buildUrl` and `parseResponse`
 * below to match its request/response shape — everything else
 * (the server action, the UI, the historical-rate storage) stays the same.
 */

export function isLiveRatesConfigured(): boolean {
  return Boolean(process.env.EXCHANGE_RATE_API_KEY?.trim());
}

function buildUrl(base: string): string {
  const key = process.env.EXCHANGE_RATE_API_KEY!.trim();
  return `https://v6.exchangerate-api.com/v6/${key}/latest/${encodeURIComponent(base)}`;
}

/**
 * Fetches the latest published rates for `base` against every currency the
 * provider knows about. Returns null (never throws) on any network error,
 * non-OK response, or malformed payload, so callers can fail soft.
 */
export async function fetchLatestRates(base: string): Promise<Record<string, number> | null> {
  if (!isLiveRatesConfigured()) return null;
  try {
    const res = await fetch(buildUrl(base), { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.result !== 'success' || !data.conversion_rates || typeof data.conversion_rates !== 'object') {
      return null;
    }
    return data.conversion_rates as Record<string, number>;
  } catch {
    return null;
  }
}
