'use client';

import { useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Search, Trash2, Pencil, Receipt, Paperclip, X, Repeat } from 'lucide-react';
import { useAppData } from '@/components/app-data-context';
import { Modal } from '@/components/ui/modal';
import { TransactionForm } from '@/components/forms/transaction-form';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { formatMoney } from '@/lib/currency';
import { formatDateLong } from '@/lib/utils';
import { deleteTransaction } from '@/lib/actions/transactions';
import { toast } from 'sonner';

const TYPE_LABEL: Record<string, string> = {
  INCOME: 'Income', EXPENSE: 'Expense', TRANSFER: 'Transfer', DEBT_PAYMENT: 'Debt payment', RECEIVABLE_PAYMENT: 'Receivable payment',
};
const TYPE_TONE: Record<string, any> = {
  INCOME: 'success', EXPENSE: 'danger', TRANSFER: 'primary', DEBT_PAYMENT: 'warning', RECEIVABLE_PAYMENT: 'success',
};

export function TransactionsPageClient({ transactions, total, page, pageSize, categories, searchParams }: any) {
  const { accounts, paymentMethods, household } = useAppData();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [editing, setEditing] = useState<any>(null);
  const [query, setQuery] = useState(searchParams.q ?? '');
  const { confirm, dialog } = useConfirm();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currencies = Array.from(new Set([household.baseCurrency, ...accounts.map((a: any) => a.currency)]));
  const hasFilters = ['q', 'type', 'categoryId', 'accountId', 'currency', 'paymentMethodId', 'from', 'to'].some((k) => searchParams[k]);

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(sp.toString());
    if (value) next.set(key, value); else next.delete(key);
    next.delete('page');
    router.push(`${pathname}?${next.toString()}`);
  }
  function goToPage(p: number) {
    const next = new URLSearchParams(sp.toString());
    next.set('page', String(p));
    router.push(`${pathname}?${next.toString()}`);
  }
  function close() { setEditing(null); router.refresh(); }

  async function onDelete(id: string) {
    const ok = await confirm('Delete this transaction?', 'This will remove it and update related balances. This cannot be undone.');
    if (!ok) return;
    const res = await deleteTransaction(id);
    if (res.ok) { toast.success('Transaction deleted'); router.refresh(); }
    else toast.error(res.error);
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Every income, expense, transfer, and payment in one place.</p>
      </div>

      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="label">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input className="input pl-9" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && updateParam('q', query)} onBlur={() => updateParam('q', query)} placeholder="Description, payee, notes..." />
          </div>
        </div>
        <div>
          <label className="label">Type</label>
          <select className="select" value={searchParams.type ?? ''} onChange={(e) => updateParam('type', e.target.value)}>
            <option value="">All types</option>
            {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Category</label>
          <select className="select" value={searchParams.categoryId ?? ''} onChange={(e) => updateParam('categoryId', e.target.value)}>
            <option value="">All</option>
            {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Account</label>
          <select className="select" value={searchParams.accountId ?? ''} onChange={(e) => updateParam('accountId', e.target.value)}>
            <option value="">All</option>
            {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Currency</label>
          <select className="select" value={searchParams.currency ?? ''} onChange={(e) => updateParam('currency', e.target.value)}>
            <option value="">All</option>
            {currencies.map((c) => <option key={c as string} value={c as string}>{c as string}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Payment method</label>
          <select className="select" value={searchParams.paymentMethodId ?? ''} onChange={(e) => updateParam('paymentMethodId', e.target.value)}>
            <option value="">All</option>
            {paymentMethods.map((pm: any) => <option key={pm.id} value={pm.id}>{pm.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">From</label>
          <input type="date" className="input" value={searchParams.from ?? ''} onChange={(e) => updateParam('from', e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input" value={searchParams.to ?? ''} onChange={(e) => updateParam('to', e.target.value)} />
        </div>
        <div>
          <label className="label">Sort</label>
          <select className="select" value={searchParams.sort ?? 'date_desc'} onChange={(e) => updateParam('sort', e.target.value)}>
            <option value="date_desc">Newest first</option>
            <option value="date_asc">Oldest first</option>
            <option value="amount_desc">Amount: high to low</option>
            <option value="amount_asc">Amount: low to high</option>
          </select>
        </div>
        {hasFilters && <button className="btn-ghost btn-sm" onClick={() => router.push(pathname)}><X className="h-3.5 w-3.5" /> Clear filters</button>}
      </div>

      <div className="card overflow-hidden">
        {transactions.length === 0 ? (
          <EmptyState icon={Receipt} title="No transactions found" description="Try adjusting your filters, or use Quick Add to record one." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Date</th>
                  <th className="text-left font-medium px-4 py-3">Type</th>
                  <th className="text-left font-medium px-4 py-3">Category</th>
                  <th className="text-left font-medium px-4 py-3">Description</th>
                  <th className="text-left font-medium px-4 py-3">Account</th>
                  <th className="text-right font-medium px-4 py-3">Amount</th>
                  <th className="text-left font-medium px-4 py-3">Currency</th>
                  <th className="text-left font-medium px-4 py-3">Status</th>
                  <th className="text-right font-medium px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions.map((t: any) => (
                  <tr key={t.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 whitespace-nowrap">{formatDateLong(t.date)}</td>
                    <td className="px-4 py-3"><Badge tone={TYPE_TONE[t.type]}>{TYPE_LABEL[t.type]}</Badge></td>
                    <td className="px-4 py-3 whitespace-nowrap">{t.category?.name ?? '—'}</td>
                    <td className="px-4 py-3 max-w-[200px] truncate">
                      {t.type === 'TRANSFER' ? `To ${t.toAccount?.name ?? '—'}` : (t.description || t.payee || '—')}
                      {t.attachments?.length > 0 && <Paperclip className="inline h-3 w-3 ml-1.5 text-muted-foreground" />}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{t.account?.name}</td>
                    <td className={`px-4 py-3 text-right font-medium whitespace-nowrap ${t.type === 'INCOME' || t.type === 'RECEIVABLE_PAYMENT' ? 'text-success' : t.type === 'EXPENSE' || t.type === 'DEBT_PAYMENT' ? 'text-danger' : ''}`}>
                      {formatMoney(t.amount, t.currency)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{t.currency}</td>
                    <td className="px-4 py-3">
                      {t.isRecurring ? <Badge tone="primary"><Repeat className="h-3 w-3" /> Recurring</Badge> : <Badge tone="default">Completed</Badge>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {(t.type === 'INCOME' || t.type === 'EXPENSE') && (
                          <button className="btn-ghost btn-sm !px-1.5" onClick={() => setEditing(t)}><Pencil className="h-3.5 w-3.5" /></button>
                        )}
                        <button className="btn-ghost btn-sm !px-1.5 text-danger" onClick={() => onDelete(t.id)}><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {transactions.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{total} record{total === 1 ? '' : 's'}</span>
          <div className="flex items-center gap-2">
            <button className="btn-outline btn-sm" disabled={page <= 1} onClick={() => goToPage(page - 1)}>Previous</button>
            <span>Page {page} of {totalPages}</span>
            <button className="btn-outline btn-sm" disabled={page >= totalPages} onClick={() => goToPage(page + 1)}>Next</button>
          </div>
        </div>
      )}

      {editing && (
        <Modal open onClose={close} title={`Edit ${editing.type === 'INCOME' ? 'income' : 'expense'}`}>
          <TransactionForm
            type={editing.type}
            initial={{
              id: editing.id,
              date: editing.date.toISOString().slice(0, 10),
              amount: String(editing.amount),
              currency: editing.currency,
              accountId: editing.accountId,
              categoryId: editing.categoryId ?? '',
              subcategory: editing.subcategory ?? '',
              payee: editing.payee ?? '',
              description: editing.description ?? '',
              paymentMethodId: editing.paymentMethodId ?? '',
              notes: editing.notes ?? '',
            }}
            onSuccess={close}
          />
        </Modal>
      )}
      {dialog}
    </div>
  );
}
