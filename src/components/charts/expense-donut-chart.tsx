'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { formatMoney } from '@/lib/currency';
import { EmptyState } from '@/components/ui/empty-state';
import { PieChart as PieIcon } from 'lucide-react';

export function ExpenseDonutChart({ data, currency }: { data: { name: string; amount: number; color: string }[]; currency: string }) {
  const total = data.reduce((s, d) => s + d.amount, 0);

  if (data.length === 0) {
    return <EmptyState icon={PieIcon} title="No expenses yet" description="Once you log expenses, your category breakdown appears here." />;
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <ResponsiveContainer width="100%" height={220} className="max-w-[220px]">
        <PieChart>
          <Pie data={data} dataKey="amount" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={2}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} stroke="hsl(var(--card))" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number, name: string) => [formatMoney(value, currency), name]} contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', fontSize: 13 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex-1 w-full space-y-1.5 max-h-[220px] overflow-y-auto no-scrollbar">
        {data.map((d, i) => (
          <div key={i} className="flex items-center justify-between text-sm gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: d.color }} />
              <span className="truncate">{d.name}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0 text-muted-foreground">
              <span>{total > 0 ? Math.round((d.amount / total) * 100) : 0}%</span>
              <span className="font-medium text-foreground">{formatMoney(d.amount, currency)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
