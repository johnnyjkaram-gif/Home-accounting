import { getCurrentSession } from '@/lib/auth';
import {
  getMonthlyReport, getYearlyReport, getExpenseReport, getAccountReport, getSavingsReport, getDebtReport,
} from '@/lib/server/reports';
import { ReportsPageClient } from '@/components/reports-page-client';

export default async function ReportsPage({ searchParams }: { searchParams: { type?: string; year?: string; month?: string } }) {
  const session = await getCurrentSession();
  const householdId = session!.user.householdId;
  const now = new Date();
  const type = searchParams.type ?? 'monthly';
  const year = Number(searchParams.year ?? now.getFullYear());
  const month = Number(searchParams.month ?? now.getMonth() + 1);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  let data: any = null;
  if (type === 'monthly') data = await getMonthlyReport(householdId, year, month);
  if (type === 'yearly' || type === 'cashflow') data = await getYearlyReport(householdId, year);
  if (type === 'expense') data = await getExpenseReport(householdId, start, end);
  if (type === 'account') data = await getAccountReport(householdId, start, end);
  if (type === 'savings') data = await getSavingsReport(householdId);
  if (type === 'debt') data = await getDebtReport(householdId);

  return <ReportsPageClient type={type} year={year} month={month} data={data} />;
}
