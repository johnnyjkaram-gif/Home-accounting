import Link from 'next/link';
import { Suspense } from 'react';
import { Wallet, TrendingUp, TrendingDown, PiggyBank, HandCoins, Users, CalendarClock, ArrowRight } from 'lucide-react';
import { getCurrentSession } from '@/lib/auth';
import { getDashboardData, type PeriodKey } from '@/lib/server/dashboard';
import { formatMoney } from '@/lib/currency';
import { formatDateLong } from '@/lib/utils';
import { StatCard } from '@/components/ui/stat-card';
import { PeriodSelect } from '@/components/period-select';
import { IncomeExpenseChart } from '@/components/charts/income-expense-chart';
import { ExpenseDonutChart } from '@/components/charts/expense-donut-chart';
import { SpendingTrendChart } from '@/components/charts/spending-trend-chart';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { InsightCard } from '@/components/insight-card';
import { TransactionRow } from '@/components/transaction-row';
import { budgetStatus, budgetProgressPct } from '@/lib/budget';

export default async function DashboardPage({ searchParams }: { searchParams: { period?: string } }) {
  const session = await getCurrentSession();
  const householdId = session!.user.householdId;
  const periodKey = (searchParams.period as PeriodKey) ?? 'this_month';
  const d = await getDashboardData(householdId, periodKey);
  const c = d.baseCurrency;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Financial Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{d.period.label} · {formatDateLong(d.period.start)} – {formatDateLong(d.period.end)}</p>
        </div>
        <Suspense fallback={<div className="h-10 w-40" />}>
          <PeriodSelect />
        </Suspense>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Current Balance" value={formatMoney(d.currentBalance, c)} icon={Wallet} tone={d.currentBalance >= 0 ? 'default' : 'negative'} />
        <StatCard label={`Income (${d.period.label})`} value={formatMoney(d.totalIncome, c)} icon={TrendingUp} tone="positive" />
        <StatCard label={`Expenses (${d.period.label})`} value={formatMoney(d.totalExpenses, c)} icon={TrendingDown} tone="negative" />
        <StatCard label="Savings (Net Cash Flow)" value={formatMoney(d.netCashFlow, c)} icon={PiggyBank} tone={d.netCashFlow >= 0 ? 'positive' : 'negative'} />
        <StatCard label="Total Debt" value={formatMoney(d.totalDebt, c)} icon={HandCoins} tone={d.totalDebt > 0 ? 'warning' : 'default'} />
        <StatCard label="Receivables" value={formatMoney(d.totalReceivables, c)} icon={Users} tone="default" />
        <StatCard label="Upcoming Bills (14d)" value={formatMoney(d.upcomingBillsTotal, c)} icon={CalendarClock} tone={d.upcomingBillsTotal > 0 ? 'warning' : 'default'} />
        <StatCard label="Net Balance" value={formatMoney(d.netCashFlow, c)} icon={d.netCashFlow >= 0 ? TrendingUp : TrendingDown} tone={d.netCashFlow >= 0 ? 'positive' : 'negative'} sub="Income − Expenses" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="card p-4 sm:p-5">
          <h2 className="font-semibold mb-4">Income vs Expenses</h2>
          <IncomeExpenseChart data={d.monthly} currency={c} />
        </div>
        <div className="card p-4 sm:p-5">
          <h2 className="font-semibold mb-4">Expense Breakdown</h2>
          <ExpenseDonutChart data={d.categoryBreakdown} currency={c} />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="card p-4 sm:p-5">
          <h2 className="font-semibold mb-4">Spending Trend</h2>
          <SpendingTrendChart data={d.spendingTrend} currency={c} />
        </div>
        <div className="card p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Budget Status</h2>
            <Link href="/budgets" className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">Manage <ArrowRight className="h-3 w-3" /></Link>
          </div>
          {d.budgetStatusList.length === 0 ? (
            <EmptyState icon={PiggyBank} title="No budgets set" description="Set monthly budgets by category to track your spending limits." action={<Link href="/budgets" className="btn-primary btn-sm">Create a budget</Link>} />
          ) : (
            <div className="space-y-4">
              {d.budgetStatusList.map((b) => {
                const status = budgetStatus(b.spent, b.budgeted);
                return (
                  <div key={b.id}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="font-medium flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: b.color }} />{b.category}</span>
                      <span className="text-muted-foreground">{formatMoney(b.spent, b.currency)} / {formatMoney(b.budgeted, b.currency)}</span>
                    </div>
                    <Progress value={budgetProgressPct(b.spent, b.budgeted)} status={status} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="card p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">Upcoming Payments</h2>
            <Link href="/calendar" className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">Calendar <ArrowRight className="h-3 w-3" /></Link>
          </div>
          {d.upcomingBillsList.length === 0 ? (
            <EmptyState icon={CalendarClock} title="Nothing due soon" description="Bills due in the next two weeks will show up here." />
          ) : (
            <div className="divide-y divide-border">
              {d.upcomingBillsList.map((b: any) => (
                <div key={b.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium">{b.name}</p>
                    <p className="text-xs text-muted-foreground">{formatDateLong(b.dueDate)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={b.status === 'OVERDUE' ? 'danger' : 'warning'}>{b.status.replace('_', ' ')}</Badge>
                    <span className="text-sm font-semibold">{formatMoney(b.amount, b.currency)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">Recent Transactions</h2>
            <Link href="/transactions" className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">View all <ArrowRight className="h-3 w-3" /></Link>
          </div>
          {d.recentTransactions.length === 0 ? (
            <EmptyState icon={Wallet} title="No transactions yet" description="Add your first income or expense with Quick Add." />
          ) : (
            <div className="divide-y divide-border">
              {d.recentTransactions.map((tx: any) => (
                <TransactionRow key={tx.id} tx={tx} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="font-semibold mb-4">Financial Insights</h2>
        {d.insights.length === 0 ? (
          <EmptyState icon={TrendingUp} title="Not enough data yet" description="Insights appear automatically once you have a bit more transaction history." />
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {d.insights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
