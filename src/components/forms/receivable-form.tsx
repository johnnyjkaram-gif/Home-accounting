'use client';

import { useState } from 'react';
import { useAppData } from '@/components/app-data-context';
import { createReceivable, updateReceivable } from '@/lib/actions/receivables';
import { useAction, fieldError } from '@/lib/use-action';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export interface ReceivableFormValues {
  id?: string;
  person: string;
  amount: string;
  currency: string;
  date: string;
  dueDate?: string;
  description?: string;
  notes?: string;
}

export function ReceivableForm({ initial, onSuccess }: { initial?: Partial<ReceivableFormValues>; onSuccess: () => void }) {
  const { household } = useAppData();
  const today = new Date().toISOString().slice(0, 10);
  const [values, setValues] = useState<ReceivableFormValues>({
    person: initial?.person ?? '',
    amount: initial?.amount ?? '',
    currency: initial?.currency ?? household.baseCurrency,
    date: initial?.date ?? today,
    dueDate: initial?.dueDate ?? '',
    description: initial?.description ?? '',
    notes: initial?.notes ?? '',
    id: initial?.id,
  });

  const { run, pending, fieldErrors } = useAction(values.id ? updateReceivable : createReceivable, () => {
    toast.success('Receivable saved');
    onSuccess();
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    run({ ...values, date: new Date(values.date), dueDate: values.dueDate ? new Date(values.dueDate) : undefined });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label">Person / company</label>
        <input required className="input" value={values.person} onChange={(e) => setValues({ ...values, person: e.target.value })} />
        {fieldError(fieldErrors, 'person') && <p className="text-xs text-danger mt-1">{fieldError(fieldErrors, 'person')}</p>}
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
          <label className="label">Date</label>
          <input type="date" required className="input" value={values.date} onChange={(e) => setValues({ ...values, date: e.target.value })} />
        </div>
        <div>
          <label className="label">Due date (optional)</label>
          <input type="date" className="input" value={values.dueDate} onChange={(e) => setValues({ ...values, dueDate: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="label">Description</label>
        <input className="input" value={values.description} onChange={(e) => setValues({ ...values, description: e.target.value })} />
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea className="input min-h-[70px]" value={values.notes} onChange={(e) => setValues({ ...values, notes: e.target.value })} />
      </div>
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Save receivable
      </button>
    </form>
  );
}
