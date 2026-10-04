'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Plus, TrendingUp, TrendingDown, ArrowLeftRight, HandCoins, ChevronDown } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { TransactionForm } from '@/components/forms/transaction-form';
import { TransferForm } from '@/components/forms/transfer-form';
import { DebtForm } from '@/components/forms/debt-form';
import { cn } from '@/lib/utils';

type Action = 'income' | 'expense' | 'transfer' | 'debt' | null;

export function QuickAddMenu({
  className,
  variant = 'default',
}: {
  className?: string;
  /** 'fab' is the floating round button used on mobile — see app layout.tsx.
   * It sits near the bottom of the screen, so its menu opens upward
   * instead of downward to stay on screen. */
  variant?: 'default' | 'fab';
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<Action>(null);
  const router = useRouter();
  const isFab = variant === 'fab';

  function close() {
    setActive(null);
    router.refresh();
  }

  // "Add Receivable" was dropped from here along with the Receivables section
  // itself — this household doesn't use it. Re-add it (icon: Users from
  // lucide-react, form: ReceivableForm) if that changes.
  const items: { key: Action; label: string; icon: any }[] = [
    { key: 'income', label: 'Add Income', icon: TrendingUp },
    { key: 'expense', label: 'Add Expense', icon: TrendingDown },
    { key: 'transfer', label: 'Transfer', icon: ArrowLeftRight },
    { key: 'debt', label: 'Add Debt', icon: HandCoins },
  ];

  return (
    <div className={cn('relative', className)}>
      <button
        className={cn(
          isFab
            ? 'h-14 w-14 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg flex items-center justify-center'
            : 'btn-primary',
        )}
        onClick={() => setOpen((o) => !o)}
        aria-label="Quick Add"
      >
        {isFab ? (
          <Plus className="h-6 w-6" />
        ) : (
          <>
            <Plus className="h-4 w-4" /> Quick Add <ChevronDown className="h-3.5 w-3.5" />
          </>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className={cn('absolute right-0 w-56 card p-1.5 z-50 animate-fade-in', isFab ? 'bottom-full mb-2' : 'mt-2')}>
            {items.map((item) => (
              <button
                key={item.key}
                className="flex items-center gap-2.5 w-full rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted text-left"
                onClick={() => { setActive(item.key); setOpen(false); }}
              >
                <item.icon className="h-4 w-4 text-primary" />
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}

      <Modal open={active === 'income'} onClose={close} title="Add Income">
        <TransactionForm type="INCOME" onSuccess={close} />
      </Modal>
      <Modal open={active === 'expense'} onClose={close} title="Add Expense">
        <TransactionForm type="EXPENSE" onSuccess={close} />
      </Modal>
      <Modal open={active === 'transfer'} onClose={close} title="Transfer Money">
        <TransferForm onSuccess={close} />
      </Modal>
      <Modal open={active === 'debt'} onClose={close} title="Add Debt">
        <DebtForm onSuccess={close} />
      </Modal>
    </div>
  );
}
