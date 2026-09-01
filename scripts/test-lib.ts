/**
 * Standalone sanity checks for the dependency-free lib functions
 * (recurrence + currency). Run with: npx tsx scripts/test-lib.ts
 * These do not require npm-installed packages beyond `tsx` itself.
 */
import { addPeriod, generateOccurrences, computeBillStatus, nextRunAfter } from '../src/lib/recurrence';
import { findRate, convert, formatMoney } from '../src/lib/currency';

let failures = 0;
function assertEq(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    failures++;
    console.error(`FAIL: ${label}\n  expected: ${e}\n  actual:   ${a}`);
  } else {
    console.log(`ok - ${label}`);
  }
}

// --- addPeriod ---
assertEq('addPeriod monthly simple', addPeriod(new Date('2026-01-15'), 'MONTHLY').toISOString().slice(0, 10), '2026-02-15');
assertEq('addPeriod monthly end-of-month clamp (Jan31 -> Feb28)', addPeriod(new Date('2026-01-31'), 'MONTHLY').toISOString().slice(0, 10), '2026-02-28');
assertEq('addPeriod yearly leap day', addPeriod(new Date('2024-02-29'), 'YEARLY').toISOString().slice(0, 10), '2025-02-28');
assertEq('addPeriod weekly', addPeriod(new Date('2026-08-30'), 'WEEKLY').toISOString().slice(0, 10), '2026-09-06');
assertEq('addPeriod daily', addPeriod(new Date('2026-08-30'), 'DAILY').toISOString().slice(0, 10), '2026-08-31');

// --- generateOccurrences ---
const occ = generateOccurrences(
  new Date('2026-01-01'),
  'MONTHLY',
  1,
  new Date('2026-08-01'),
  new Date('2026-10-31'),
);
assertEq('generateOccurrences monthly Aug-Oct', occ.map((d) => d.toISOString().slice(0, 10)), ['2026-08-01', '2026-09-01', '2026-10-01']);

const occYearly = generateOccurrences(
  new Date('2020-06-15'),
  'YEARLY',
  1,
  new Date('2026-01-01'),
  new Date('2027-12-31'),
);
assertEq('generateOccurrences yearly recurring salary anniversary', occYearly.map((d) => d.toISOString().slice(0, 10)), ['2026-06-15', '2027-06-15']);

const occOneTime = generateOccurrences(new Date('2026-09-10'), 'ONE_TIME', 1, new Date('2026-09-01'), new Date('2026-09-30'));
assertEq('generateOccurrences one-time inside range', occOneTime.map((d) => d.toISOString().slice(0, 10)), ['2026-09-10']);

// --- nextRunAfter ---
assertEq(
  'nextRunAfter monthly',
  nextRunAfter(new Date('2026-01-01'), 'MONTHLY', 1, new Date('2026-08-30')).toISOString().slice(0, 10),
  '2026-09-01',
);

// --- computeBillStatus ---
assertEq('bill overdue', computeBillStatus(new Date('2026-08-20'), 'MONTHLY', null, new Date('2026-08-30')), 'OVERDUE');
assertEq('bill due today', computeBillStatus(new Date('2026-08-30'), 'MONTHLY', null, new Date('2026-08-30')), 'DUE_TODAY');
assertEq('bill upcoming', computeBillStatus(new Date('2026-09-05'), 'MONTHLY', null, new Date('2026-08-30')), 'UPCOMING');
assertEq(
  'bill paid this cycle (due date already advanced to next cycle)',
  computeBillStatus(new Date('2026-09-01'), 'MONTHLY', new Date('2026-08-01'), new Date('2026-08-15')),
  'UPCOMING', // dueDate (next cycle) is in the future -> Upcoming, lastPaidDate shown separately in UI
);

// --- currency ---
const rates = [
  { baseCurrency: 'USD', targetCurrency: 'LBP', rate: 89500, date: new Date('2026-08-01') },
  { baseCurrency: 'USD', targetCurrency: 'EUR', rate: 0.92, date: new Date('2026-08-01') },
];
assertEq('direct rate USD->LBP', findRate(rates, 'USD', 'LBP', new Date('2026-08-30')), 89500);
assertEq('inverse rate LBP->USD', findRate(rates, 'LBP', 'USD', new Date('2026-08-30')), 1 / 89500);
assertEq('same currency', findRate(rates, 'USD', 'USD', new Date('2026-08-30')), 1);
const twoHop = findRate(rates, 'LBP', 'EUR', new Date('2026-08-30'));
console.log('ok - two-hop LBP->EUR ~', twoHop, '(expected ~', 0.92 / 89500, ')');
if (twoHop == null || Math.abs(twoHop - 0.92 / 89500) > 1e-12) { failures++; console.error('FAIL: two-hop conversion'); }

assertEq('convert', convert(100, 89500), 8950000);
console.log('formatMoney USD:', formatMoney(1234.5, 'USD'));
console.log('formatMoney LBP:', formatMoney(8950000, 'LBP'));
console.log('formatMoney EUR:', formatMoney(1234.5, 'EUR'));

console.log(failures === 0 ? '\nALL TESTS PASSED' : `\n${failures} TEST(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
