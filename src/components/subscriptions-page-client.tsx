'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Repeat, Pencil, Trash2, CheckCircle2, PauseCircle, PlayCircle } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { SubscriptionForm } from '@/components/forms/subscription-form';
import { PayForm } from '@/components/forms/pay-form';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useAppData } from '@/components/app-data-context';
import { formatMoney } from '@/lib/currency';
import { formatDateLong } from '@/lib/utils';
import { deleteSubscription, paySubscription, toggleSubscriptionActive } from '@/lib/actions/subscriptions';
import { toast } from 'sonner';

export function SubscriptionsPageClient({ subscriptions }: { subscriptions: any[] }) {
  const { household } = useAppData();
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [paying, setPaying] = useState<any>(null);
  const { confirm, dialog } = useConfirm();

  function close() { setModalOpen(false); setEditing(null); router.refresh(); }
  function closePay() { setPaying(null); router.refresh(); }

  async function onDelete(id: string) {
    const ok = await confirm('Delete this subscription?', 'This cannot be undone.');
    if (!ok) return;
    const res = await deleteSubscription(id);
    if (res.ok) { toast.success('Subscription deleted'); router.refresh(); }
    else toast.error(res.error);
  }

  async function onToggle(id: string, active: boolean) {
    const res = await toggleSubscriptionActive(id, active);
    if (res.ok) { toast.success(active ? 'Subscription reactivated' : 'Subscription cancelled'); router.refresh(); }
    else toast.error(res.error);
  }

  const active = subscriptions.filter((s) => s.active);
  // Simplified same-currency total; a precise multi-currency total needs live rates (shown per-item instead).
  const sameCurrency = active.filter((s) => s.currency === household.baseCurrency);
  const monthlyCost = sameCurrency.reduce((sum, s) => sum + (s.billingCycle === 'YEARLY' ? s.amount / 12 : s.billingCycle === 'WEEKLY' ? s.amount * 4.345 : s.amount), 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Subscriptions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{active.length} active subscriptions</p>
        </div>
        <button className="btn-primary" onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /> Add Subscription</button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <StatCard label={`Monthly Cost (${household.baseCurrency})`} value={formatMoney(monthlyCost, household.baseCurrency)} sub="Same-currency subscriptions" />
        <StatCard label={`Yearly Cost (${household.baseCurrency})`} value={formatMoney(monthlyCost * 12, household.baseCurrency)} />
      </div>

      {subscriptions.length === 0 ? (
        <EmptyState icon={Repeat} title="No subscriptions tracked" description="Add Netflix, Spotify, software, or any recurring service to spot unnecessary spending." action={<button className="btn-primary" onClick={() => setModalOpen(true)}>Add a subscription</button>} />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {subscriptions.map((s) => (
            <div key={s.id} className={`card p-4 sm:p-5 ${!s.active ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.category?.name ?? 'Uncategorized'} · {s.billingCycle.charAt(0) + s.billingCycle.slice(1).toLowerCase()}</p>
                </div>
                <Badge tone={s.active ? 'success' : 'default'}>{s.active ? 'Active' : 'Cancelled'}</Badge>
              </div>
              <p className="text-2xl font-semibold tracking-tight mt-3">{formatMoney(s.amount, s.currency)}</p>
              <p className="text-xs text-muted-foreground mt-1">Next payment {formatDateLong(s.nextPaymentDate)}</p>
              <div className="flex items-center gap-2 mt-4">
                {s.active && <button className="btn-primary btn-sm flex-1" onClick={() => setPaying(s)}><CheckCircle2 className="h-3.5 w-3.5" /> Mark Paid</button>}
                <button className="btn-outline btn-sm !px-2.5" onClick={() => onToggle(s.id, !s.active)} title={s.active ? 'Cancel' : 'Reactivate'}>
                  {s.active ? <PauseCircle className="h-3.5 w-3.5" /> : <PlayCircle className="h-3.5 w-3.5" />}
                </button>
                <button className="btn-outline btn-sm !px-2.5" onClick={() => { setEditing(s); setModalOpen(true); }}><Pencil className="h-3.5 w-3.5" /></button>
                <button className="btn-outline btn-sm !px-2.5 text-danger" onClick={() => onDelete(s.id)}><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={close} title={editing ? 'Edit subscription' : 'Add subscription'}>
        <SubscriptionForm
          initial={editing ? { id: editing.id, name: editing.name, amount: String(editing.amount), currency: editing.currency, billingCycle: editing.billingCycle, nextPaymentDate: editing.nextPaymentDate.toISOString().slice(0, 10), categoryId: editing.categoryId ?? '', accountId: editing.accountId ?? '', active: editing.active, notes: editing.notes ?? '' } : undefined}
          onSuccess={close}
        />
      </Modal>

      {paying && (
        <Modal open onClose={closePay} title={`Pay ${paying.name}`} description={formatMoney(paying.amount, paying.currency)} size="sm">
          <PayForm action={paySubscription} id={paying.id} onSuccess={closePay} />
        </Modal>
      )}
      {dialog}
    </div>
  );
}
