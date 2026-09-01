'use client';

import { useState } from 'react';
import { createCategory, updateCategory } from '@/lib/actions/categories';
import { useAction } from '@/lib/use-action';
import { CHART_COLORS } from '@/lib/constants';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CategoryForm({ initial, defaultKind, onSuccess }: {
  initial?: { id?: string; name: string; kind: 'INCOME' | 'EXPENSE'; color: string };
  defaultKind: 'INCOME' | 'EXPENSE';
  onSuccess: () => void;
}) {
  const [values, setValues] = useState({
    name: initial?.name ?? '',
    kind: initial?.kind ?? defaultKind,
    color: initial?.color ?? CHART_COLORS[0],
    icon: 'Wallet',
    id: initial?.id,
  });

  const { run, pending } = useAction(values.id ? updateCategory : createCategory, () => {
    toast.success('Category saved');
    onSuccess();
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); run(values); }} className="space-y-4">
      <div>
        <label className="label">Name</label>
        <input required className="input" value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} />
      </div>
      <div>
        <label className="label">Type</label>
        <select className="select" value={values.kind} disabled={!!values.id} onChange={(e) => setValues({ ...values, kind: e.target.value as any })}>
          <option value="INCOME">Income</option>
          <option value="EXPENSE">Expense</option>
        </select>
      </div>
      <div>
        <label className="label">Color</label>
        <div className="flex flex-wrap gap-2">
          {CHART_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={cn('h-7 w-7 rounded-full border-2', values.color === color ? 'border-foreground' : 'border-transparent')}
              style={{ background: color }}
              onClick={() => setValues({ ...values, color })}
            />
          ))}
        </div>
      </div>
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Save category
      </button>
    </form>
  );
}
