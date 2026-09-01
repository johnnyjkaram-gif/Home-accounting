'use client';

import { useState } from 'react';
import { useAppData } from '@/components/app-data-context';
import { createTransaction, updateTransaction } from '@/lib/actions/transactions';
import { useAction, fieldError } from '@/lib/use-action';
import { toast } from 'sonner';
import { Loader2, Paperclip } from 'lucide-react';
import { uploadAttachment } from '@/lib/upload-attachment';

export interface TransactionFormValues {
  id?: string;
  type: 'INCOME' | 'EXPENSE';
  date: string;
  amount: string;
  currency: string;
  accountId: string;
  categoryId: string;
  subcategory?: string;
  payee?: string;
  description?: string;
  paymentMethodId?: string;
  notes?: string;
  isRecurring: boolean;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval: string;
  endDate?: string;
}

export function TransactionForm({
  type,
  initial,
  onSuccess,
}: {
  type: 'INCOME' | 'EXPENSE';
  initial?: Partial<TransactionFormValues>;
  onSuccess: () => void;
}) {
  const { accounts, categories, paymentMethods, household } = useAppData();
  const today = new Date().toISOString().slice(0, 10);
  const [values, setValues] = useState<TransactionFormValues>({
    type,
    date: initial?.date ?? today,
    amount: initial?.amount ?? '',
    currency: initial?.currency ?? household.baseCurrency,
    accountId: initial?.accountId ?? accounts.find((a) => !a.archived)?.id ?? '',
    categoryId: initial?.categoryId ?? '',
    subcategory: initial?.subcategory ?? '',
    payee: initial?.payee ?? '',
    description: initial?.description ?? '',
    paymentMethodId: initial?.paymentMethodId ?? paymentMethods[0]?.id ?? '',
    notes: initial?.notes ?? '',
    isRecurring: initial?.isRecurring ?? false,
    frequency: initial?.frequency ?? 'MONTHLY',
    interval: initial?.interval ?? '1',
    endDate: initial?.endDate ?? '',
    id: initial?.id,
  });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const relevantCategories = categories.filter((c) => c.kind === type);

  const { run, pending, fieldErrors } = useAction(values.id ? updateTransaction : createTransaction, async (data) => {
    if (file && data?.id) {
      setUploading(true);
      await uploadAttachment('transaction', data.id, file);
      setUploading(false);
    }
    toast.success(`${type === 'INCOME' ? 'Income' : 'Expense'} saved`);
    onSuccess();
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    run({
      id: values.id,
      type,
      date: new Date(values.date),
      amount: values.amount,
      currency: values.currency,
      accountId: values.accountId,
      categoryId: values.categoryId,
      subcategory: values.subcategory || undefined,
      payee: values.payee || undefined,
      description: values.description || undefined,
      paymentMethodId: values.paymentMethodId || undefined,
      notes: values.notes || undefined,
      isRecurring: values.isRecurring,
      recurring: values.isRecurring
        ? { frequency: values.frequency, interval: Number(values.interval) || 1, endDate: values.endDate ? new Date(values.endDate) : undefined }
        : undefined,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Date</label>
          <input type="date" required className="input" value={values.date} onChange={(e) => setValues({ ...values, date: e.target.value })} />
        </div>
        <div>
          <label className="label">Amount</label>
          <input type="number" step="0.01" min="0.01" required className="input" placeholder="0.00" value={values.amount} onChange={(e) => setValues({ ...values, amount: e.target.value })} />
          {fieldError(fieldErrors, 'amount') && <p className="text-xs text-danger mt-1">{fieldError(fieldErrors, 'amount')}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Currency</label>
          <select className="select" value={values.currency} onChange={(e) => setValues({ ...values, currency: e.target.value })}>
            {/* offer common + account currencies */}
            {Array.from(new Set([household.baseCurrency, ...accounts.map((a) => a.currency)])).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Account</label>
          <select required className="select" value={values.accountId} onChange={(e) => setValues({ ...values, accountId: e.target.value })}>
            <option value="" disabled>Select account</option>
            {accounts.filter((a) => !a.archived).map((a) => (
              <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>
            ))}
          </select>
          {fieldError(fieldErrors, 'accountId') && <p className="text-xs text-danger mt-1">{fieldError(fieldErrors, 'accountId')}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Category</label>
          <select required className="select" value={values.categoryId} onChange={(e) => setValues({ ...values, categoryId: e.target.value })}>
            <option value="" disabled>Select category</option>
            {relevantCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {fieldError(fieldErrors, 'categoryId') && <p className="text-xs text-danger mt-1">{fieldError(fieldErrors, 'categoryId')}</p>}
        </div>
        <div>
          <label className="label">Subcategory (optional)</label>
          <input className="input" value={values.subcategory} onChange={(e) => setValues({ ...values, subcategory: e.target.value })} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">{type === 'EXPENSE' ? 'Merchant / Payee' : 'Source'}</label>
          <input className="input" value={values.payee} onChange={(e) => setValues({ ...values, payee: e.target.value })} />
        </div>
        <div>
          <label className="label">Payment method</label>
          <select className="select" value={values.paymentMethodId} onChange={(e) => setValues({ ...values, paymentMethodId: e.target.value })}>
            <option value="">None</option>
            {paymentMethods.map((pm) => (
              <option key={pm.id} value={pm.id}>{pm.name}</option>
            ))}
          </select>
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

      <div className="rounded-xl border border-border p-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={values.isRecurring} onChange={(e) => setValues({ ...values, isRecurring: e.target.checked })} className="h-4 w-4 rounded" />
          Recurring {type === 'INCOME' ? 'income' : 'expense'}
        </label>
        {values.isRecurring && (
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div>
              <label className="label">Frequency</label>
              <select className="select" value={values.frequency} onChange={(e) => setValues({ ...values, frequency: e.target.value as any })}>
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
              </select>
            </div>
            <div>
              <label className="label">Every</label>
              <input type="number" min="1" className="input" value={values.interval} onChange={(e) => setValues({ ...values, interval: e.target.value })} />
            </div>
            <div>
              <label className="label">Ends (optional)</label>
              <input type="date" className="input" value={values.endDate} onChange={(e) => setValues({ ...values, endDate: e.target.value })} />
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="label flex items-center gap-1.5"><Paperclip className="h-3.5 w-3.5" /> Receipt / attachment (optional)</label>
        <input type="file" accept="image/*,application/pdf" className="input file:mr-3 file:btn-secondary file:btn-sm file:border-0" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </div>

      <button type="submit" disabled={pending || uploading} className="btn-primary w-full">
        {(pending || uploading) && <Loader2 className="h-4 w-4 animate-spin" />}
        Save {type === 'INCOME' ? 'income' : 'expense'}
      </button>
    </form>
  );
}
