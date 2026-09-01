'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { accountSchema } from '@/lib/validations';
import { requireHousehold, safeAction, type ActionResult } from '@/lib/server/action-utils';

export async function createAccount(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return safeAction(async () => {
    const { householdId } = await requireHousehold();
    const data = accountSchema.parse(raw);
    const account = await prisma.account.create({
      data: {
        householdId,
        name: data.name,
        type: data.type,
        currency: data.currency,
        openingBalance: data.openingBalance,
        color: data.color || null,
        icon: data.icon || null,
      },
    });
    revalidatePath('/accounts');
    revalidatePath('/dashboard');
    return { id: account.id };
  });
}

export async function updateAccount(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return safeAction(async () => {
    const { householdId } = await requireHousehold();
    const data = accountSchema.parse(raw);
    if (!data.id) throw new Error('Missing account id');
    const existing = await prisma.account.findFirst({ where: { id: data.id, householdId } });
    if (!existing) throw new Error('Account not found');
    await prisma.account.update({
      where: { id: data.id },
      data: {
        name: data.name,
        type: data.type,
        currency: data.currency,
        openingBalance: data.openingBalance,
        color: data.color || null,
        icon: data.icon || null,
      },
    });
    revalidatePath('/accounts');
    revalidatePath('/dashboard');
    return { id: data.id };
  });
}

export async function archiveAccount(id: string, archived: boolean): Promise<ActionResult<{ id: string }>> {
  return safeAction(async () => {
    const { householdId } = await requireHousehold();
    const existing = await prisma.account.findFirst({ where: { id, householdId } });
    if (!existing) throw new Error('Account not found');
    await prisma.account.update({ where: { id }, data: { archived } });
    revalidatePath('/accounts');
    revalidatePath('/dashboard');
    return { id };
  });
}

export async function deleteAccount(id: string): Promise<ActionResult<{ id: string }>> {
  return safeAction(async () => {
    const { householdId } = await requireHousehold();
    const existing = await prisma.account.findFirst({ where: { id, householdId } });
    if (!existing) throw new Error('Account not found');

    const txCount = await prisma.transaction.count({ where: { OR: [{ accountId: id }, { toAccountId: id }] } });
    if (txCount > 0) {
      throw new Error(`This account has ${txCount} transaction(s). Archive it instead of deleting, or delete its transactions first.`);
    }

    await prisma.account.delete({ where: { id } });
    revalidatePath('/accounts');
    revalidatePath('/dashboard');
    return { id };
  });
}
