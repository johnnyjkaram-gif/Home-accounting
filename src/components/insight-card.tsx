import { cn } from '@/lib/utils';
import { Lightbulb, TrendingUp, TriangleAlert, CircleAlert } from 'lucide-react';
import type { Insight } from '@/lib/insights';

const TONE_STYLE: Record<Insight['tone'], { bg: string; icon: any; iconColor: string }> = {
  positive: { bg: 'bg-success/10', icon: TrendingUp, iconColor: 'text-success' },
  neutral: { bg: 'bg-primary/10', icon: Lightbulb, iconColor: 'text-primary' },
  warning: { bg: 'bg-warning/10', icon: TriangleAlert, iconColor: 'text-warning' },
  danger: { bg: 'bg-danger/10', icon: CircleAlert, iconColor: 'text-danger' },
};

export function InsightCard({ insight }: { insight: Insight }) {
  const style = TONE_STYLE[insight.tone];
  const Icon = style.icon;
  return (
    <div className="card p-4 flex items-start gap-3">
      <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center shrink-0', style.bg)}>
        <Icon className={cn('h-[18px] w-[18px]', style.iconColor)} />
      </div>
      <p className="text-sm leading-relaxed">{insight.message}</p>
    </div>
  );
}
