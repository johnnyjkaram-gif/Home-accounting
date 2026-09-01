/**
 * Pure date-recurrence helpers used by recurring income/expenses, bills,
 * subscriptions, and the financial calendar.
 *
 * Deliberately dependency-free (no date-fns) so it can be unit-exercised
 * with a plain `tsx` run in any environment, including one without
 * npm-installed packages.
 */

export type Frequency = 'ONE_TIME' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

/** Returns a new Date advanced by one period of the given frequency/interval. */
export function addPeriod(date: Date, frequency: Frequency, interval = 1): Date {
  const d = new Date(date.getTime());
  switch (frequency) {
    case 'DAILY':
      d.setUTCDate(d.getUTCDate() + interval);
      return d;
    case 'WEEKLY':
      d.setUTCDate(d.getUTCDate() + 7 * interval);
      return d;
    case 'MONTHLY': {
      const day = d.getUTCDate();
      d.setUTCDate(1);
      d.setUTCMonth(d.getUTCMonth() + interval);
      const daysInMonth = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
      d.setUTCDate(Math.min(day, daysInMonth));
      return d;
    }
    case 'YEARLY': {
      const day = d.getUTCDate();
      const month = d.getUTCMonth();
      d.setUTCDate(1);
      d.setUTCFullYear(d.getUTCFullYear() + interval);
      d.setUTCMonth(month);
      const daysInMonth = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
      d.setUTCDate(Math.min(day, daysInMonth));
      return d;
    }
    case 'ONE_TIME':
    default:
      return d;
  }
}

/**
 * Generate every occurrence date of a recurring rule that falls within
 * [rangeStart, rangeEnd] (inclusive). Used for the financial calendar and
 * for projecting expected future income/expenses without materializing rows.
 */
export function generateOccurrences(
  startDate: Date,
  frequency: Frequency,
  interval: number,
  rangeStart: Date,
  rangeEnd: Date,
  endDate?: Date | null,
  maxIterations = 2000,
): Date[] {
  if (frequency === 'ONE_TIME') {
    return startDate >= rangeStart && startDate <= rangeEnd ? [startDate] : [];
  }

  const occurrences: Date[] = [];
  let cursor = new Date(startDate.getTime());
  let iterations = 0;

  // Fast-forward cursor close to rangeStart to avoid iterating from year zero
  // for old recurring rules.
  while (cursor < rangeStart && iterations < maxIterations) {
    const next = addPeriod(cursor, frequency, interval);
    if (next <= cursor) break; // safety against non-advancing rules
    cursor = next;
    iterations++;
  }
  // The loop above may have overshot by one period, so also check the
  // original startDate in case it already falls in range.
  if (startDate >= rangeStart && startDate <= rangeEnd) {
    occurrences.push(new Date(startDate.getTime()));
  }

  iterations = 0;
  while (cursor <= rangeEnd && iterations < maxIterations) {
    if (cursor >= rangeStart && cursor.getTime() !== startDate.getTime()) {
      if (!endDate || cursor <= endDate) {
        occurrences.push(new Date(cursor.getTime()));
      }
    }
    if (endDate && cursor > endDate) break;
    const next = addPeriod(cursor, frequency, interval);
    if (next <= cursor) break;
    cursor = next;
    iterations++;
  }

  // De-duplicate & sort (defensive; logic above should already be monotonic).
  const unique = Array.from(new Set(occurrences.map((d) => d.getTime()))).sort((a, b) => a - b);
  return unique.map((t) => new Date(t));
}

/** Given a rule's last occurrence, compute the next run date after `after`. */
export function nextRunAfter(
  startDate: Date,
  frequency: Frequency,
  interval: number,
  after: Date,
): Date {
  let cursor = new Date(startDate.getTime());
  let iterations = 0;
  while (cursor <= after && iterations < 5000) {
    cursor = addPeriod(cursor, frequency, interval);
    iterations++;
  }
  return cursor;
}

export type BillStatus = 'UPCOMING' | 'DUE_TODAY' | 'PAID' | 'OVERDUE';

/**
 * Determine a bill's display status.
 * `lastPaidDate` covers the *current* cycle if it falls on/after the
 * previous due date (i.e. the due date minus one period).
 */
export function computeBillStatus(
  dueDate: Date,
  frequency: Frequency,
  lastPaidDate: Date | null,
  today: Date = new Date(),
): BillStatus {
  const startOfToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const dueDay = new Date(Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate()));

  if (lastPaidDate) {
    const paidDay = new Date(Date.UTC(lastPaidDate.getUTCFullYear(), lastPaidDate.getUTCMonth(), lastPaidDate.getUTCDate()));
    const previousDue = frequency === 'ONE_TIME' ? null : addPeriod(dueDay, frequency, -1);
    if (paidDay >= (previousDue ?? new Date(0))) {
      // If paid covers up to (or after) the due date itself, it's fully paid
      // for this cycle unless the due date has already rolled forward past it.
      if (paidDay >= dueDay || frequency === 'ONE_TIME') return 'PAID';
    }
  }

  if (startOfToday.getTime() === dueDay.getTime()) return 'DUE_TODAY';
  if (startOfToday > dueDay) return 'OVERDUE';
  return 'UPCOMING';
}
