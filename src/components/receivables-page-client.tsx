'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Users, Pencil, Trash2, CircleDollarSign, History } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { ReceivableForm } from '@/components/forms/receivable-form';
import { ReceivablePaymentForm } from '@/components/forms/receivable-payment-form';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useAppData } from '@/components/app-data-context';
import { formatMoney } from '@/lib/currency';
import { formatDateLong } from '@/lib/utils';
import { deleteReceivable } from '@/lib/actions/receivables';
import { toast } from 'sonner';

const STATUS_TONE: Record<string, any> = { UNPAID: 'warning', PARTIAL: 'primary', PAID: 'success' };

export function ReceivablesPageClient({ receivables }: { receivables: any[] }) {
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
    const ok = await confirm('Delete this receivable?', 'Its payment history will be removed too.');
    if (!ok) return;
    const res = await deleteReceivable(id);
    if (res.ok) { toast.success('Receivable deleted'); router.refresh(); }
    else toast.error(res.error);
  }

  const sameCurrency = receivables.filter((r) => r.currency === household.baseCurrency && r.status !== 'PAID');
  const totalOwed = sameCurrency.reduce((s, r) => {
    const paid = r.payments.reduce((sum: number, p: any) => sum + p.amount, 0);
    return s + (r.amount - paid);
  }, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Receivables</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Money owed to your household</p>
        </div>
        <button className="btn-primary" onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /> Add Receivable</button>
      </div>

      <StatCard label={`Total Owed To You (${household.baseCurrency})`} value={formatMoney(totalOwed, household.baseCurrency)} icon={Users} />

      {receivables.length === 0 ? (
        <EmptyState icon={Users} title="No receivables recorded" description="Track money that friends, family, or clients owe you." action={<button className="btn-primary" onClick={() => setModalOpen(true)}>Add a receivable</button>} />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {receivables.map((r) => {
            const paid = r.payments.reduce((s: number, p: any) => s + p.amount, 0);
            const remaining = r.amount - paid;
            return (
              <div key={r.id} className="card p-4 sm:p-5">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-semibold">{r.person}</p>
                  <Badge tone={STATUS_TONE[r.status]}>{r.status.charAt(0) + r.status.slice(1).toLowerCase()}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{r.description || 'No description'} · {formatDateLong(r.date)}{r.dueDate ? ` · Due ${formatDateLong(r.dueDate)}` : ''}</p>
                <p className="text-2xl font-semibold tracking-tight">{formatMoney(remaining, r.currency)}</p>
                <p className="text-xs text-muted-foreground mt-1">of {formatMoney(r.amount, r.currency)} total{paid > 0 ? ` · ${formatMoney(paid, r.currency)} received` : ''}</p>
                <div className="flex items-center gap-2 mt-4">
                  {r.status !== 'PAID' && <button className="btn-primary btn-sm flex-1" onClick={() => setPaying(r)}><CircleDollarSign className="h-3.5 w-3.5" /> Record Payment</button>}
                  <button className="btn-outline btn-sm !px-2.5" onClick={() => setViewingHistory(r)} title="Payment history"><History className="h-3.5 w-3.5" /></button>
                  <button className="btn-outline btn-sm !px-2.5" onClick={() => { setEditing(r); setModalOpen(true); }}><Pencil className="h-3.5 w-3.5" /></button>
                  <button className="btn-outline btn-sm !px-2.5 text-danger" onClick={() => onDelete(r.id)}><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={close} title={editing ? 'Edit receivable' : 'Add receivable'}>
        <ReceivableForm
          initial={editing ? { id: editing.id, person: editing.person, amount: String(editing.amount), currency: editing.currency, date: editing.date.toISOString().slice(0, 10), dueDate: editing.dueDate?.toISOString().slice(0, 10), description: editing.description ?? '', notes: editing.notes ?? '' } : undefined}
          onSuccess={close}
        />
      </Modal>

      {paying && (
        <Modal open onClose={closePay} title={`Record payment from ${paying.person}`} size="sm">
          <ReceivablePaymentForm receivable={paying} alreadyPaid={paying.payments.reduce((s: number, p: any) => s + p.amount, 0)} onSuccess={closePay} />
        </Modal>
      )}

      {viewingHistory && (
        <Modal open onClose={() => setViewingHistory(null)} title={`${viewingHistory.person} — payment history`} size="sm">
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
