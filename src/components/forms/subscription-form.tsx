'use client';

import { useState } from 'react';
import { useAppData } from '@/components/app-data-context';
import { createSubscription, updateSubscription } from '@/lib/actions/subscriptions';
import { useAction } from '@/lib/use-action';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export interface SubscriptionFormValues {
  id?: string;
  name: string;
  amount: string;
  currency: string;
  billingCycle: 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  nextPaymentDate: string;
  categoryId?: string;
  accountId?: string;
  active: boolean;
  notes?: string;
}

export function SubscriptionForm({ initial, onSuccess }: { initial?: Partial<SubscriptionFormValues>; onSuccess: () => void }) {
  const { household, categories, accounts } = useAppData();
  const today = new Date().toISOString().slice(0, 10);
  const [values, setValues] = useState<SubscriptionFormValues>({
    name: initial?.name ?? '',
    amount: initial?.amount ?? '',
    currency: initial?.currency ?? household.baseCurrency,
    billingCycle: initial?.billingCycle ?? 'MONTHLY',
    nextPaymentDate: initial?.nextPaymentDate ?? today,
    categoryId: initial?.categoryId ?? '',
    accountId: initial?.accountId ?? '',
    active: initial?.active ?? true,
    notes: initial?.notes ?? '',
    id: initial?.id,
  });

  const { run, pending } = useAction(values.id ? updateSubscription : createSubscription, () => {
    toast.success('Subscription saved');
    onSuccess();
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    run({ ...values, nextPaymentDate: new Date(values.nextPaymentDate) });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label">Service name</label>
        <input required className="input" placeholder="e.g. Netflix" value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Amount</label>
          <input type="number" step="0.01" min="0.01" required className="input" value={values.amount} onChange={(e) => setValues({ ...values, amount: e.target.value })} />
        </div>
        <div>
          <label className="label">Currency</label>
          <input required className="input" value={values.currency} onChange={(e) => setValues({ ...values, currency: e.target.value.toUpperCase() })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Billing cycle</label>
          <select className="select" value={values.billingCycle} onChange={(e) => setValues({ ...values, billingCycle: e.target.value as any })}>
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
            <option value="YEARLY">Yearly</option>
          </select>
        </div>
        <div>
          <label className="label">Next payment</label>
          <input type="date" required className="input" value={values.nextPaymentDate} onChange={(e) => setValues({ ...values, nextPaymentDate: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Category</label>
          <select className="select" value={values.categoryId} onChange={(e) => setValues({ ...values, categoryId: e.target.value })}>
            <option value="">None</option>
            {categories.filter((c) => c.kind === 'EXPENSE').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Payment account</label>
          <select className="select" value={values.accountId} onChange={(e) => setValues({ ...values, accountId: e.target.value })}>
            <option value="">Choose when paying</option>
            {accounts.filter((a) => !a.archived).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={values.active} onChange={(e) => setValues({ ...values, active: e.target.checked })} className="h-4 w-4 rounded" />
        Active
      </label>
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Save subscription
      </button>
    </form>
  );
}
