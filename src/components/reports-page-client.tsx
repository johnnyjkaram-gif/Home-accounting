'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Download, FileBarChart } from 'lucide-react';
import { useAppData } from '@/components/app-data-context';
import { EmptyState } from '@/components/ui/empty-state';
import { Progress } from '@/components/ui/progress';
import { IncomeExpenseChart } from '@/components/charts/income-expense-chart';
import { formatMoney } from '@/lib/currency';
import { MONTH_NAMES } from '@/lib/constants';

const REPORT_TYPES = [
  { value: 'monthly', label: 'Monthly Financial' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'expense', label: 'Expense' },
  { value: 'account', label: 'Account' },
  { value: 'cashflow', label: 'Cash Flow' },
  { value: 'savings', label: 'Savings' },
  { value: 'debt', label: 'Debt' },
];

export function ReportsPageClient({ type, year, month, data }: { type: string; year: number; month: number; data: any }) {
  const { household } = useAppData();
  const router = useRouter();
  const pathname = usePathname();
  const c = household.baseCurrency;

  function update(params: Record<string, string>) {
    const sp = new URLSearchParams({ type, year: String(year), month: String(month), ...params });
    router.push(`${pathname}?${sp.toString()}`);
  }

  function exportReport(format: string) {
    const sp = new URLSearchParams({ type, format, year: String(year), month: String(month) });
    window.location.href = `/api/reports/export?${sp.toString()}`;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Detailed breakdowns you can export and share.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-outline btn-sm" onClick={() => exportReport('csv')}><Download className="h-3.5 w-3.5" /> CSV</button>
          <button className="btn-outline btn-sm" onClick={() => exportReport('xlsx')}><Download className="h-3.5 w-3.5" /> Excel</button>
          <button className="btn-outline btn-sm" onClick={() => exportReport('pdf')}><Download className="h-3.5 w-3.5" /> PDF</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {REPORT_TYPES.map((rt) => (
          <button key={rt.value} onClick={() => update({ type: rt.value })} className={`btn-sm rounded-full px-3 ${type === rt.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>
            {rt.label}
          </button>
        ))}
      </div>

      {(type === 'monthly' || type === 'yearly' || type === 'expense' || type === 'account' || type === 'cashflow') && (
        <div className="flex items-center gap-2">
          {type === 'monthly' && (
            <select className="select w-auto" value={month} onChange={(e) => update({ month: e.target.value })}>
              {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          )}
          <select className="select w-auto" value={year} onChange={(e) => update({ year: e.target.value })}>
            {[year - 2, year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      )}

      {!data ? (
        <EmptyState icon={FileBarChart} title="No data available" description="Add some transactions to generate this report." />
      ) : (
        <div className="space-y-6">
          {type === 'monthly' && (
            <>
              <div className="grid sm:grid-cols-4 gap-4">
                <SummaryCard label="Total Income" value={formatMoney(data.totalIncome, c)} />
                <SummaryCard label="Total Expenses" value={formatMoney(data.totalExpenses, c)} />
                <SummaryCard label="Net Income" value={formatMoney(data.netIncome, c)} />
                <SummaryCard label="Savings" value={formatMoney(data.savings, c)} />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="card p-4">
                  <p className="text-sm text-muted-foreground mb-1">Largest Expense</p>
                  <p className="font-medium">{data.largestExpense ? `${data.largestExpense.description || data.largestExpense.payee || 'Expense'} — ${formatMoney(data.largestExpense.baseAmount, c)}` : 'None'}</p>
                </div>
                <div className="card p-4">
                  <p className="text-sm text-muted-foreground mb-1">Largest Income</p>
                  <p className="font-medium">{data.largestIncome ? `${data.largestIncome.description || data.largestIncome.payee || 'Income'} — ${formatMoney(data.largestIncome.baseAmount, c)}` : 'None'}</p>
                </div>
              </div>
              <CategoryTable rows={data.categoryBreakdown} currency={c} />
            </>
          )}

          {(type === 'yearly' || type === 'cashflow') && (
            <>
              <div className="grid sm:grid-cols-3 gap-4">
                <SummaryCard label="Total Income" value={formatMoney(data.totalIncome, c)} />
                <SummaryCard label="Total Expenses" value={formatMoney(data.totalExpenses, c)} />
                <SummaryCard label="Net Income" value={formatMoney(data.netIncome, c)} />
              </div>
              <div className="card p-4 sm:p-5">
                <IncomeExpenseChart data={data.months} currency={c} />
              </div>
              <SimpleTable columns={['Month', 'Income', 'Expenses', 'Net']} rows={data.months.map((m: any) => [m.month, formatMoney(m.income, c), formatMoney(m.expenses, c), formatMoney(m.income - m.expenses, c)])} />
            </>
          )}

          {type === 'expense' && <CategoryTable rows={data.categoryBreakdown} currency={c} />}

          {type === 'account' && (
            <SimpleTable
              columns={['Account', 'Currency', 'Income', 'Expense', 'Transfers Out', 'Transfers In', 'Transactions']}
              rows={data.rows.map((a: any) => [a.account, a.currency, formatMoney(a.income, a.currency), formatMoney(a.expense, a.currency), formatMoney(a.transferOut, a.currency), formatMoney(a.transferIn, a.currency), a.transactionCount])}
            />
          )}

          {type === 'savings' && (
            <div className="grid sm:grid-cols-2 gap-4">
              {data.map((g: any) => (
                <div key={g.name} className="card p-4">
                  <p className="font-medium mb-2">{g.name}</p>
                  <Progress value={g.progressPct} status={g.progressPct >= 60 ? 'safe' : 'near'} className="mb-2" />
                  <p className="text-sm text-muted-foreground">{formatMoney(g.current, g.currency)} of {formatMoney(g.target, g.currency)} ({g.progressPct}%)</p>
                </div>
              ))}
            </div>
          )}

          {type === 'debt' && (
            <div className="grid sm:grid-cols-2 gap-4">
              {data.map((d: any) => (
                <div key={d.creditor} className="card p-4">
                  <p className="font-medium mb-2">{d.creditor}</p>
                  <Progress value={d.paidOffPct} status="safe" className="mb-2" />
                  <p className="text-sm text-muted-foreground">{formatMoney(d.remaining, d.currency)} remaining of {formatMoney(d.original, d.currency)} ({d.paidOffPct}% paid off)</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold mt-1">{value}</p>
    </div>
  );
}

function CategoryTable({ rows, currency }: { rows: any[]; currency: string }) {
  return <SimpleTable columns={['Category', 'Amount', 'Transactions']} rows={rows.map((c) => [c.name, formatMoney(c.amount, currency), c.count])} />;
}

function SimpleTable({ columns, rows }: { columns: string[]; rows: any[][] }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>{columns.map((c) => <th key={c} className="text-left font-medium px-4 py-3">{c}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 && <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground">No data for this period.</td></tr>}
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-muted/30">
                {r.map((cell, j) => <td key={j} className="px-4 py-3 whitespace-nowrap">{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
