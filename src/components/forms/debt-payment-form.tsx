'use client';

import { useState } from 'react';
import { useAppData } from '@/components/app-data-context';
import { addDebtPayment } from '@/lib/actions/debts';
import { useAction } from '@/lib/use-action';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { formatMoney } from '@/lib/currency';

export function DebtPaymentForm({ debt, onSuccess }: { debt: any; onSuccess: () => void }) {
  const { accounts } = useAppData();
  const today = new Date().toISOString().slice(0, 10);
  const [amount, setAmount] = useState(String(debt.monthlyPayment ?? ''));
  const [date, setDate] = useState(today);
  const [accountId, setAccountId] = useState(accounts.find((a) => !a.archived)?.id ?? '');

  const { run, pending } = useAction(addDebtPayment, () => {
    toast.success('Payment recorded');
    onSuccess();
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); run({ debtId: debt.id, amount, date: new Date(date), accountId: accountId || undefined }); }} className="space-y-4">
      <p className="text-sm text-muted-foreground">Remaining balance: <strong className="text-foreground">{formatMoney(debt.remainingAmount, debt.currency)}</strong></p>
      <div>
        <label className="label">Payment amount</label>
        <input type="number" step="0.01" min="0.01" required className="input" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
      <div>
        <label className="label">Date</label>
        <input type="date" required className="input" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div>
        <label className="label">Paid from account (optional)</label>
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
