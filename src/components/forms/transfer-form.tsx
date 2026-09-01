'use client';

import { useState } from 'react';
import { useAppData } from '@/components/app-data-context';
import { createTransfer } from '@/lib/actions/transactions';
import { useAction, fieldError } from '@/lib/use-action';
import { toast } from 'sonner';
import { Loader2, ArrowRight } from 'lucide-react';

export function TransferForm({ onSuccess }: { onSuccess: () => void }) {
  const { accounts } = useAppData();
  const activeAccounts = accounts.filter((a) => !a.archived);
  const today = new Date().toISOString().slice(0, 10);

  const [values, setValues] = useState({
    date: today,
    amount: '',
    fromAccountId: activeAccounts[0]?.id ?? '',
    toAccountId: activeAccounts[1]?.id ?? '',
    description: '',
    notes: '',
  });

  const { run, pending, fieldErrors } = useAction(createTransfer, () => {
    toast.success('Transfer completed');
    onSuccess();
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    run({ ...values, date: new Date(values.date) });
  }

  if (activeAccounts.length === 0) {
    return (
      <div className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          You don't have any accounts yet, so there's nothing to transfer between. Add at least two accounts first,
          then come back to move money between them.
        </p>
        <a href="/accounts" className="btn-primary inline-flex w-full justify-center">Go to Accounts</a>
      </div>
    );
  }

  if (activeAccounts.length < 2) {
    return (
      <div className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          You only have one account so far. Add a second account to transfer money between them.
        </p>
        <a href="/accounts" className="btn-primary inline-flex w-full justify-center">Go to Accounts</a>
      </div>
    );
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
          <input type="number" step="0.01" min="0.01" required className="input" value={values.amount} onChange={(e) => setValues({ ...values, amount: e.target.value })} />
          {fieldError(fieldErrors, 'amount') && <p className="text-xs text-danger mt-1">{fieldError(fieldErrors, 'amount')}</p>}
        </div>
      </div>

      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="label">From account</label>
          <select required className="select" value={values.fromAccountId} onChange={(e) => setValues({ ...values, fromAccountId: e.target.value })}>
            {activeAccounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>
            ))}
          </select>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground mb-2.5 shrink-0" />
        <div className="flex-1">
          <label className="label">To account</label>
          <select required className="select" value={values.toAccountId} onChange={(e) => setValues({ ...values, toAccountId: e.target.value })}>
            {activeAccounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>
            ))}
          </select>
        </div>
      </div>
      {fieldError(fieldErrors, 'toAccountId') && <p className="text-xs text-danger">{fieldError(fieldErrors, 'toAccountId')}</p>}

      <div>
        <label className="label">Description (optional)</label>
        <input className="input" value={values.description} onChange={(e) => setValues({ ...values, description: e.target.value })} />
      </div>

      <p className="text-xs text-muted-foreground rounded-lg bg-muted p-2.5">
        Transfers move money between your own accounts and are never counted as income or expense.
      </p>

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Transfer funds
      </button>
    </form>
  );
}
