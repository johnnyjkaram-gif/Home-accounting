'use client';

import { useState } from 'react';
import { useAppData } from '@/components/app-data-context';
import { addReceivablePayment } from '@/lib/actions/receivables';
import { useAction } from '@/lib/use-action';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { formatMoney } from '@/lib/currency';

export function ReceivablePaymentForm({ receivable, alreadyPaid, onSuccess }: { receivable: any; alreadyPaid: number; onSuccess: () => void }) {
  const { accounts } = useAppData();
  const today = new Date().toISOString().slice(0, 10);
  const remaining = receivable.amount - alreadyPaid;
  const [amount, setAmount] = useState(String(remaining));
  const [date, setDate] = useState(today);
  const [accountId, setAccountId] = useState(accounts.find((a) => !a.archived)?.id ?? '');

  const { run, pending } = useAction(addReceivablePayment, () => {
    toast.success('Payment recorded');
    onSuccess();
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); run({ receivableId: receivable.id, amount, date: new Date(date), accountId: accountId || undefined }); }} className="space-y-4">
      <p className="text-sm text-muted-foreground">Remaining owed: <strong className="text-foreground">{formatMoney(remaining, receivable.currency)}</strong></p>
      <div>
        <label className="label">Amount received</label>
        <input type="number" step="0.01" min="0.01" required className="input" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
      <div>
        <label className="label">Date</label>
        <input type="date" required className="input" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div>
        <label className="label">Deposited to account (optional)</label>
        <select className="select" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          <option value="">Not linked to an account</option>
          {accounts.filter((a) => !a.archived).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Record payment
      </button>
    </form>
  );
}
