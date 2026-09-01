import { cn } from '@/lib/utils';

const TONE_CLASSES: Record<string, string> = {
  default: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
};

export function Badge({ tone = 'default', children, className }: { tone?: keyof typeof TONE_CLASSES; children: React.ReactNode; className?: string }) {
  return <span className={cn('badge', TONE_CLASSES[tone], className)}>{children}</span>;
}
