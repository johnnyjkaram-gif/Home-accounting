'use client';

import { useState } from 'react';
import { useAppData } from '@/components/app-data-context';
import { createSavingsGoal, updateSavingsGoal } from '@/lib/actions/savings-goals';
import { useAction } from '@/lib/use-action';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export function SavingsGoalForm({ initial, onSuccess }: {
  initial?: { id?: string; name: string; targetAmount: string; currency: string; currentAmount?: string; deadline?: string; monthlyTarget?: string; accountId?: string; notes?: string };
  onSuccess: () => void;
}) {
  const { household, accounts } = useAppData();
  const [values, setValues] = useState({
    name: initial?.name ?? '',
    targetAmount: initial?.targetAmount ?? '',
    currency: initial?.currency ?? household.baseCurrency,
    currentAmount: initial?.currentAmount ?? '0',
    deadline: initial?.deadline ?? '',
    monthlyTarget: initial?.monthlyTarget ?? '',
    accountId: initial?.accountId ?? '',
    notes: initial?.notes ?? '',
    id: initial?.id,
  });

  const { run, pending } = useAction(values.id ? updateSavingsGoal : createSavingsGoal, () => {
    toast.success('Savings goal saved');
    onSuccess();
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    run({ ...values, deadline: values.deadline || undefined, monthlyTarget: values.monthlyTarget || undefined });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label">Goal name</label>
        <input required className="input" placeholder="e.g. Emergency Fund" value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Target amount</label>
          <input type="number" step="0.01" min="0.01" required className="input" value={values.targetAmount} onChange={(e) => setValues({ ...values, targetAmount: e.target.value })} />
        </div>
        <div>
          <label className="label">Currency</label>
          <input required className="input" value={values.currency} onChange={(e) => setValues({ ...values, currency: e.target.value.toUpperCase() })} />
        </div>
      </div>
      {!values.id && (
        <div>
          <label className="label">Starting amount</label>
          <input type="number" step="0.01" min="0" className="input" value={values.currentAmount} onChange={(e) => setValues({ ...values, currentAmount: e.target.value })} />
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Deadline (optional)</label>
          <input type="date" className="input" value={values.deadline} onChange={(e) => setValues({ ...values, deadline: e.target.value })} />
        </div>
        <div>
          <label className="label">Monthly target (optional)</label>
          <input type="number" step="0.01" min="0" className="input" value={values.monthlyTarget} onChange={(e) => setValues({ ...values, monthlyTarget: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="label">Linked account (optional)</label>
        <select className="select" value={values.accountId} onChange={(e) => setValues({ ...values, accountId: e.target.value })}>
          <option value="">None</option>
          {accounts.filter((a) => !a.archived).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Save goal
      </button>
    </form>
  );
}
