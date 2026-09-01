'use client';

import { useState } from 'react';
import { useAppData } from '@/components/app-data-context';
import { addGoalContribution } from '@/lib/actions/savings-goals';
import { useAction } from '@/lib/use-action';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export function ContributionForm({ goalId, onSuccess }: { goalId: string; onSuccess: () => void }) {
  const { accounts } = useAppData();
  const today = new Date().toISOString().slice(0, 10);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);
  const [accountId, setAccountId] = useState('');

  const { run, pending } = useAction(addGoalContribution, () => {
    toast.success('Contribution added');
    onSuccess();
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); run({ goalId, amount, date: new Date(date), accountId: accountId || undefined }); }} className="space-y-4">
      <div>
        <label className="label">Amount</label>
        <input type="number" step="0.01" min="0.01" required autoFocus className="input" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
      <div>
        <label className="label">Date</label>
        <input type="date" required className="input" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div>
        <label className="label">From account (optional)</label>
        <select className="select" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          <option value="">Not linked to an account</option>
          {accounts.filter((a) => !a.archived).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Add contribution
      </button>
    </form>
  );
}
