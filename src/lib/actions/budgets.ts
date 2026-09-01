'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { budgetSchema } from '@/lib/validations';
import { requireHousehold, safeAction, type ActionResult } from '@/lib/server/action-utils';

export async function upsertBudget(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return safeAction(async () => {
    const { householdId } = await requireHousehold();
    const data = budgetSchema.parse(raw);

    const budget = await prisma.budget.upsert({
      where: {
        householdId_categoryId_period_month_year: {
          householdId,
          categoryId: data.categoryId,
          period: data.period,
          month: data.period === 'MONTHLY' ? data.month ?? new Date().getMonth() + 1 : null,
          year: data.year,
        },
      },
      create: {
        householdId,
        categoryId: data.categoryId,
        amount: data.amount,
        currency: data.currency,
        period: data.period,
        month: data.period === 'MONTHLY' ? data.month ?? new Date().getMonth() + 1 : null,
        year: data.year,
      },
      update: {
        amount: data.amount,
        currency: data.currency,
      },
    });

    revalidatePath('/budgets');
    revalidatePath('/dashboard');
    return { id: budget.id };
  });
}

export async function deleteBudget(id: string): Promise<ActionResult<{ id: string }>> {
  return safeAction(async () => {
    const { householdId } = await requireHousehold();
    const existing = await prisma.budget.findFirst({ where: { id, householdId } });
    if (!existing) throw new Error('Budget not found');
    await prisma.budget.delete({ where: { id } });
    revalidatePath('/budgets');
    revalidatePath('/dashboard');
    return { id };
  });
}
