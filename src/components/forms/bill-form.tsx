'use client';

import { useState } from 'react';
import { useAppData } from '@/components/app-data-context';
import { createBill, updateBill } from '@/lib/actions/bills';
import { useAction, fieldError } from '@/lib/use-action';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export interface BillFormValues {
  id?: string;
  name: string;
  amount: string;
  currency: string;
  dueDate: string;
  frequency: 'ONE_TIME' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  categoryId?: string;
  accountId?: string;
  autoReminder: boolean;
  notes?: string;
}

export function BillForm({ initial, onSuccess }: { initial?: Partial<BillFormValues>; onSuccess: () => void }) {
  const { household, categories, accounts } = useAppData();
  const today = new Date().toISOString().slice(0, 10);
  const [values, setValues] = useState<BillFormValues>({
    name: initial?.name ?? '',
    amount: initial?.amount ?? '',
    currency: initial?.currency ?? household.baseCurrency,
    dueDate: initial?.dueDate ?? today,
    frequency: initial?.frequency ?? 'MONTHLY',
    categoryId: initial?.categoryId ?? '',
    accountId: initial?.accountId ?? '',
    autoReminder: initial?.autoReminder ?? true,
    notes: initial?.notes ?? '',
    id: initial?.id,
  });

  const { run, pending, fieldErrors } = useAction(values.id ? updateBill : createBill, () => {
    toast.success('Bill saved');
    onSuccess();
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    run({ ...values, dueDate: new Date(values.dueDate) });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label">Bill name</label>
        <input required className="input" placeholder="e.g. Rent" value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} />
        {fieldError(fieldErrors, 'name') && <p className="text-xs text-danger mt-1">{fieldError(fieldErrors, 'name')}</p>}
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
          <label className="label">Due date</label>
          <input type="date" required className="input" value={values.dueDate} onChange={(e) => setValues({ ...values, dueDate: e.target.value })} />
        </div>
        <div>
          <label className="label">Frequency</label>
          <select className="select" value={values.frequency} onChange={(e) => setValues({ ...values, frequency: e.target.value as any })}>
            <option value="ONE_TIME">One-time</option>
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
            <option value="YEARLY">Yearly</option>
          </select>
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
        <input type="checkbox" checked={values.autoReminder} onChange={(e) => setValues({ ...values, autoReminder: e.target.checked })} className="h-4 w-4 rounded" />
        Remind me before this bill is due
      </label>
      <div>
        <label className="label">Notes</label>
        <textarea className="input min-h-[70px]" value={values.notes} onChange={(e) => setValues({ ...values, notes: e.target.value })} />
      </div>
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Save bill
      </button>
    </form>
  );
}
