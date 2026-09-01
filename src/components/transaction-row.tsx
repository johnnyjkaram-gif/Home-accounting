import { formatMoney } from '@/lib/currency';
import { formatDateLong } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, HandCoins, Users } from 'lucide-react';

const TYPE_META: Record<string, { icon: any; color: string; sign: string }> = {
  INCOME: { icon: ArrowDownLeft, color: 'text-success bg-success/10', sign: '+' },
  EXPENSE: { icon: ArrowUpRight, color: 'text-danger bg-danger/10', sign: '-' },
  TRANSFER: { icon: ArrowLeftRight, color: 'text-primary bg-primary/10', sign: '' },
  DEBT_PAYMENT: { icon: HandCoins, color: 'text-warning bg-warning/10', sign: '-' },
  RECEIVABLE_PAYMENT: { icon: Users, color: 'text-success bg-success/10', sign: '+' },
};

export function TransactionRow({ tx }: { tx: any }) {
  const meta = TYPE_META[tx.type] ?? TYPE_META.EXPENSE;
  const Icon = meta.icon;
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center shrink-0', meta.color)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{tx.description || tx.payee || tx.category?.name || tx.type}</p>
        <p className="text-xs text-muted-foreground truncate">{tx.account?.name} · {formatDateLong(tx.date)}</p>
      </div>
      <p className={cn('text-sm font-semibold shrink-0', tx.type === 'INCOME' || tx.type === 'RECEIVABLE_PAYMENT' ? 'text-success' : tx.type === 'EXPENSE' || tx.type === 'DEBT_PAYMENT' ? 'text-danger' : 'text-foreground')}>
        {meta.sign}{formatMoney(tx.amount, tx.currency)}
      </p>
    </div>
  );
}
