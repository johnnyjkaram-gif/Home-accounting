'use client';

import { useRouter, usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Repeat, HandCoins } from 'lucide-react';
import { useAppData } from '@/components/app-data-context';
import { formatMoney } from '@/lib/currency';
import { MONTH_NAMES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { CalendarEvent } from '@/lib/server/calendar';

const KIND_STYLE: Record<CalendarEvent['kind'], { icon: any; color: string }> = {
  income: { icon: TrendingUp, color: 'bg-success/10 text-success' },
  expense: { icon: TrendingDown, color: 'bg-danger/10 text-danger' },
  bill: { icon: Repeat, color: 'bg-warning/10 text-warning' },
  subscription: { icon: Repeat, color: 'bg-primary/10 text-primary' },
  debt: { icon: HandCoins, color: 'bg-danger/10 text-danger' },
};

export function CalendarPageClient({ year, month, events }: { year: number; month: number; events: CalendarEvent[] }) {
  const { household } = useAppData();
  const router = useRouter();
  const pathname = usePathname();

  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startWeekday = firstDay.getDay(); // 0=Sun

  const eventsByDay = new Map<number, CalendarEvent[]>();
  events.forEach((e) => {
    const day = Number(e.date.slice(8, 10));
    eventsByDay.set(day, [...(eventsByDay.get(day) ?? []), e]);
  });

  const totalIncoming = events.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0);
  const totalOutgoing = events.filter((e) => e.amount < 0).reduce((s, e) => s + e.amount, 0);

  function go(delta: number) {
    let m = month + delta, y = year;
    if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; }
    router.push(`${pathname}?year=${y}&month=${m}`);
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const cells: (number | null)[] = [...Array(startWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Financial Calendar</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Expected income, bills, subscriptions, and debt payments.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-outline btn-sm !px-2.5" onClick={() => go(-1)}><ChevronLeft className="h-4 w-4" /></button>
          <span className="font-medium w-36 text-center">{MONTH_NAMES[month - 1]} {year}</span>
          <button className="btn-outline btn-sm !px-2.5" onClick={() => go(1)}><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card p-4">
          <p className="text-xs text-muted-foreground">Expected Incoming</p>
          <p className="text-xl font-semibold text-success mt-1">{formatMoney(totalIncoming, household.baseCurrency)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted-foreground">Expected Outgoing</p>
          <p className="text-xl font-semibold text-danger mt-1">{formatMoney(Math.abs(totalOutgoing), household.baseCurrency)}</p>
        </div>
      </div>

      <div className="card p-3 sm:p-4 overflow-x-auto">
        <div className="grid grid-cols-7 gap-1.5 min-w-[700px]">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="text-xs font-medium text-muted-foreground text-center py-1.5">{d}</div>
          ))}
          {cells.map((day, i) => {
            if (day === null) return <div key={i} />;
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayEvents = eventsByDay.get(day) ?? [];
            const isToday = dateStr === todayStr;
            return (
              <div key={i} className={cn('min-h-[92px] rounded-xl border border-border p-1.5 space-y-1', isToday && 'ring-2 ring-primary')}>
                <p className={cn('text-xs font-medium', isToday ? 'text-primary' : 'text-muted-foreground')}>{day}</p>
                <div className="space-y-1 max-h-[68px] overflow-y-auto no-scrollbar">
                  {dayEvents.map((e, idx) => {
                    const style = KIND_STYLE[e.kind];
                    return (
                      <div key={idx} className={cn('rounded-md px-1.5 py-1 text-[10px] leading-tight font-medium truncate', style.color)} title={`${e.label}: ${formatMoney(e.amount, e.currency)}`}>
                        {e.amount > 0 ? '+' : ''}{formatMoney(e.amount, e.currency)} {e.label}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card p-4 sm:p-5">
        <h2 className="font-semibold mb-3">This month, in order</h2>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing scheduled — add recurring income, bills, or subscriptions to see them here.</p>
        ) : (
          <div className="divide-y divide-border">
            {events.map((e, i) => {
              const style = KIND_STYLE[e.kind];
              const Icon = style.icon;
              return (
                <div key={i} className="flex items-center gap-3 py-2.5">
                  <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', style.color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{e.label}</p>
                    <p className="text-xs text-muted-foreground">{new Date(e.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                  </div>
                  <p className={cn('text-sm font-semibold shrink-0', e.amount > 0 ? 'text-success' : 'text-danger')}>{e.amount > 0 ? '+' : ''}{formatMoney(e.amount, e.currency)}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
