'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { formatMoney } from '@/lib/currency';

export function IncomeExpenseChart({ data, currency }: { data: { month: string; income: number; expenses: number }[]; currency: string }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} width={40} />
        <Tooltip
          formatter={(value: number, name: string) => [formatMoney(value, currency), name === 'income' ? 'Income' : 'Expenses']}
          contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', fontSize: 13 }}
        />
        <Legend formatter={(v) => (v === 'income' ? 'Income' : 'Expenses')} wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="income" fill="#22c55e" radius={[6, 6, 0, 0]} maxBarSize={28} />
        <Bar dataKey="expenses" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
