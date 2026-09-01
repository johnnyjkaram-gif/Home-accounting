'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Download, Upload, ShieldAlert, Bell, Palette, Wallet, Users, Lock, Database, RefreshCw } from 'lucide-react';
import { DEFAULT_CURRENCIES } from '@/lib/constants';
import { Modal } from '@/components/ui/modal';
import { CategoryForm } from '@/components/forms/category-form';
import { ExchangeRateForm } from '@/components/forms/exchange-rate-form';
import { FamilyMemberForm } from '@/components/forms/family-member-form';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useAction } from '@/lib/use-action';
import { updateGeneralSettings, changePassword, deleteDemoData, deleteAllData, addCurrency, refreshExchangeRates, removeFamilyMember } from '@/lib/actions/settings';
import { deleteCategory, createPaymentMethod, deletePaymentMethod } from '@/lib/actions/categories';
import { deleteExchangeRate } from '@/lib/actions/settings';
import { formatDateLong } from '@/lib/utils';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const TABS = [
  { key: 'general', label: 'General', icon: Palette },
  { key: 'currency', label: 'Currency', icon: Wallet },
  { key: 'categories', label: 'Categories', icon: Palette },
  { key: 'family', label: 'Family Users', icon: Users },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'security', label: 'Security', icon: Lock },
  { key: 'data', label: 'Data', icon: Database },
];

export function SettingsPageClient({ household, categories, exchangeRates, paymentMethods, users, currentRole, currentUserId, currencies, liveRatesConfigured }: any) {
  const [tab, setTab] = useState('general');
  const router = useRouter();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your household preferences, currencies, and data.</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`btn-sm rounded-full px-3 ${tab === t.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'general' && <GeneralTab household={household} />}
      {tab === 'currency' && <CurrencyTab household={household} exchangeRates={exchangeRates} currencies={currencies} liveRatesConfigured={liveRatesConfigured} />}
      {tab === 'categories' && <CategoriesTab categories={categories} />}
      {tab === 'family' && <FamilyTab users={users} currentRole={currentRole} currentUserId={currentUserId} />}
      {tab === 'notifications' && <NotificationsTab />}
      {tab === 'security' && <SecurityTab />}
      {tab === 'data' && <DataTab paymentMethods={paymentMethods} />}
    </div>
  );
}

function GeneralTab({ household }: any) {
  const [values, setValues] = useState({ name: household.name, baseCurrency: household.baseCurrency, dateFormat: household.dateFormat, language: household.language });
  const { run, pending } = useAction(updateGeneralSettings, () => toast.success('Settings saved'));

  return (
    <form onSubmit={(e) => { e.preventDefault(); run(values); }} className="card p-5 max-w-lg space-y-4">
      <div>
        <label className="label">Household name</label>
        <input required className="input" value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} />
      </div>
      <div>
        <label className="label">Base currency</label>
        <select className="select" value={values.baseCurrency} onChange={(e) => setValues({ ...values, baseCurrency: e.target.value })}>
          {DEFAULT_CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
        </select>
        <p className="text-xs text-muted-foreground mt-1">All dashboard totals are shown in this currency, converted using your saved exchange rates.</p>
      </div>
      <div>
        <label className="label">Date format</label>
        <select className="select" value={values.dateFormat} onChange={(e) => setValues({ ...values, dateFormat: e.target.value })}>
          <option value="DD/MM/YYYY">DD/MM/YYYY</option>
          <option value="MM/DD/YYYY">MM/DD/YYYY</option>
          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
        </select>
      </div>
      <div>
        <label className="label">Language</label>
        <select className="select" value={values.language} onChange={(e) => setValues({ ...values, language: e.target.value })}>
          <option value="en">English</option>
          <option value="ar">Arabic</option>
          <option value="fr">French</option>
        </select>
        <p className="text-xs text-muted-foreground mt-1">Interface text is currently English-only; this sets your stored preference for future localization.</p>
      </div>
      <button type="submit" disabled={pending} className="btn-primary">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Save changes
      </button>
    </form>
  );
}

function CurrencyTab({ household, exchangeRates, currencies, liveRatesConfigured }: any) {
  const [modalOpen, setModalOpen] = useState(false);
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const [newCurrency, setNewCurrency] = useState({ code: '', name: '', symbol: '' });
  const { run: runAddCurrency, pending: addingCurrency } = useAction(addCurrency, () => {
    toast.success('Currency added');
    setNewCurrency({ code: '', name: '', symbol: '' });
    router.refresh();
  });
  const { run: runRefresh, pending: refreshing } = useAction(refreshExchangeRates, (data) => {
    toast.success(`Updated ${data.updated} rate${data.updated === 1 ? '' : 's'} from today's published rates`);
    router.refresh();
  });

  function close() { setModalOpen(false); router.refresh(); }

  async function onDelete(id: string) {
    const ok = await confirm('Delete this exchange rate?');
    if (!ok) return;
    const res = await deleteExchangeRate(id);
    if (res.ok) { toast.success('Rate deleted'); router.refresh(); }
    else toast.error(res.error);
  }

  const knownCodes = new Set(DEFAULT_CURRENCIES.map((c) => c.code));
  const customCurrencies = (currencies ?? []).filter((c: any) => !knownCodes.has(c.code));

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <p className="text-sm text-muted-foreground">
          Base currency: <strong className="text-foreground">{household.baseCurrency}</strong>. Add exchange rates below so transactions in other currencies convert accurately.
          Rates are historical — the rate effective on a transaction's date is used automatically, and past transactions are never recalculated.
        </p>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-3 flex items-center gap-2"><Wallet className="h-4 w-4" /> Currencies</h2>
        <p className="text-sm text-muted-foreground mb-3">
          USD, LBP and EUR are built in. Add any other currency code your household uses — it will then appear everywhere a currency can be selected.
        </p>
        {customCurrencies.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {customCurrencies.map((c: any) => (
              <span key={c.code} className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium">
                {c.symbol} {c.code} — {c.name}
              </span>
            ))}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runAddCurrency({ ...newCurrency, code: newCurrency.code.toUpperCase() });
          }}
          className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_1fr_auto] gap-2"
        >
          <input
            className="input"
            placeholder="Code (e.g. AED)"
            maxLength={10}
            required
            value={newCurrency.code}
            onChange={(e) => setNewCurrency({ ...newCurrency, code: e.target.value.toUpperCase() })}
          />
          <input
            className="input"
            placeholder="Name (e.g. UAE Dirham)"
            required
            value={newCurrency.name}
            onChange={(e) => setNewCurrency({ ...newCurrency, name: e.target.value })}
          />
          <input
            className="input"
            placeholder="Symbol (e.g. د.إ)"
            required
            value={newCurrency.symbol}
            onChange={(e) => setNewCurrency({ ...newCurrency, symbol: e.target.value })}
          />
          <button type="submit" disabled={addingCurrency} className="btn-outline shrink-0">
            {addingCurrency && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <Plus className="h-4 w-4" /> Add
          </button>
        </form>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-semibold flex items-center gap-2"><RefreshCw className="h-4 w-4" /> Automatic rates</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {liveRatesConfigured
                ? "Pulls today's published rates for your base currency and saves them as today's rate for every currency you've added."
                : 'Not set up — add EXCHANGE_RATE_API_KEY to your environment to enable one-click rate refreshes. Manual rates below work fully without it.'}
            </p>
          </div>
          <button className="btn-outline shrink-0" disabled={!liveRatesConfigured || refreshing} onClick={() => runRefresh(undefined)}>
            {refreshing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <RefreshCw className="h-4 w-4" /> Refresh rates
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /> Add Exchange Rate</button>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left font-medium px-4 py-3">Pair</th>
              <th className="text-left font-medium px-4 py-3">Rate</th>
              <th className="text-left font-medium px-4 py-3">Effective date</th>
              <th className="text-left font-medium px-4 py-3">Source</th>
              <th className="text-right font-medium px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {exchangeRates.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No exchange rates yet.</td></tr>}
            {exchangeRates.map((r: any) => (
              <tr key={r.id}>
                <td className="px-4 py-3">1 {r.baseCurrency} = {r.targetCurrency}</td>
                <td className="px-4 py-3">{r.rate.toLocaleString()}</td>
                <td className="px-4 py-3">{formatDateLong(r.date)}</td>
                <td className="px-4 py-3 capitalize">{r.source.toLowerCase()}</td>
                <td className="px-4 py-3 text-right">
                  <button className="btn-ghost btn-sm !px-1.5 text-danger" onClick={() => onDelete(r.id)}><Trash2 className="h-3.5 w-3.5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={modalOpen} onClose={close} title="Add exchange rate" size="sm">
        <ExchangeRateForm onSuccess={close} />
      </Modal>
      {dialog}
    </div>
  );
}

function CategoriesTab({ categories }: any) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [kindTab, setKindTab] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const router = useRouter();
  const { confirm, dialog } = useConfirm();

  function close() { setModalOpen(false); setEditing(null); router.refresh(); }

  async function onDelete(id: string) {
    const ok = await confirm('Delete this category?', 'Categories used by existing transactions cannot be deleted.');
    if (!ok) return;
    const res = await deleteCategory(id);
    if (res.ok) { toast.success('Category deleted'); router.refresh(); }
    else toast.error(res.error);
  }

  const filtered = categories.filter((c: any) => c.kind === kindTab);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          <button onClick={() => setKindTab('EXPENSE')} className={`btn-sm rounded-full px-3 ${kindTab === 'EXPENSE' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>Expense</button>
          <button onClick={() => setKindTab('INCOME')} className={`btn-sm rounded-full px-3 ${kindTab === 'INCOME' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>Income</button>
        </div>
        <button className="btn-primary" onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /> Add Category</button>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {filtered.map((c: any) => (
          <div key={c.id} className="card p-3 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm font-medium truncate"><span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: c.color }} />{c.name}</span>
            <div className="flex items-center gap-1 shrink-0">
              <button className="btn-ghost btn-sm !px-1.5" onClick={() => { setEditing(c); setModalOpen(true); }}>Edit</button>
              {!c.isDefault && <button className="btn-ghost btn-sm !px-1.5 text-danger" onClick={() => onDelete(c.id)}><Trash2 className="h-3.5 w-3.5" /></button>}
            </div>
          </div>
        ))}
      </div>
      <Modal open={modalOpen} onClose={close} title={editing ? 'Edit category' : 'Add category'} size="sm">
        <CategoryForm defaultKind={kindTab} initial={editing} onSuccess={close} />
      </Modal>
      {dialog}
    </div>
  );
}

function FamilyTab({ users, currentRole, currentUserId }: any) {
  const [modalOpen, setModalOpen] = useState(false);
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const isAdmin = currentRole === 'ADMIN';

  function close() { setModalOpen(false); router.refresh(); }

  async function onRemove(u: any) {
    const ok = await confirm('Remove this family member?', `${u.name} (${u.email}) will no longer be able to sign in.`);
    if (!ok) return;
    const res = await removeFamilyMember(u.id);
    if (res.ok) { toast.success('Family member removed'); router.refresh(); }
    else toast.error(res.error);
  }

  return (
    <div className="space-y-4">
      <div className="card p-5 flex items-start justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Everyone below shares this household's data — the same accounts, transactions, budgets, and reports — at their own
          permission level: <strong className="text-foreground">Admin</strong> (full access, can add/remove family members),
          <strong className="text-foreground"> Member</strong> (can add/edit transactions), and <strong className="text-foreground">Viewer / Reports Only</strong> (read-only).
          {!isAdmin && ' Only an Admin can add or remove family members.'}
        </p>
        {isAdmin && (
          <button className="btn-primary shrink-0" onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /> Add Family Member</button>
        )}
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left font-medium px-4 py-3">Name</th>
              <th className="text-left font-medium px-4 py-3">Email</th>
              <th className="text-left font-medium px-4 py-3">Role</th>
              {isAdmin && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u: any) => (
              <tr key={u.id}>
                <td className="px-4 py-3">{u.name}{u.id === currentUserId && <span className="text-muted-foreground"> (you)</span>}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                <td className="px-4 py-3">{u.role}</td>
                {isAdmin && (
                  <td className="px-4 py-3 text-right">
                    {u.id !== currentUserId && (
                      <button className="btn-ghost btn-sm !px-1.5 text-danger" onClick={() => onRemove(u)}><Trash2 className="h-3.5 w-3.5" /></button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={modalOpen} onClose={close} title="Add family member" size="sm">
        <FamilyMemberForm onSuccess={close} />
      </Modal>
      {dialog}
    </div>
  );
}

function NotificationsTab() {
  return (
    <div className="card p-5 space-y-3 max-w-lg">
      <div className="flex items-center gap-2 text-sm font-medium"><Bell className="h-4 w-4 text-primary" /> Bill reminders</div>
      <p className="text-sm text-muted-foreground">Automatically shown in the notification bell for bills due within 3 days, due today, or overdue. No setup needed.</p>
      <div className="h-px bg-border" />
      <div className="flex items-center gap-2 text-sm font-medium"><Bell className="h-4 w-4 text-primary" /> Budget alerts</div>
      <p className="text-sm text-muted-foreground">Shown automatically when a category budget reaches 85% (near limit) or exceeds 100% (over budget) for the current period.</p>
    </div>
  );
}

function SecurityTab() {
  const [values, setValues] = useState({ currentPassword: '', newPassword: '' });
  const { run, pending } = useAction(changePassword, () => {
    toast.success('Password updated');
    setValues({ currentPassword: '', newPassword: '' });
  });

  return (
    <div className="space-y-4 max-w-lg">
      <form onSubmit={(e) => { e.preventDefault(); run(values); }} className="card p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><Lock className="h-4 w-4" /> Change password</h2>
        <div>
          <label className="label">Current password</label>
          <input type="password" required className="input" value={values.currentPassword} onChange={(e) => setValues({ ...values, currentPassword: e.target.value })} />
        </div>
        <div>
          <label className="label">New password</label>
          <input type="password" required className="input" value={values.newPassword} onChange={(e) => setValues({ ...values, newPassword: e.target.value })} />
          <p className="text-xs text-muted-foreground mt-1">At least 8 characters, with a letter and a number.</p>
        </div>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Update password
        </button>
      </form>
      <div className="card p-5">
        <h2 className="font-semibold mb-2">Session</h2>
        <p className="text-sm text-muted-foreground">You're signed in with a secure, encrypted session cookie that expires automatically after 30 days of inactivity. Use "Sign out" in the sidebar to end it immediately on this device.</p>
      </div>
    </div>
  );
}

function DataTab({ paymentMethods }: any) {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const [newMethod, setNewMethod] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [importing, setImporting] = useState(false);

  async function addMethod(e: React.FormEvent) {
    e.preventDefault();
    if (!newMethod.trim()) return;
    const res = await createPaymentMethod({ name: newMethod.trim() });
    if (res.ok) { toast.success('Payment method added'); setNewMethod(''); router.refresh(); }
    else toast.error(res.error);
  }

  async function removeMethod(id: string) {
    const res = await deletePaymentMethod(id);
    if (res.ok) { toast.success('Removed'); router.refresh(); }
    else toast.error(res.error);
  }

  async function onDeleteDemo() {
    const ok = await confirm('Remove all demo data?', 'This deletes every record marked as sample/demo data, keeping your own entries.');
    if (!ok) return;
    const res = await deleteDemoData();
    if (res.ok) { toast.success('Demo data removed'); router.refresh(); }
    else toast.error(res.error);
  }

  async function onDeleteAll() {
    const res = await deleteAllData(confirmText);
    if (res.ok) { toast.success('All data deleted'); setConfirmText(''); router.refresh(); }
    else toast.error(res.error);
  }

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const res = await fetch('/api/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: text });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Imported ${data.imported} transactions`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Import failed');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  }

  return (
    <div className="space-y-4 max-w-lg">
      <div className="card p-5">
        <h2 className="font-semibold mb-3">Payment methods</h2>
        <div className="space-y-1.5 mb-3">
          {paymentMethods.map((pm: any) => (
            <div key={pm.id} className="flex items-center justify-between text-sm rounded-lg px-3 py-2 bg-muted">
              {pm.name}
              <button className="text-danger" onClick={() => removeMethod(pm.id)}><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
        <form onSubmit={addMethod} className="flex gap-2">
          <input className="input" placeholder="e.g. Mobile Money" value={newMethod} onChange={(e) => setNewMethod(e.target.value)} />
          <button className="btn-outline shrink-0">Add</button>
        </form>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-3 flex items-center gap-2"><Download className="h-4 w-4" /> Export data</h2>
        <p className="text-sm text-muted-foreground mb-3">Download a full backup (JSON) or a spreadsheet-friendly transaction list (CSV).</p>
        <div className="flex gap-2">
          <a href="/api/export?format=json" className="btn-outline btn-sm">Full backup (JSON)</a>
          <a href="/api/export?format=csv" className="btn-outline btn-sm">Transactions (CSV)</a>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-3 flex items-center gap-2"><Upload className="h-4 w-4" /> Import data</h2>
        <p className="text-sm text-muted-foreground mb-3">Restore from a JSON backup produced by the export above. Matching accounts and categories are reused; everything else is added fresh.</p>
        <label className="btn-outline btn-sm cursor-pointer inline-flex">
          {importing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Choose backup file
          <input type="file" accept="application/json" className="hidden" onChange={onImport} disabled={importing} />
        </label>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-3">Backups</h2>
        <p className="text-sm text-muted-foreground">Your data lives in your own PostgreSQL database. Use the export above for an application-level backup, and see the README for scheduling <code>pg_dump</code> backups of the whole database.</p>
      </div>

      <div className="card p-5 border-warning/40">
        <h2 className="font-semibold mb-2 text-warning">Remove demo data</h2>
        <p className="text-sm text-muted-foreground mb-3">Deletes everything marked as sample data (from initial setup) while keeping anything you've entered yourself.</p>
        <button className="btn-outline btn-sm" onClick={onDeleteDemo}>Remove demo data</button>
      </div>

      <div className="card p-5 border-danger/40">
        <h2 className="font-semibold mb-2 text-danger flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> Danger zone</h2>
        <p className="text-sm text-muted-foreground mb-3">Permanently deletes every account, transaction, bill, budget, and goal for this household. This cannot be undone. Type <strong>DELETE</strong> to confirm.</p>
        <div className="flex gap-2">
          <input className="input" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="DELETE" />
          <button className="btn-danger shrink-0" disabled={confirmText !== 'DELETE'} onClick={onDeleteAll}>Delete everything</button>
        </div>
      </div>
      {dialog}
    </div>
  );
}
