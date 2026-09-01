'use client';

import { useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Plus, Search, Trash2, Pencil, Receipt, Paperclip, X } from 'lucide-react';
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

interface Props {
  type: 'INCOME' | 'EXPENSE';
  title: string;
  description: string;
  transactions: any[];
  total: number;
  page: number;
  pageSize: number;
  categories: any[];
  searchParams: Record<string, string | undefined>;
}

export function TransactionListPage({ type, title, description, transactions, total, page, pageSize, categories, searchParams }: Props) {
  const { accounts } = useAppData();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [query, setQuery] = useState(searchParams.q ?? '');
  const { confirm, dialog } = useConfirm();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const totalAmount = transactions.reduce((s, t) => s + t.baseAmount, 0);

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

  function close() {
    setModalOpen(false);
    setEditing(null);
    router.refresh();
  }

  async function onDelete(id: string) {
    const ok = await confirm('Delete this transaction?', 'This will remove it and update your account balance. This cannot be undone.');
    if (!ok) return;
    const res = await deleteTransaction(id);
    if (res.ok) { toast.success('Transaction deleted'); router.refresh(); }
    else toast.error(res.error);
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        </div>
        <button className="btn-primary" onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /> Add {type === 'INCOME' ? 'Income' : 'Expense'}</button>
      </div>

      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="label">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input className="input pl-9" placeholder="Description or payee..." value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && updateParam('q', query)} onBlur={() => updateParam('q', query)} />
          </div>
        </div>
        <div>
          <label className="label">Category</label>
          <select className="select" value={searchParams.categoryId ?? ''} onChange={(e) => updateParam('categoryId', e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Account</label>
          <select className="select" value={searchParams.accountId ?? ''} onChange={(e) => updateParam('accountId', e.target.value)}>
            <option value="">All accounts</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
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
        {(searchParams.q || searchParams.categoryId || searchParams.accountId || searchParams.from || searchParams.to) && (
          <button className="btn-ghost btn-sm" onClick={() => router.push(pathname)}><X className="h-3.5 w-3.5" /> Clear</button>
        )}
      </div>

      <div className="card overflow-hidden">
        {transactions.length === 0 ? (
          <EmptyState icon={Receipt} title={`No ${type === 'INCOME' ? 'income' : 'expenses'} found`} description="Try adjusting your filters, or add a new entry." action={<button className="btn-primary" onClick={() => setModalOpen(true)}>Add {type === 'INCOME' ? 'income' : 'expense'}</button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Date</th>
                  <th className="text-left font-medium px-4 py-3">Category</th>
                  <th className="text-left font-medium px-4 py-3">Description</th>
                  <th className="text-left font-medium px-4 py-3">Account</th>
                  <th className="text-right font-medium px-4 py-3">Amount</th>
                  <th className="text-right font-medium px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 whitespace-nowrap">{formatDateLong(t.date)}</td>
                    <td className="px-4 py-3">
                      <Badge tone="default">{t.category?.name ?? 'Uncategorized'}</Badge>
                    </td>
                    <td className="px-4 py-3 max-w-[220px] truncate">
                      {t.description || t.payee || '—'}
                      {t.attachments?.length > 0 && <Paperclip className="inline h-3 w-3 ml-1.5 text-muted-foreground" />}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{t.account?.name}</td>
                    <td className={`px-4 py-3 text-right font-medium whitespace-nowrap ${type === 'INCOME' ? 'text-success' : 'text-danger'}`}>
                      {type === 'INCOME' ? '+' : '-'}{formatMoney(t.amount, t.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button className="btn-ghost btn-sm !px-1.5" onClick={() => { setEditing(t); setModalOpen(true); }}><Pencil className="h-3.5 w-3.5" /></button>
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
          <span>Total shown: <strong className="text-foreground">{formatMoney(totalAmount, transactions[0]?.baseCurrency ?? 'USD')}</strong> · {total} record{total === 1 ? '' : 's'}</span>
          <div className="flex items-center gap-2">
            <button className="btn-outline btn-sm" disabled={page <= 1} onClick={() => goToPage(page - 1)}>Previous</button>
            <span>Page {page} of {totalPages}</span>
            <button className="btn-outline btn-sm" disabled={page >= totalPages} onClick={() => goToPage(page + 1)}>Next</button>
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={close} title={editing ? `Edit ${type === 'INCOME' ? 'income' : 'expense'}` : `Add ${type === 'INCOME' ? 'income' : 'expense'}`}>
        <TransactionForm
          type={type}
          initial={editing ? {
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
          } : undefined}
          onSuccess={close}
        />
      </Modal>
      {dialog}
    </div>
  );
}
