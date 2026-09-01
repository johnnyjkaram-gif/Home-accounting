'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { budgetSchema } from '@/lib/validations';
import { requireHousehold, safeAction, type ActionResult } from '@/lib/server/action-utils';

export async function upsertBudget(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return safeAction(async () => {
    const { householdId } = await requireHousehold();
    const data = budgetSchema.parse(raw);
    const month = data.period === 'MONTHLY' ? data.month ?? new Date().getMonth() + 1 : null;

    // Note: month is nullable (null for YEARLY budgets), and Prisma's generated
    // WhereUniqueInput for a compound @@unique that includes a nullable column
    // does not accept null there — so we can't use upsert()'s compound-key where
    // clause directly. Look the row up manually instead, then update or create.
    const existing = await prisma.budget.findFirst({
      where: { householdId, categoryId: data.categoryId, period: data.period, month, year: data.year },
    });

    const budget = existing
      ? await prisma.budget.update({
          where: { id: existing.id },
          data: { amount: data.amount, currency: data.currency },
        })
      : await prisma.budget.create({
          data: {
            householdId,
            categoryId: data.categoryId,
            amount: data.amount,
            currency: data.currency,
            period: data.period,
            month,
            year: data.year,
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
