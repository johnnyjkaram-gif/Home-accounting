import {
  getMonthlyReport, getYearlyReport, getExpenseReport, getAccountReport, getSavingsReport, getDebtReport,
} from '@/lib/server/reports';

export type ReportType = 'monthly' | 'yearly' | 'expense' | 'account' | 'cashflow' | 'savings' | 'debt';

export interface ReportTable {
  title: string;
  summary: [string, string | number][];
  columns: string[];
  rows: (string | number)[][];
}

/** Produces a flat { title, columns, rows } shape any format (CSV/XLSX/PDF) can render identically. */
export async function buildReportTable(householdId: string, type: ReportType, params: { year: number; month: number; from?: Date; to?: Date }): Promise<ReportTable | undefined> {
  const from = params.from ?? new Date(params.year, params.month - 1, 1);
  const to = params.to ?? new Date(params.year, params.month, 0, 23, 59, 59, 999);

  switch (type) {
    case 'monthly': {
      const r = await getMonthlyReport(householdId, params.year, params.month);
      const summary: [string, string | number][] = [
        ['Total Income', r.totalIncome], ['Total Expenses', r.totalExpenses], ['Net Income', r.netIncome], ['Savings', r.savings],
        ['Largest Expense', r.largestExpense ? `${r.largestExpense.description || r.largestExpense.payee || ''} (${r.largestExpense.baseAmount})` : '—'],
        ['Largest Income', r.largestIncome ? `${r.largestIncome.description || r.largestIncome.payee || ''} (${r.largestIncome.baseAmount})` : '—'],
      ];
      return {
        title: `Monthly Financial Report — ${r.label}`,
        summary,
        columns: ['Category', 'Amount', 'Transactions'],
        rows: r.categoryBreakdown.map((c) => [c.name, c.amount, c.count]),
      };
    }
    case 'yearly': {
      const r = await getYearlyReport(householdId, params.year);
      const summary: [string, string | number][] = [['Total Income', r.totalIncome], ['Total Expenses', r.totalExpenses], ['Net Income', r.netIncome]];
      return {
        title: `Yearly Report — ${r.year}`,
        summary,
        columns: ['Month', 'Income', 'Expenses', 'Net'],
        rows: r.months.map((m) => [m.month, m.income, m.expenses, Math.round((m.income - m.expenses) * 100) / 100]),
      };
    }
    case 'expense': {
      const r = await getExpenseReport(householdId, from, to);
      const summary: [string, string | number][] = [['Total Expenses', r.total]];
      return {
        title: `Expense Report — ${from.toDateString()} to ${to.toDateString()}`,
        summary,
        columns: ['Category', 'Amount', 'Transactions'],
        rows: r.categoryBreakdown.map((c) => [c.name, c.amount, c.count]),
      };
    }
    case 'account': {
      const r = await getAccountReport(householdId, from, to);
      const summary: [string, string | number][] = [];
      return {
        title: `Account Report — ${from.toDateString()} to ${to.toDateString()}`,
        summary,
        columns: ['Account', 'Currency', 'Income', 'Expense', 'Transfers Out', 'Transfers In', 'Transactions'],
        rows: r.rows.map((a) => [a.account, a.currency, a.income, a.expense, a.transferOut, a.transferIn, a.transactionCount]),
      };
    }
    case 'cashflow': {
      const r = await getYearlyReport(householdId, params.year);
      const summary: [string, string | number][] = [['Total Income', r.totalIncome], ['Total Expenses', r.totalExpenses], ['Net Cash Flow', r.netIncome]];
      return {
        title: `Cash Flow Report — ${r.year}`,
        summary,
        columns: ['Month', 'Income', 'Expenses', 'Net Cash Flow'],
        rows: r.months.map((m) => [m.month, m.income, m.expenses, Math.round((m.income - m.expenses) * 100) / 100]),
      };
    }
    case 'savings': {
      const goals = await getSavingsReport(householdId);
      const summary: [string, string | number][] = [];
      return {
        title: 'Savings Report',
        summary,
        columns: ['Goal', 'Currency', 'Target', 'Current', 'Progress %'],
        rows: goals.map((g) => [g.name, g.currency, g.target, g.current, g.progressPct]),
      };
    }
    case 'debt': {
      const debts = await getDebtReport(householdId);
      const summary: [string, string | number][] = [];
      return {
        title: 'Debt Report',
        summary,
        columns: ['Creditor', 'Currency', 'Original', 'Remaining', 'Paid Off %'],
        rows: debts.map((d) => [d.creditor, d.currency, d.original, d.remaining, d.paidOffPct]),
      };
    }
  }
}
