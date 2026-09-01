'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Plus, PiggyBank, Pencil, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { BudgetForm } from '@/components/forms/budget-form';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { formatMoney } from '@/lib/currency';
import { MONTH_NAMES } from '@/lib/constants';
import { budgetStatus, budgetProgressPct } from '@/lib/budget';
import { deleteBudget } from '@/lib/actions/budgets';
import { toast } from 'sonner';

const STATUS_LABEL = { safe: 'Safe', near: 'Near limit', over: 'Over budget' } as const;
const STATUS_TONE = { safe: 'success', near: 'warning', over: 'danger' } as const;

export function BudgetsPageClient({ budgets, categories, month, year }: { budgets: any[]; categories: any[]; month: number; year: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const { confirm, dialog } = useConfirm();

  function close() { setModalOpen(false); setEditing(null); router.refresh(); }

  async function onDelete(id: string) {
    const ok = await confirm('Delete this budget?');
    if (!ok) return;
    const res = await deleteBudget(id);
    if (res.ok) { toast.success('Budget deleted'); router.refresh(); }
    else toast.error(res.error);
  }

  function updatePeriod(m: number, y: number) {
    router.push(`${pathname}?month=${m}&year=${y}`);
  }

  const totalBudgeted = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Budgets</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {formatMoney(totalSpent, budgets[0]?.currency ?? 'USD')} spent of {formatMoney(totalBudgeted, budgets[0]?.currency ?? 'USD')} budgeted
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select className="select w-auto" value={month} onChange={(e) => updatePeriod(Number(e.target.value), year)}>
            {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select className="select w-auto" value={year} onChange={(e) => updatePeriod(month, Number(e.target.value))}>
            {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn-primary" onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /> Add Budget</button>
        </div>
      </div>

      {budgets.length === 0 ? (
        <EmptyState icon={PiggyBank} title="No budgets for this period" description="Set spending limits by category to keep your household on track." action={<button className="btn-primary" onClick={() => setModalOpen(true)}>Create a budget</button>} />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {budgets.map((b) => {
            const status = budgetStatus(b.spent, b.amount);
            const remaining = b.amount - b.spent;
            return (
              <div key={b.id} className="card p-4 sm:p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <p className="font-semibold flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: b.category.color }} />{b.category.name}</p>
                  <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
                </div>
                <Progress value={budgetProgressPct(b.spent, b.amount)} status={status} className="mb-2" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{formatMoney(b.spent, b.currency)} of {formatMoney(b.amount, b.currency)}</span>
                  <span className={remaining < 0 ? 'text-danger font-medium' : 'text-muted-foreground'}>
                    {remaining >= 0 ? `${formatMoney(remaining, b.currency)} left` : `${formatMoney(Math.abs(remaining), b.currency)} over`}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <button className="btn-outline btn-sm flex-1" onClick={() => { setEditing(b); setModalOpen(true); }}><Pencil className="h-3.5 w-3.5" /> Edit</button>
                  <button className="btn-outline btn-sm !px-2.5 text-danger" onClick={() => onDelete(b.id)}><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={close} title={editing ? 'Edit budget' : 'Add budget'}>
        <BudgetForm
          defaultMonth={month}
          defaultYear={year}
          initial={editing ? { id: editing.id, categoryId: editing.categoryId, amount: String(editing.amount), currency: editing.currency, period: editing.period, month: editing.month, year: editing.year } : undefined}
          onSuccess={close}
        />
      </Modal>
      {dialog}
    </div>
  );
}
