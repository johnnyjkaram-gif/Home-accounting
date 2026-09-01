'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Wallet, Landmark, PiggyBank, CreditCard, Smartphone } from 'lucide-react';
import { useAppData } from '@/components/app-data-context';
import { Modal } from '@/components/ui/modal';
import { AccountForm } from '@/components/forms/account-form';
import { RowMenu } from '@/components/ui/row-menu';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { formatMoney } from '@/lib/currency';
import { ACCOUNT_TYPE_LABELS } from '@/lib/constants';
import { archiveAccount, deleteAccount } from '@/lib/actions/accounts';
import { toast } from 'sonner';

const TYPE_ICON: Record<string, any> = { BANK: Landmark, CASH: Wallet, SAVINGS: PiggyBank, CREDIT_CARD: CreditCard, DIGITAL_WALLET: Smartphone, OTHER: Wallet };

export default function AccountsPage() {
  const { accounts, household } = useAppData();
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [showArchived, setShowArchived] = useState(false);
  const { confirm, dialog } = useConfirm();

  function close() {
    setModalOpen(false);
    setEditing(null);
    router.refresh();
  }

  const visible = accounts.filter((a) => showArchived || !a.archived);
  const totalByBaseCurrency = accounts
    .filter((a) => !a.archived && a.currency === household.baseCurrency)
    .reduce((s, a) => s + a.balance, 0);

  async function onArchive(id: string, archived: boolean) {
    const res = await archiveAccount(id, archived);
    if (res.ok) { toast.success(archived ? 'Account archived' : 'Account restored'); router.refresh(); }
    else toast.error(res.error);
  }

  async function onDelete(id: string) {
    const ok = await confirm('Delete account?', 'This cannot be undone. Accounts with transactions cannot be deleted — archive them instead.');
    if (!ok) return;
    const res = await deleteAccount(id);
    if (res.ok) { toast.success('Account deleted'); router.refresh(); }
    else toast.error(res.error);
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Accounts & Wallets</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {accounts.filter((a) => !a.archived).length} active accounts · {formatMoney(totalByBaseCurrency, household.baseCurrency)} in {household.baseCurrency}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-outline btn-sm" onClick={() => setShowArchived((s) => !s)}>{showArchived ? 'Hide archived' : 'Show archived'}</button>
          <button className="btn-primary" onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /> Add Account</button>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState icon={Wallet} title="No accounts yet" description="Add a bank account, cash wallet, savings account, or credit card to get started." action={<button className="btn-primary" onClick={() => setModalOpen(true)}>Add your first account</button>} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((a) => {
            const Icon = TYPE_ICON[a.type] ?? Wallet;
            return (
              <div key={a.id} className={`card p-5 ${a.archived ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: (a.color ?? '#6366f1') + '1A', color: a.color ?? '#6366f1' }}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <RowMenu
                    items={[
                      { label: 'Edit', onClick: () => { setEditing(a); setModalOpen(true); } },
                      { label: a.archived ? 'Restore' : 'Archive', onClick: () => onArchive(a.id, !a.archived) },
                      { label: 'Delete', danger: true, onClick: () => onDelete(a.id) },
                    ]}
                  />
                </div>
                <p className="font-semibold">{a.name}</p>
                <p className="text-xs text-muted-foreground mb-3">{ACCOUNT_TYPE_LABELS[a.type]} · {a.currency}{a.isDemo ? ' · Demo' : ''}</p>
                <p className={`text-2xl font-semibold tracking-tight ${a.balance < 0 ? 'text-danger' : ''}`}>{formatMoney(a.balance, a.currency)}</p>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={close} title={editing ? 'Edit account' : 'Add account'}>
        <AccountForm
          initial={editing ? { id: editing.id, name: editing.name, type: editing.type, currency: editing.currency, openingBalance: String(editing.openingBalance) } : undefined}
          onSuccess={close}
        />
      </Modal>
      {dialog}
    </div>
  );
}
