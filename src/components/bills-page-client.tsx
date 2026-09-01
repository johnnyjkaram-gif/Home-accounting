'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Repeat, Pencil, Trash2, CheckCircle2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { BillForm } from '@/components/forms/bill-form';
import { PayForm } from '@/components/forms/pay-form';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { formatMoney } from '@/lib/currency';
import { formatDateLong } from '@/lib/utils';
import { FREQUENCY_LABELS } from '@/lib/constants';
import { deleteBill, payBill } from '@/lib/actions/bills';
import { toast } from 'sonner';

const STATUS_TONE: Record<string, any> = { UPCOMING: 'default', DUE_TODAY: 'warning', PAID: 'success', OVERDUE: 'danger' };
const STATUS_LABEL: Record<string, string> = { UPCOMING: 'Upcoming', DUE_TODAY: 'Due today', PAID: 'Paid', OVERDUE: 'Overdue' };

export function BillsPageClient({ bills }: { bills: any[] }) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [paying, setPaying] = useState<any>(null);
  const [filter, setFilter] = useState<string>('all');
  const { confirm, dialog } = useConfirm();

  function close() { setModalOpen(false); setEditing(null); router.refresh(); }
  function closePay() { setPaying(null); router.refresh(); }

  async function onDelete(id: string) {
    const ok = await confirm('Delete this bill?', 'Its payment history will remain in your transactions, but future reminders will stop.');
    if (!ok) return;
    const res = await deleteBill(id);
    if (res.ok) { toast.success('Bill deleted'); router.refresh(); }
    else toast.error(res.error);
  }

  const filtered = filter === 'all' ? bills : bills.filter((b) => b.status === filter);
  const totalUpcoming = bills.filter((b) => b.status !== 'PAID').reduce((s, b) => s + b.amount, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bills</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{bills.length} recurring bills tracked</p>
        </div>
        <button className="btn-primary" onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /> Add Bill</button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {['all', 'OVERDUE', 'DUE_TODAY', 'UPCOMING', 'PAID'].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`btn-sm rounded-full px-3 ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>
            {f === 'all' ? 'All' : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Repeat} title="No bills here" description="Add rent, utilities, subscriptions, or any recurring payment to track due dates." action={<button className="btn-primary" onClick={() => setModalOpen(true)}>Add a bill</button>} />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map((b) => (
            <div key={b.id} className="card p-4 sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{b.name}</p>
                  <p className="text-xs text-muted-foreground">{b.category?.name ?? 'Uncategorized'} · {FREQUENCY_LABELS[b.frequency]}</p>
                </div>
                <Badge tone={STATUS_TONE[b.status]}>{STATUS_LABEL[b.status]}</Badge>
              </div>
              <p className="text-2xl font-semibold tracking-tight mt-3">{formatMoney(b.amount, b.currency)}</p>
              <p className="text-xs text-muted-foreground mt-1">Due {formatDateLong(b.dueDate)}{b.lastPaidDate ? ` · Last paid ${formatDateLong(b.lastPaidDate)}` : ''}</p>
              <div className="flex items-center gap-2 mt-4">
                <button className="btn-primary btn-sm flex-1" onClick={() => setPaying(b)}><CheckCircle2 className="h-3.5 w-3.5" /> Mark Paid</button>
                <button className="btn-outline btn-sm !px-2.5" onClick={() => { setEditing(b); setModalOpen(true); }}><Pencil className="h-3.5 w-3.5" /></button>
                <button className="btn-outline btn-sm !px-2.5 text-danger" onClick={() => onDelete(b.id)}><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={close} title={editing ? 'Edit bill' : 'Add bill'}>
        <BillForm
          initial={editing ? { id: editing.id, name: editing.name, amount: String(editing.amount), currency: editing.currency, dueDate: editing.dueDate.toISOString().slice(0, 10), frequency: editing.frequency, categoryId: editing.categoryId ?? '', accountId: editing.accountId ?? '', autoReminder: editing.autoReminder, notes: editing.notes ?? '' } : undefined}
          onSuccess={close}
        />
      </Modal>

      {paying && (
        <Modal open onClose={closePay} title={`Pay ${paying.name}`} description={`${formatMoney(paying.amount, paying.currency)} due ${formatDateLong(paying.dueDate)}`} size="sm">
          <PayForm action={payBill} id={paying.id} onSuccess={closePay} />
        </Modal>
      )}
      {dialog}
    </div>
  );
}
