'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { receivableSchema, receivablePaymentSchema } from '@/lib/validations';
import { requireHousehold, safeAction, type ActionResult } from '@/lib/server/action-utils';
import { resolveBaseAmount } from '@/lib/server/currency-helper';

export async function createReceivable(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return safeAction(async () => {
    const { householdId } = await requireHousehold();
    const data = receivableSchema.parse(raw);
    const receivable = await prisma.receivable.create({
      data: {
        householdId,
        person: data.person,
        amount: data.amount,
        currency: data.currency,
        date: data.date,
        dueDate: data.dueDate || null,
        description: data.description || null,
        notes: data.notes || null,
      },
    });
    revalidatePath('/receivables');
    revalidatePath('/dashboard');
    return { id: receivable.id };
  });
}

export async function updateReceivable(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return safeAction(async () => {
    const { householdId } = await requireHousehold();
    const data = receivableSchema.parse(raw);
    if (!data.id) throw new Error('Missing receivable id');
    const existing = await prisma.receivable.findFirst({ where: { id: data.id, householdId } });
    if (!existing) throw new Error('Receivable not found');
    await prisma.receivable.update({
      where: { id: data.id },
      data: {
        person: data.person,
        amount: data.amount,
        currency: data.currency,
        date: data.date,
        dueDate: data.dueDate || null,
        description: data.description || null,
        notes: data.notes || null,
      },
    });
    revalidatePath('/receivables');
    return { id: data.id };
  });
}

export async function deleteReceivable(id: string): Promise<ActionResult<{ id: string }>> {
  return safeAction(async () => {
    const { householdId } = await requireHousehold();
    const existing = await prisma.receivable.findFirst({ where: { id, householdId } });
    if (!existing) throw new Error('Receivable not found');
    await prisma.receivable.delete({ where: { id } });
    revalidatePath('/receivables');
    revalidatePath('/dashboard');
    return { id };
  });
}

export async function addReceivablePayment(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return safeAction(async () => {
    const { householdId, baseCurrency } = await requireHousehold();
    const data = receivablePaymentSchema.parse(raw);
    const receivable = await prisma.receivable.findFirst({ where: { id: data.receivableId, householdId }, include: { payments: true } });
    if (!receivable) throw new Error('Receivable not found');

    const alreadyPaid = receivable.payments.reduce((s, p) => s + p.amount, 0);
    const newTotal = alreadyPaid + data.amount;
    if (newTotal > receivable.amount + 0.01) {
      throw new Error(`Payment exceeds the remaining balance owed (${(receivable.amount - alreadyPaid).toFixed(2)} ${receivable.currency}).`);
    }
    const status = newTotal >= receivable.amount ? 'PAID' : 'PARTIAL';

    const ops: any[] = [
      prisma.receivablePayment.create({
        data: { receivableId: data.receivableId, accountId: data.accountId || null, amount: data.amount, date: data.date, notes: data.notes || null },
      }),
      prisma.receivable.update({ where: { id: data.receivableId }, data: { status } }),
    ];

    if (data.accountId) {
      const { baseAmount, exchangeRate } = await resolveBaseAmount(householdId, data.amount, receivable.currency, baseCurrency, data.date);
      ops.push(
        prisma.transaction.create({
          data: {
            householdId,
            type: 'RECEIVABLE_PAYMENT',
            date: data.date,
            amount: data.amount,
            currency: receivable.currency,
            baseAmount,
            baseCurrency,
            exchangeRate,
            accountId: data.accountId,
            payee: receivable.person,
            description: `Receivable payment from ${receivable.person}`,
            receivableId: receivable.id,
            notes: data.notes || null,
          },
        }),
      );
    }

    await prisma.$transaction(ops);

    revalidatePath('/receivables');
    revalidatePath('/dashboard');
    revalidatePath('/transactions');
    return { id: data.receivableId };
  });
}
