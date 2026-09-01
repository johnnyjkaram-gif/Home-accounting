'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Plus, TrendingUp, TrendingDown, ArrowLeftRight, HandCoins, Users, ChevronDown } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { TransactionForm } from '@/components/forms/transaction-form';
import { TransferForm } from '@/components/forms/transfer-form';
import { DebtForm } from '@/components/forms/debt-form';
import { ReceivableForm } from '@/components/forms/receivable-form';
import { cn } from '@/lib/utils';

type Action = 'income' | 'expense' | 'transfer' | 'debt' | 'receivable' | null;

export function QuickAddMenu({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<Action>(null);
  const router = useRouter();

  function close() {
    setActive(null);
    router.refresh();
  }

  const items: { key: Action; label: string; icon: any }[] = [
    { key: 'income', label: 'Add Income', icon: TrendingUp },
    { key: 'expense', label: 'Add Expense', icon: TrendingDown },
    { key: 'transfer', label: 'Transfer', icon: ArrowLeftRight },
    { key: 'debt', label: 'Add Debt', icon: HandCoins },
    { key: 'receivable', label: 'Add Receivable', icon: Users },
  ];

  return (
    <div className={cn('relative', className)}>
      <button className="btn-primary" onClick={() => setOpen((o) => !o)}>
        <Plus className="h-4 w-4" /> Quick Add <ChevronDown className="h-3.5 w-3.5" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-56 card p-1.5 z-50 animate-fade-in">
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
      <Modal open={active === 'receivable'} onClose={close} title="Add Receivable">
        <ReceivableForm onSuccess={close} />
      </Modal>
    </div>
  );
}
