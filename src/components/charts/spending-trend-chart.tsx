'use client';

import { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatMoney } from '@/lib/currency';
import { cn } from '@/lib/utils';

type RangeKey = '7d' | '30d' | '3m' | '6m' | '12m';
const RANGES: { key: RangeKey; label: string; days: number }[] = [
  { key: '7d', label: '7 days', days: 7 },
  { key: '30d', label: '30 days', days: 30 },
  { key: '3m', label: '3 months', days: 90 },
  { key: '6m', label: '6 months', days: 182 },
  { key: '12m', label: '12 months', days: 365 },
];

export function SpendingTrendChart({ data, currency }: { data: { date: string; amount: number }[]; currency: string }) {
  const [range, setRange] = useState<RangeKey>('30d');

  const chartData = useMemo(() => {
    const days = RANGES.find((r) => r.key === range)!.days;
    const slice = data.slice(-days);
    // For longer ranges, bucket into weeks/months so the chart stays legible.
    if (days <= 30) return slice.map((d) => ({ label: d.date.slice(5), amount: d.amount }));
    const bucketSize = days <= 90 ? 7 : 30;
    const buckets: { label: string; amount: number }[] = [];
    for (let i = 0; i < slice.length; i += bucketSize) {
      const chunk = slice.slice(i, i + bucketSize);
      const sum = chunk.reduce((s, d) => s + d.amount, 0);
      buckets.push({ label: chunk[0]?.date.slice(5) ?? '', amount: Math.round(sum * 100) / 100 });
    }
    return buckets;
  }, [data, range]);

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={cn('btn-sm rounded-full px-3', range === r.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70')}
          >
            {r.label}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} minTickGap={20} />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} width={40} />
          <Tooltip formatter={(value: number) => formatMoney(value, currency)} contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', fontSize: 13 }} />
          <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={2} fill="url(#spendGradient)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
