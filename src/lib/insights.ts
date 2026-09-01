/**
 * Financial Insights engine.
 *
 * Strictly rule-based and derived from numbers the caller already computed
 * from the database — no fabricated or speculative claims. Every insight
 * function takes plain numeric/aggregate input so it can be unit-tested
 * without a database.
 */

export interface Insight {
  id: string;
  tone: 'positive' | 'neutral' | 'warning' | 'danger';
  message: string;
}

export interface CategorySpend {
  categoryId: string;
  name: string;
  amount: number;
}

export interface InsightsInput {
  currency: string;
  currentMonthIncome: number;
  currentMonthExpenses: number;
  previousMonthIncome: number;
  previousMonthExpenses: number;
  currentMonthCategorySpend: CategorySpend[];
  previousMonthCategorySpend: CategorySpend[];
  monthlySubscriptionCost: number;
  yearToDateIncome: number;
  yearToDateExpenses: number;
  monthsElapsedInYear: number; // 1-12
  currentBalance: number;
  upcomingBillsNext14Days: number;
  nextExpectedIncomeAmount: number | null;
  daysUntilNextIncome: number | null;
  avgDailySpend30d: number;
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null; // undefined % change from zero base
  return ((current - previous) / previous) * 100;
}

export function generateInsights(input: InsightsInput): Insight[] {
  const insights: Insight[] = [];

  // 1. Category spend change vs last month (biggest mover with real data both months)
  for (const cur of input.currentMonthCategorySpend) {
    const prev = input.previousMonthCategorySpend.find((p) => p.categoryId === cur.categoryId);
    if (!prev || prev.amount <= 0 || cur.amount <= 0) continue;
    const change = pctChange(cur.amount, prev.amount);
    if (change != null && Math.abs(change) >= 15) {
      insights.push({
        id: `cat-change-${cur.categoryId}`,
        tone: change > 0 ? 'warning' : 'positive',
        message: `You spent ${Math.abs(Math.round(change))}% ${change > 0 ? 'more' : 'less'} on ${cur.name} this month than last month.`,
      });
    }
  }

  // 2. Subscription cost callout
  if (input.monthlySubscriptionCost > 0) {
    insights.push({
      id: 'subscriptions-cost',
      tone: 'neutral',
      message: `Your active subscriptions cost ${formatShort(input.monthlySubscriptionCost, input.currency)}/month (${formatShort(input.monthlySubscriptionCost * 12, input.currency)}/year).`,
    });
  }

  // 3. Expenses as a % of income this month
  if (input.currentMonthIncome > 0) {
    const ratio = (input.currentMonthExpenses / input.currentMonthIncome) * 100;
    insights.push({
      id: 'expense-ratio',
      tone: ratio > 90 ? 'danger' : ratio > 70 ? 'warning' : 'positive',
      message: `Your expenses are currently ${Math.round(ratio)}% of your income this month.`,
    });
  }

  // 4. Year-to-date savings projection (linear extrapolation of YTD net, explicitly labeled as an estimate)
  if (input.monthsElapsedInYear > 0) {
    const ytdNet = input.yearToDateIncome - input.yearToDateExpenses;
    const monthlyAvgNet = ytdNet / input.monthsElapsedInYear;
    const projectedYearEnd = monthlyAvgNet * 12;
    if (Number.isFinite(projectedYearEnd)) {
      insights.push({
        id: 'savings-projection',
        tone: projectedYearEnd >= 0 ? 'positive' : 'danger',
        message: `Based on your year-to-date average, you're on track to ${projectedYearEnd >= 0 ? 'save' : 'be short'} about ${formatShort(Math.abs(projectedYearEnd), input.currency)} this year if your pattern continues.`,
      });
    }
  }

  // 5. Category ranking (3rd largest expense etc.) - only mention if it's meaningfully large
  const ranked = [...input.currentMonthCategorySpend].sort((a, b) => b.amount - a.amount);
  const totalSpend = ranked.reduce((s, c) => s + c.amount, 0);
  ranked.slice(0, 3).forEach((c, idx) => {
    if (totalSpend > 0 && c.amount / totalSpend >= 0.1) {
      const rankLabel = idx === 0 ? 'largest' : idx === 1 ? 'second-largest' : 'third-largest';
      insights.push({
        id: `rank-${c.categoryId}`,
        tone: 'neutral',
        message: `${c.name} is your ${rankLabel} expense this month at ${formatShort(c.amount, input.currency)}.`,
      });
    }
  });

  // 6. Low balance warning before next expected income
  if (input.daysUntilNextIncome != null && input.daysUntilNextIncome > 0 && input.avgDailySpend30d > 0) {
    const projectedSpend = input.avgDailySpend30d * input.daysUntilNextIncome;
    const projectedBalance = input.currentBalance - projectedSpend - input.upcomingBillsNext14Days;
    if (projectedBalance < 0) {
      insights.push({
        id: 'low-balance-warning',
        tone: 'danger',
        message: `At your recent average spending rate, your balance may run low before your next expected income in ${input.daysUntilNextIncome} day${input.daysUntilNextIncome === 1 ? '' : 's'}.`,
      });
    }
  }

  // 7. Upcoming bills heads-up
  if (input.upcomingBillsNext14Days > 0) {
    insights.push({
      id: 'upcoming-bills',
      tone: 'neutral',
      message: `You have ${formatShort(input.upcomingBillsNext14Days, input.currency)} in bills due over the next 14 days.`,
    });
  }

  return insights;
}

function formatShort(amount: number, currency: string): string {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  return `${sign}${abs.toLocaleString('en-US', { maximumFractionDigits: currency === 'LBP' ? 0 : 2 })} ${currency}`;
}
