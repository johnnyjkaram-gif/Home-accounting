export type BudgetStatus = 'safe' | 'near' | 'over';

export function budgetStatus(spent: number, budgeted: number): BudgetStatus {
  if (budgeted <= 0) return spent > 0 ? 'over' : 'safe';
  const ratio = spent / budgeted;
  if (ratio >= 1) return 'over';
  if (ratio >= 0.85) return 'near';
  return 'safe';
}

export function budgetProgressPct(spent: number, budgeted: number): number {
  if (budgeted <= 0) return spent > 0 ? 100 : 0;
  return Math.min(100, Math.round((spent / budgeted) * 100));
}

/** Estimated completion date for a savings goal given a fixed monthly contribution. */
export function estimateGoalCompletion(
  currentAmount: number,
  targetAmount: number,
  monthlyTarget: number | null | undefined,
  from: Date = new Date(),
): Date | null {
  const remaining = targetAmount - currentAmount;
  if (remaining <= 0) return from; // already achieved
  if (!monthlyTarget || monthlyTarget <= 0) return null; // cannot estimate
  const monthsNeeded = Math.ceil(remaining / monthlyTarget);
  const result = new Date(from.getTime());
  result.setUTCMonth(result.getUTCMonth() + monthsNeeded);
  return result;
}
