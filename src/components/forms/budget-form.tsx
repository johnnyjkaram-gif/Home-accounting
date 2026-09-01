'use client';

import { useState } from 'react';
import { useAppData } from '@/components/app-data-context';
import { upsertBudget } from '@/lib/actions/budgets';
import { useAction } from '@/lib/use-action';
import { MONTH_NAMES } from '@/lib/constants';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export function BudgetForm({ initial, defaultMonth, defaultYear, onSuccess }: {
  initial?: { id?: string; categoryId: string; amount: string; currency: string; period: 'MONTHLY' | 'YEARLY'; month?: number | null; year: number };
  defaultMonth: number;
  defaultYear: number;
  onSuccess: () => void;
}) {
  const { household, categories } = useAppData();
  const [values, setValues] = useState({
    categoryId: initial?.categoryId ?? '',
    amount: initial?.amount ?? '',
    currency: initial?.currency ?? household.baseCurrency,
    period: initial?.period ?? 'MONTHLY' as 'MONTHLY' | 'YEARLY',
    month: initial?.month ?? defaultMonth,
    year: initial?.year ?? defaultYear,
  });

  const { run, pending } = useAction(upsertBudget, () => {
    toast.success('Budget saved');
    onSuccess();
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    run(values);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label">Category</label>
        <select required className="select" value={values.categoryId} onChange={(e) => setValues({ ...values, categoryId: e.target.value })}>
          <option value="" disabled>Select category</option>
          {categories.filter((c) => c.kind === 'EXPENSE').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Budget amount</label>
          <input type="number" step="0.01" min="0.01" required className="input" value={values.amount} onChange={(e) => setValues({ ...values, amount: e.target.value })} />
        </div>
        <div>
          <label className="label">Period</label>
          <select className="select" value={values.period} onChange={(e) => setValues({ ...values, period: e.target.value as any })}>
            <option value="MONTHLY">Monthly</option>
            <option value="YEARLY">Yearly</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {values.period === 'MONTHLY' && (
          <div>
            <label className="label">Month</label>
            <select className="select" value={values.month} onChange={(e) => setValues({ ...values, month: Number(e.target.value) })}>
              {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="label">Year</label>
          <input type="number" required className="input" value={values.year} onChange={(e) => setValues({ ...values, year: Number(e.target.value) })} />
        </div>
      </div>
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Save budget
      </button>
    </form>
  );
}
