'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { savingsGoalSchema, goalContributionSchema } from '@/lib/validations';
import { requireHousehold, safeAction, type ActionResult } from '@/lib/server/action-utils';

export async function createSavingsGoal(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return safeAction(async () => {
    const { householdId } = await requireHousehold();
    const data = savingsGoalSchema.parse(raw);
    const goal = await prisma.savingsGoal.create({
      data: {
        householdId,
        name: data.name,
        targetAmount: data.targetAmount,
        currency: data.currency,
        currentAmount: data.currentAmount,
        deadline: data.deadline || null,
        monthlyTarget: data.monthlyTarget || null,
        accountId: data.accountId || null,
        notes: data.notes || null,
      },
    });
    revalidatePath('/savings-goals');
    revalidatePath('/dashboard');
    return { id: goal.id };
  });
}

export async function updateSavingsGoal(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return safeAction(async () => {
    const { householdId } = await requireHousehold();
    const data = savingsGoalSchema.parse(raw);
    if (!data.id) throw new Error('Missing goal id');
    const existing = await prisma.savingsGoal.findFirst({ where: { id: data.id, householdId } });
    if (!existing) throw new Error('Savings goal not found');
    await prisma.savingsGoal.update({
      where: { id: data.id },
      data: {
        name: data.name,
        targetAmount: data.targetAmount,
        currency: data.currency,
        deadline: data.deadline || null,
        monthlyTarget: data.monthlyTarget || null,
        accountId: data.accountId || null,
        notes: data.notes || null,
      },
    });
    revalidatePath('/savings-goals');
    return { id: data.id };
  });
}

export async function deleteSavingsGoal(id: string): Promise<ActionResult<{ id: string }>> {
  return safeAction(async () => {
    const { householdId } = await requireHousehold();
    const existing = await prisma.savingsGoal.findFirst({ where: { id, householdId } });
    if (!existing) throw new Error('Savings goal not found');
    await prisma.savingsGoal.delete({ where: { id } });
    revalidatePath('/savings-goals');
    return { id };
  });
}

export async function addGoalContribution(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return safeAction(async () => {
    const { householdId } = await requireHousehold();
    const data = goalContributionSchema.parse(raw);
    const goal = await prisma.savingsGoal.findFirst({ where: { id: data.goalId, householdId } });
    if (!goal) throw new Error('Savings goal not found');

    const newAmount = goal.currentAmount + data.amount;

    await prisma.$transaction([
      prisma.savingsContribution.create({
        data: {
          savingsGoalId: data.goalId,
          accountId: data.accountId || null,
          amount: data.amount,
          date: data.date,
          notes: data.notes || null,
        },
      }),
      prisma.savingsGoal.update({
        where: { id: data.goalId },
        data: { currentAmount: newAmount, achieved: newAmount >= goal.targetAmount },
      }),
    ]);

    revalidatePath('/savings-goals');
    revalidatePath('/dashboard');
    return { id: data.goalId };
  });
}
