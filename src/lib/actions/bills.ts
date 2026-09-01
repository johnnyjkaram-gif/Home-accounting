'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { billSchema } from '@/lib/validations';
import { requireHousehold, safeAction, type ActionResult } from '@/lib/server/action-utils';
import { resolveBaseAmount } from '@/lib/server/currency-helper';
import { addPeriod } from '@/lib/recurrence';

export async function createBill(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return safeAction(async () => {
    const { householdId } = await requireHousehold();
    const data = billSchema.parse(raw);
    const bill = await prisma.bill.create({
      data: {
        householdId,
        name: data.name,
        amount: data.amount,
        currency: data.currency,
        dueDate: data.dueDate,
        frequency: data.frequency,
        categoryId: data.categoryId || null,
        accountId: data.accountId || null,
        autoReminder: data.autoReminder,
        notes: data.notes || null,
      },
    });
    revalidatePath('/bills');
    revalidatePath('/calendar');
    revalidatePath('/dashboard');
    return { id: bill.id };
  });
}

export async function updateBill(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return safeAction(async () => {
    const { householdId } = await requireHousehold();
    const data = billSchema.parse(raw);
    if (!data.id) throw new Error('Missing bill id');
    const existing = await prisma.bill.findFirst({ where: { id: data.id, householdId } });
    if (!existing) throw new Error('Bill not found');
    await prisma.bill.update({
      where: { id: data.id },
      data: {
        name: data.name,
        amount: data.amount,
        currency: data.currency,
        dueDate: data.dueDate,
        frequency: data.frequency,
        categoryId: data.categoryId || null,
        accountId: data.accountId || null,
        autoReminder: data.autoReminder,
        notes: data.notes || null,
      },
    });
    revalidatePath('/bills');
    revalidatePath('/calendar');
    return { id: data.id };
  });
}

export async function deleteBill(id: string): Promise<ActionResult<{ id: string }>> {
  return safeAction(async () => {
    const { householdId } = await requireHousehold();
    const existing = await prisma.bill.findFirst({ where: { id, householdId } });
    if (!existing) throw new Error('Bill not found');
    await prisma.bill.delete({ where: { id } });
    revalidatePath('/bills');
    revalidatePath('/calendar');
    return { id };
  });
}

/** Marks a bill paid: records an expense transaction and advances the due date to the next cycle. */
export async function payBill(id: string, accountId: string, paidDate: Date): Promise<ActionResult<{ id: string }>> {
  return safeAction(async () => {
    const { householdId, baseCurrency } = await requireHousehold();
    const bill = await prisma.bill.findFirst({ where: { id, householdId } });
    if (!bill) throw new Error('Bill not found');
    const account = await prisma.account.findFirst({ where: { id: accountId, householdId } });
    if (!account) throw new Error('Account not found');

    const { baseAmount, exchangeRate } = await resolveBaseAmount(householdId, bill.amount, bill.currency, baseCurrency, paidDate);

    await prisma.$transaction([
      prisma.transaction.create({
        data: {
          householdId,
          type: 'EXPENSE',
          date: paidDate,
          amount: bill.amount,
          currency: bill.currency,
          baseAmount,
          baseCurrency,
          exchangeRate,
          accountId,
          categoryId: bill.categoryId,
          payee: bill.name,
          description: `Bill payment: ${bill.name}`,
          billId: bill.id,
        },
      }),
      prisma.bill.update({
        where: { id },
        data: {
          lastPaidDate: paidDate,
          dueDate: bill.frequency === 'ONE_TIME' ? bill.dueDate : addPeriod(bill.dueDate, bill.frequency as any, 1),
        },
      }),
    ]);

    revalidatePath('/bills');
    revalidatePath('/dashboard');
    revalidatePath('/transactions');
    revalidatePath('/calendar');
    return { id };
  });
}
