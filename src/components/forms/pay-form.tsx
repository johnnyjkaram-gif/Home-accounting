'use client';

import { useState } from 'react';
import { useAppData } from '@/components/app-data-context';
import { useAction } from '@/lib/use-action';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

/** Small shared "which account did this come out of, and when" form for paying a bill/subscription. */
export function PayForm({ action, id, onSuccess }: { action: (id: string, accountId: string, date: Date) => Promise<any>; id: string; onSuccess: () => void }) {
  const { accounts } = useAppData();
  const today = new Date().toISOString().slice(0, 10);
  const [accountId, setAccountId] = useState(accounts.find((a) => !a.archived)?.id ?? '');
  const [date, setDate] = useState(today);

  const { run, pending } = useAction(() => action(id, accountId, new Date(date)), () => {
    toast.success('Payment recorded');
    onSuccess();
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); run(undefined); }} className="space-y-4">
      <div>
        <label className="label">Paid from account</label>
        <select required className="select" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          {accounts.filter((a) => !a.archived).map((a) => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}
        </select>
      </div>
      <div>
        <label className="label">Payment date</label>
        <input type="date" required className="input" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Confirm payment
      </button>
    </form>
  );
}
