import { cn } from '@/lib/utils';

export function Progress({ value, status = 'safe', className }: { value: number; status?: 'safe' | 'near' | 'over'; className?: string }) {
  const color = { safe: 'bg-success', near: 'bg-warning', over: 'bg-danger' }[status];
  return (
    <div className={cn('h-2 w-full rounded-full bg-muted overflow-hidden', className)}>
      <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
