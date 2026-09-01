'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, HandCoins, Pencil, Trash2, CircleDollarSign, History } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { DebtForm } from '@/components/forms/debt-form';
import { DebtPaymentForm } from '@/components/forms/debt-payment-form';
import { Progress } from '@/components/ui/progress';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useAppData } from '@/components/app-data-context';
import { formatMoney } from '@/lib/currency';
import { formatDateLong } from '@/lib/utils';
import { deleteDebt } from '@/lib/actions/debts';
import { toast } from 'sonner';

export function DebtsPageClient({ debts }: { debts: any[] }) {
  const { household } = useAppData();
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [paying, setPaying] = useState<any>(null);
  const [viewingHistory, setViewingHistory] = useState<any>(null);
  const { confirm, dialog } = useConfirm();

  function close() { setModalOpen(false); setEditing(null); router.refresh(); }
  function closePay() { setPaying(null); router.refresh(); }

  async function onDelete(id: string) {
    const ok = await confirm('Delete this debt?', 'Its payment history will be removed too.');
    if (!ok) return;
    const res = await deleteDebt(id);
    if (res.ok) { toast.success('Debt deleted'); router.refresh(); }
    else toast.error(res.error);
  }

  const sameCurrency = debts.filter((d) => d.currency === household.baseCurrency);
  const totalDebt = sameCurrency.reduce((s, d) => s + d.remainingAmount, 0);
  const monthlyPayments = sameCurrency.reduce((s, d) => s + (d.monthlyPayment ?? 0), 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Debts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Money your household owes</p>
        </div>
        <button className="btn-primary" onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /> Add Debt</button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <StatCard label={`Total Debt (${household.baseCurrency})`} value={formatMoney(totalDebt, household.baseCurrency)} tone="warning" />
        <StatCard label={`Monthly Debt Payments (${household.baseCurrency})`} value={formatMoney(monthlyPayments, household.baseCurrency)} />
      </div>

      {debts.length === 0 ? (
        <EmptyState icon={HandCoins} title="No debts recorded" description="Track loans, credit card balances, or anything else you owe." action={<button className="btn-primary" onClick={() => setModalOpen(true)}>Add a debt</button>} />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {debts.map((d) => {
            const pct = Math.min(100, Math.round(((d.originalAmount - d.remainingAmount) / d.originalAmount) * 100));
            return (
              <div key={d.id} className="card p-4 sm:p-5">
                <p className="font-semibold">{d.creditor}</p>
                <p className="text-xs text-muted-foreground mb-3">
                  {d.interestRate > 0 ? `${d.interestRate}% interest · ` : ''}{d.dueDate ? `Due ${formatDateLong(d.dueDate)}` : 'No due date'}
                </p>
                <Progress value={pct} status={pct >= 80 ? 'safe' : pct >= 40 ? 'near' : 'over'} className="mb-2" />
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium">{formatMoney(d.remainingAmount, d.currency)} remaining</span>
                  <span className="text-muted-foreground">{pct}% paid off</span>
                </div>
                <p className="text-xs text-muted-foreground">of {formatMoney(d.originalAmount, d.currency)} original{d.monthlyPayment ? ` · ${formatMoney(d.monthlyPayment, d.currency)}/mo` : ''}</p>
                <div className="flex items-center gap-2 mt-4">
                  {d.remainingAmount > 0 && <button className="btn-primary btn-sm flex-1" onClick={() => setPaying(d)}><CircleDollarSign className="h-3.5 w-3.5" /> Add Payment</button>}
                  <button className="btn-outline btn-sm !px-2.5" onClick={() => setViewingHistory(d)} title="Payment history"><History className="h-3.5 w-3.5" /></button>
                  <button className="btn-outline btn-sm !px-2.5" onClick={() => { setEditing(d); setModalOpen(true); }}><Pencil className="h-3.5 w-3.5" /></button>
                  <button className="btn-outline btn-sm !px-2.5 text-danger" onClick={() => onDelete(d.id)}><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={close} title={editing ? 'Edit debt' : 'Add debt'}>
        <DebtForm
          initial={editing ? { id: editing.id, creditor: editing.creditor, originalAmount: String(editing.originalAmount), remainingAmount: String(editing.remainingAmount), currency: editing.currency, dueDate: editing.dueDate?.toISOString().slice(0, 10), interestRate: String(editing.interestRate), monthlyPayment: editing.monthlyPayment ? String(editing.monthlyPayment) : '', notes: editing.notes ?? '' } : undefined}
          onSuccess={close}
        />
      </Modal>

      {paying && (
        <Modal open onClose={closePay} title={`Pay ${paying.creditor}`} size="sm">
          <DebtPaymentForm debt={paying} onSuccess={closePay} />
        </Modal>
      )}

      {viewingHistory && (
        <Modal open onClose={() => setViewingHistory(null)} title={`${viewingHistory.creditor} — payment history`} size="sm">
          {viewingHistory.payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {viewingHistory.payments.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-muted-foreground">{formatDateLong(p.date)}</span>
                  <span className="font-medium">{formatMoney(p.amount, viewingHistory.currency)}</span>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
      {dialog}
    </div>
  );
}
