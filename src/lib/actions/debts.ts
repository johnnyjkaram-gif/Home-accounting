'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { debtSchema, debtPaymentSchema } from '@/lib/validations';
import { requireHousehold, safeAction, type ActionResult } from '@/lib/server/action-utils';
import { resolveBaseAmount } from '@/lib/server/currency-helper';

export async function createDebt(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return safeAction(async () => {
    const { householdId } = await requireHousehold();
    const data = debtSchema.parse(raw);
    const debt = await prisma.debt.create({
      data: {
        householdId,
        creditor: data.creditor,
        originalAmount: data.originalAmount,
        remainingAmount: data.remainingAmount,
        currency: data.currency,
        dueDate: data.dueDate || null,
        interestRate: data.interestRate,
        monthlyPayment: data.monthlyPayment || null,
        notes: data.notes || null,
      },
    });
    revalidatePath('/debts');
    revalidatePath('/dashboard');
    return { id: debt.id };
  });
}

export async function updateDebt(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return safeAction(async () => {
    const { householdId } = await requireHousehold();
    const data = debtSchema.parse(raw);
    if (!data.id) throw new Error('Missing debt id');
    const existing = await prisma.debt.findFirst({ where: { id: data.id, householdId } });
    if (!existing) throw new Error('Debt not found');
    await prisma.debt.update({
      where: { id: data.id },
      data: {
        creditor: data.creditor,
        originalAmount: data.originalAmount,
        remainingAmount: data.remainingAmount,
        currency: data.currency,
        dueDate: data.dueDate || null,
        interestRate: data.interestRate,
        monthlyPayment: data.monthlyPayment || null,
        notes: data.notes || null,
      },
    });
    revalidatePath('/debts');
    return { id: data.id };
  });
}

export async function deleteDebt(id: string): Promise<ActionResult<{ id: string }>> {
  return safeAction(async () => {
    const { householdId } = await requireHousehold();
    const existing = await prisma.debt.findFirst({ where: { id, householdId } });
    if (!existing) throw new Error('Debt not found');
    await prisma.debt.delete({ where: { id } });
    revalidatePath('/debts');
    revalidatePath('/dashboard');
    return { id };
  });
}

export async function addDebtPayment(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return safeAction(async () => {
    const { householdId, baseCurrency } = await requireHousehold();
    const data = debtPaymentSchema.parse(raw);
    const debt = await prisma.debt.findFirst({ where: { id: data.debtId, householdId } });
    if (!debt) throw new Error('Debt not found');
    if (data.amount > debt.remainingAmount + 0.01) {
      throw new Error(`Payment (${data.amount}) exceeds remaining debt (${debt.remainingAmount}).`);
    }

    const newRemaining = Math.max(0, debt.remainingAmount - data.amount);
    const ops: any[] = [
      prisma.debtPayment.create({
        data: { debtId: data.debtId, accountId: data.accountId || null, amount: data.amount, date: data.date, notes: data.notes || null },
      }),
      prisma.debt.update({ where: { id: data.debtId }, data: { remainingAmount: newRemaining } }),
    ];

    if (data.accountId) {
      const { baseAmount, exchangeRate } = await resolveBaseAmount(householdId, data.amount, debt.currency, baseCurrency, data.date);
      ops.push(
        prisma.transaction.create({
          data: {
            householdId,
            type: 'DEBT_PAYMENT',
            date: data.date,
            amount: data.amount,
            currency: debt.currency,
            baseAmount,
            baseCurrency,
            exchangeRate,
            accountId: data.accountId,
            payee: debt.creditor,
            description: `Debt payment: ${debt.creditor}`,
            debtId: debt.id,
            notes: data.notes || null,
          },
        }),
      );
    }

    await prisma.$transaction(ops);

    revalidatePath('/debts');
    revalidatePath('/dashboard');
    revalidatePath('/transactions');
    return { id: data.debtId };
  });
}
