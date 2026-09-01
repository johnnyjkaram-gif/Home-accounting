'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { transactionSchema, transferSchema } from '@/lib/validations';
import { requireHousehold, safeAction, type ActionResult } from '@/lib/server/action-utils';
import { resolveBaseAmount } from '@/lib/server/currency-helper';
import { nextRunAfter } from '@/lib/recurrence';

export async function createTransaction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return safeAction(async () => {
    const { householdId, baseCurrency } = await requireHousehold();
    const data = transactionSchema.parse(raw);

    const account = await prisma.account.findFirst({ where: { id: data.accountId, householdId } });
    if (!account) throw new Error('Account not found');

    const category = await prisma.category.findFirst({ where: { id: data.categoryId, householdId } });
    if (!category) throw new Error('Category not found');

    const { baseAmount, exchangeRate } = await resolveBaseAmount(householdId, data.amount, data.currency, baseCurrency, data.date);

    let recurringRuleId: string | undefined;
    if (data.isRecurring && data.recurring) {
      const rule = await prisma.recurringRule.create({
        data: {
          householdId,
          frequency: data.recurring.frequency,
          interval: data.recurring.interval,
          startDate: data.date,
          endDate: data.recurring.endDate ?? undefined,
          nextRunDate: nextRunAfter(data.date, data.recurring.frequency, data.recurring.interval, data.date),
        },
      });
      recurringRuleId = rule.id;
    }

    const tx = await prisma.transaction.create({
      data: {
        householdId,
        type: data.type,
        date: data.date,
        amount: data.amount,
        currency: data.currency,
        baseAmount,
        baseCurrency,
        exchangeRate,
        accountId: data.accountId,
        categoryId: data.categoryId,
        subcategory: data.subcategory || null,
        payee: data.payee || null,
        description: data.description || null,
        paymentMethodId: data.paymentMethodId || null,
        notes: data.notes || null,
        isRecurring: data.isRecurring,
        recurringRuleId,
      },
    });

    revalidateAll();
    return { id: tx.id };
  });
}

export async function updateTransaction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return safeAction(async () => {
    const { householdId, baseCurrency } = await requireHousehold();
    const data = transactionSchema.parse(raw);
    if (!data.id) throw new Error('Missing transaction id');

    const existing = await prisma.transaction.findFirst({ where: { id: data.id, householdId } });
    if (!existing) throw new Error('Transaction not found');

    const { baseAmount, exchangeRate } = await resolveBaseAmount(householdId, data.amount, data.currency, baseCurrency, data.date);

    const tx = await prisma.transaction.update({
      where: { id: data.id },
      data: {
        type: data.type,
        date: data.date,
        amount: data.amount,
        currency: data.currency,
        baseAmount,
        baseCurrency,
        exchangeRate,
        accountId: data.accountId,
        categoryId: data.categoryId,
        subcategory: data.subcategory || null,
        payee: data.payee || null,
        description: data.description || null,
        paymentMethodId: data.paymentMethodId || null,
        notes: data.notes || null,
      },
    });

    revalidateAll();
    return { id: tx.id };
  });
}

export async function deleteTransaction(id: string): Promise<ActionResult<{ id: string }>> {
  return safeAction(async () => {
    const { householdId } = await requireHousehold();
    const existing = await prisma.transaction.findFirst({ where: { id, householdId } });
    if (!existing) throw new Error('Transaction not found');
    await prisma.transaction.delete({ where: { id } });
    revalidateAll();
    return { id };
  });
}

export async function createTransfer(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return safeAction(async () => {
    const { householdId, baseCurrency } = await requireHousehold();
    const data = transferSchema.parse(raw);

    const [fromAccount, toAccount] = await Promise.all([
      prisma.account.findFirst({ where: { id: data.fromAccountId, householdId } }),
      prisma.account.findFirst({ where: { id: data.toAccountId, householdId } }),
    ]);
    if (!fromAccount || !toAccount) throw new Error('Both accounts must exist');

    // Transfers are recorded in the source account's currency; if accounts use
    // different currencies the destination still receives the same-currency
    // amount recorded (no FX conversion applied automatically to transfers,
    // matching most household bookkeeping — add a manual adjustment entry if needed).
    const { baseAmount, exchangeRate } = await resolveBaseAmount(householdId, data.amount, fromAccount.currency, baseCurrency, data.date);

    const tx = await prisma.transaction.create({
      data: {
        householdId,
        type: 'TRANSFER',
        date: data.date,
        amount: data.amount,
        currency: fromAccount.currency,
        baseAmount,
        baseCurrency,
        exchangeRate,
        accountId: data.fromAccountId,
        toAccountId: data.toAccountId,
        description: data.description || `Transfer to ${toAccount.name}`,
        notes: data.notes || null,
      },
    });

    revalidateAll();
    return { id: tx.id };
  });
}

function revalidateAll() {
  [
    '/dashboard', '/transactions', '/income', '/expenses', '/accounts',
    '/reports', '/calendar', '/insights', '/budgets',
  ].forEach((p) => revalidatePath(p));
}
