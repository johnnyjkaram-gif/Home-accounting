'use client';

import { useState } from 'react';
import { createAccount, updateAccount } from '@/lib/actions/accounts';
import { useAction, fieldError } from '@/lib/use-action';
import { useAppData } from '@/components/app-data-context';
import { ACCOUNT_TYPE_LABELS } from '@/lib/constants';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export interface AccountFormValues {
  id?: string;
  name: string;
  type: string;
  currency: string;
  openingBalance: string;
}

export function AccountForm({ initial, onSuccess }: { initial?: Partial<AccountFormValues>; onSuccess: () => void }) {
  const { household } = useAppData();
  const [values, setValues] = useState<AccountFormValues>({
    name: initial?.name ?? '',
    type: initial?.type ?? 'BANK',
    currency: initial?.currency ?? household.baseCurrency,
    openingBalance: initial?.openingBalance ?? '0',
    id: initial?.id,
  });

  const { run, pending, fieldErrors } = useAction(values.id ? updateAccount : createAccount, () => {
    toast.success('Account saved');
    onSuccess();
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    run(values);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label">Account name</label>
        <input required className="input" placeholder="e.g. Main Bank Account" value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} />
        {fieldError(fieldErrors, 'name') && <p className="text-xs text-danger mt-1">{fieldError(fieldErrors, 'name')}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Type</label>
          <select className="select" value={values.type} onChange={(e) => setValues({ ...values, type: e.target.value })}>
            {Object.entries(ACCOUNT_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Currency</label>
          <input required className="input" value={values.currency} onChange={(e) => setValues({ ...values, currency: e.target.value.toUpperCase() })} placeholder="USD" />
        </div>
      </div>
      <div>
        <label className="label">Opening balance</label>
        <input type="number" step="0.01" required className="input" value={values.openingBalance} onChange={(e) => setValues({ ...values, openingBalance: e.target.value })} />
        <p className="text-xs text-muted-foreground mt-1">Balance before any transactions were recorded in this app (use a negative number for a credit card balance owed).</p>
      </div>
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Save account
      </button>
    </form>
  );
}
