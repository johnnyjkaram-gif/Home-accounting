'use client';

import { useState } from 'react';
import { useAppData } from '@/components/app-data-context';
import { createDebt, updateDebt } from '@/lib/actions/debts';
import { useAction, fieldError } from '@/lib/use-action';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export interface DebtFormValues {
  id?: string;
  creditor: string;
  originalAmount: string;
  remainingAmount: string;
  currency: string;
  dueDate?: string;
  interestRate: string;
  monthlyPayment?: string;
  notes?: string;
}

export function DebtForm({ initial, onSuccess }: { initial?: Partial<DebtFormValues>; onSuccess: () => void }) {
  const { household } = useAppData();
  const [values, setValues] = useState<DebtFormValues>({
    creditor: initial?.creditor ?? '',
    originalAmount: initial?.originalAmount ?? '',
    remainingAmount: initial?.remainingAmount ?? initial?.originalAmount ?? '',
    currency: initial?.currency ?? household.baseCurrency,
    dueDate: initial?.dueDate ?? '',
    interestRate: initial?.interestRate ?? '0',
    monthlyPayment: initial?.monthlyPayment ?? '',
    notes: initial?.notes ?? '',
    id: initial?.id,
  });

  const { run, pending, fieldErrors } = useAction(values.id ? updateDebt : createDebt, () => {
    toast.success('Debt saved');
    onSuccess();
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    run({
      ...values,
      dueDate: values.dueDate ? new Date(values.dueDate) : undefined,
      monthlyPayment: values.monthlyPayment || undefined,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label">Creditor</label>
        <input required className="input" value={values.creditor} onChange={(e) => setValues({ ...values, creditor: e.target.value })} />
        {fieldError(fieldErrors, 'creditor') && <p className="text-xs text-danger mt-1">{fieldError(fieldErrors, 'creditor')}</p>}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="label">Original amount</label>
          <input type="number" step="0.01" min="0" required className="input" value={values.originalAmount} onChange={(e) => setValues({ ...values, originalAmount: e.target.value, remainingAmount: values.id ? values.remainingAmount : e.target.value })} />
        </div>
        <div>
          <label className="label">Remaining</label>
          <input type="number" step="0.01" min="0" required className="input" value={values.remainingAmount} onChange={(e) => setValues({ ...values, remainingAmount: e.target.value })} />
        </div>
        <div>
          <label className="label">Currency</label>
          <input required className="input" value={values.currency} onChange={(e) => setValues({ ...values, currency: e.target.value.toUpperCase() })} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="label">Due date</label>
          <input type="date" className="input" value={values.dueDate} onChange={(e) => setValues({ ...values, dueDate: e.target.value })} />
        </div>
        <div>
          <label className="label">Interest rate %</label>
          <input type="number" step="0.01" min="0" className="input" value={values.interestRate} onChange={(e) => setValues({ ...values, interestRate: e.target.value })} />
        </div>
        <div>
          <label className="label">Monthly payment</label>
          <input type="number" step="0.01" min="0" className="input" value={values.monthlyPayment} onChange={(e) => setValues({ ...values, monthlyPayment: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea className="input min-h-[70px]" value={values.notes} onChange={(e) => setValues({ ...values, notes: e.target.value })} />
      </div>
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Save debt
      </button>
    </form>
  );
}
