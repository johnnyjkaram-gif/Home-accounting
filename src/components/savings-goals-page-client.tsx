'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Target, Pencil, Trash2, PlusCircle } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { SavingsGoalForm } from '@/components/forms/savings-goal-form';
import { ContributionForm } from '@/components/forms/contribution-form';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { formatMoney } from '@/lib/currency';
import { formatDateLong } from '@/lib/utils';
import { estimateGoalCompletion } from '@/lib/budget';
import { deleteSavingsGoal } from '@/lib/actions/savings-goals';
import { toast } from 'sonner';

export function SavingsGoalsPageClient({ goals }: { goals: any[] }) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [contributing, setContributing] = useState<any>(null);
  const { confirm, dialog } = useConfirm();

  function close() { setModalOpen(false); setEditing(null); router.refresh(); }
  function closeContribute() { setContributing(null); router.refresh(); }

  async function onDelete(id: string) {
    const ok = await confirm('Delete this savings goal?', 'Its contribution history will be removed too.');
    if (!ok) return;
    const res = await deleteSavingsGoal(id);
    if (res.ok) { toast.success('Goal deleted'); router.refresh(); }
    else toast.error(res.error);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Savings Goals</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{goals.length} goals · {goals.filter((g) => g.achieved).length} achieved</p>
        </div>
        <button className="btn-primary" onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /> Add Goal</button>
      </div>

      {goals.length === 0 ? (
        <EmptyState icon={Target} title="No savings goals yet" description="Set a target for a new car, emergency fund, vacation, or anything else you're saving for." action={<button className="btn-primary" onClick={() => setModalOpen(true)}>Create a goal</button>} />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {goals.map((g) => {
            const pct = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));
            const remaining = Math.max(0, g.targetAmount - g.currentAmount);
            const eta = estimateGoalCompletion(g.currentAmount, g.targetAmount, g.monthlyTarget);
            return (
              <div key={g.id} className="card p-4 sm:p-5">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-semibold">{g.name}</p>
                  {g.achieved && <Badge tone="success">Achieved</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mb-3">{g.account ? `Linked to ${g.account.name}` : 'No linked account'}{g.deadline ? ` · Target date ${formatDateLong(g.deadline)}` : ''}</p>
                <Progress value={pct} status={pct >= 100 ? 'safe' : pct >= 60 ? 'safe' : 'near'} className="mb-2" />
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium">{formatMoney(g.currentAmount, g.currency)} of {formatMoney(g.targetAmount, g.currency)}</span>
                  <span className="text-muted-foreground">{pct}%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {remaining > 0 ? `${formatMoney(remaining, g.currency)} remaining` : 'Goal reached!'}
                  {eta && remaining > 0 ? ` · Est. completion ${formatDateLong(eta)}` : ''}
                </p>
                <div className="flex items-center gap-2 mt-4">
                  <button className="btn-primary btn-sm flex-1" onClick={() => setContributing(g)}><PlusCircle className="h-3.5 w-3.5" /> Add Funds</button>
                  <button className="btn-outline btn-sm !px-2.5" onClick={() => { setEditing(g); setModalOpen(true); }}><Pencil className="h-3.5 w-3.5" /></button>
                  <button className="btn-outline btn-sm !px-2.5 text-danger" onClick={() => onDelete(g.id)}><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={close} title={editing ? 'Edit savings goal' : 'Add savings goal'}>
        <SavingsGoalForm
          initial={editing ? { id: editing.id, name: editing.name, targetAmount: String(editing.targetAmount), currency: editing.currency, deadline: editing.deadline?.toISOString().slice(0, 10), monthlyTarget: editing.monthlyTarget ? String(editing.monthlyTarget) : '', accountId: editing.accountId ?? '' } : undefined}
          onSuccess={close}
        />
      </Modal>

      {contributing && (
        <Modal open onClose={closeContribute} title={`Add funds to ${contributing.name}`} size="sm">
          <ContributionForm goalId={contributing.id} onSuccess={closeContribute} />
        </Modal>
      )}
      {dialog}
    </div>
  );
}
