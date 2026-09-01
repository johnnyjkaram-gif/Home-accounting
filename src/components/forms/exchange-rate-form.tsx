'use client';

import { useState } from 'react';
import { useAppData } from '@/components/app-data-context';
import { upsertExchangeRate } from '@/lib/actions/settings';
import { useAction } from '@/lib/use-action';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export function ExchangeRateForm({ onSuccess }: { onSuccess: () => void }) {
  const { currencies, household } = useAppData();
  const today = new Date().toISOString().slice(0, 10);
  const [values, setValues] = useState({
    baseCurrency: household.baseCurrency,
    targetCurrency: currencies.find((c) => c.code !== household.baseCurrency)?.code ?? '',
    rate: '',
    date: today,
  });

  const { run, pending } = useAction(upsertExchangeRate, () => {
    toast.success('Exchange rate saved');
    onSuccess();
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); run(values); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4 items-end">
        <div>
          <label className="label">1 unit of</label>
          <select className="select" value={values.baseCurrency} onChange={(e) => setValues({ ...values, baseCurrency: e.target.value })}>
            {currencies.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
          </select>
        </div>
        <div>
          <label className="label">equals (in)</label>
          <select className="select" value={values.targetCurrency} onChange={(e) => setValues({ ...values, targetCurrency: e.target.value })}>
            {currencies.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Rate</label>
        <input type="number" step="0.000001" min="0.000001" required className="input" placeholder="e.g. 89500" value={values.rate} onChange={(e) => setValues({ ...values, rate: e.target.value })} />
      </div>
      <div>
        <label className="label">Effective date</label>
        <input type="date" required className="input" value={values.date} onChange={(e) => setValues({ ...values, date: e.target.value })} />
        <p className="text-xs text-muted-foreground mt-1">New transactions on or after this date will use this rate until a newer one is added.</p>
      </div>
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Save exchange rate
      </button>
    </form>
  );
}
