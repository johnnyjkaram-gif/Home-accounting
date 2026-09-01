import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'default',
  sub,
  className,
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  tone?: 'default' | 'positive' | 'negative' | 'warning';
  sub?: string;
  className?: string;
}) {
  const toneClass = {
    default: 'text-foreground',
    positive: 'text-success',
    negative: 'text-danger',
    warning: 'text-warning',
  }[tone];

  const iconBg = {
    default: 'bg-primary/10 text-primary',
    positive: 'bg-success/10 text-success',
    negative: 'bg-danger/10 text-danger',
    warning: 'bg-warning/10 text-warning',
  }[tone];

  return (
    <div className={cn('card p-4 sm:p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs sm:text-sm text-muted-foreground font-medium truncate">{label}</p>
          <p className={cn('text-xl sm:text-2xl font-semibold tracking-tight mt-1 truncate', toneClass)}>{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        {Icon && (
          <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
            <Icon className="h-[18px] w-[18px]" />
          </div>
        )}
      </div>
    </div>
  );
}
