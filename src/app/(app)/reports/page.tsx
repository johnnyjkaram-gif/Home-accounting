import { getCurrentSession } from '@/lib/auth';
import {
  getDailyReport, getWeeklyReport, getMonthlyReport, getYearlyReport, getExpenseReport, getAccountReport, getSavingsReport, getDebtReport,
} from '@/lib/server/reports';
import { ReportsPageClient } from '@/components/reports-page-client';

export default async function ReportsPage({ searchParams }: { searchParams: { type?: string; year?: string; month?: string; date?: string } }) {
  const session = await getCurrentSession();
  const householdId = session!.user.householdId;
  const now = new Date();
  const type = searchParams.type ?? 'monthly';
  const year = Number(searchParams.year ?? now.getFullYear());
  const month = Number(searchParams.month ?? now.getMonth() + 1);
  const date = parseDateParam(searchParams.date) ?? now;
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  let data: any = null;
  if (type === 'daily') data = await getDailyReport(householdId, date);
  if (type === 'weekly') data = await getWeeklyReport(householdId, date);
  if (type === 'monthly') data = await getMonthlyReport(householdId, year, month);
  if (type === 'yearly' || type === 'cashflow') data = await getYearlyReport(householdId, year);
  if (type === 'expense') data = await getExpenseReport(householdId, start, end);
  if (type === 'account') data = await getAccountReport(householdId, start, end);
  if (type === 'savings') data = await getSavingsReport(householdId);
  if (type === 'debt') data = await getDebtReport(householdId);

  return <ReportsPageClient type={type} year={year} month={month} date={formatDateParam(date)} data={data} />;
}

/** Parses a plain "YYYY-MM-DD" search param into a local-midnight Date, avoiding the UTC-shift
 * that new Date("YYYY-MM-DD") can introduce in negative-offset time zones. */
function parseDateParam(s?: string): Date | undefined {
  const m = s ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(s) : null;
  if (!m) return undefined;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function formatDateParam(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
