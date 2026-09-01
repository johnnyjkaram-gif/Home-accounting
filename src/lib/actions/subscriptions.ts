'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { subscriptionSchema } from '@/lib/validations';
import { requireHousehold, safeAction, type ActionResult } from '@/lib/server/action-utils';
import { resolveBaseAmount } from '@/lib/server/currency-helper';
import { addPeriod } from '@/lib/recurrence';

export async function createSubscription(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return safeAction(async () => {
    const { householdId } = await requireHousehold();
    const data = subscriptionSchema.parse(raw);
    const sub = await prisma.subscription.create({
      data: {
        householdId,
        name: data.name,
        amount: data.amount,
        currency: data.currency,
        billingCycle: data.billingCycle,
        nextPaymentDate: data.nextPaymentDate,
        categoryId: data.categoryId || null,
        accountId: data.accountId || null,
        active: data.active,
        notes: data.notes || null,
      },
    });
    revalidatePath('/subscriptions');
    revalidatePath('/calendar');
    revalidatePath('/dashboard');
    return { id: sub.id };
  });
}

export async function updateSubscription(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return safeAction(async () => {
    const { householdId } = await requireHousehold();
    const data = subscriptionSchema.parse(raw);
    if (!data.id) throw new Error('Missing subscription id');
    const existing = await prisma.subscription.findFirst({ where: { id: data.id, householdId } });
    if (!existing) throw new Error('Subscription not found');
    await prisma.subscription.update({
      where: { id: data.id },
      data: {
        name: data.name,
        amount: data.amount,
        currency: data.currency,
        billingCycle: data.billingCycle,
        nextPaymentDate: data.nextPaymentDate,
        categoryId: data.categoryId || null,
        accountId: data.accountId || null,
        active: data.active,
        notes: data.notes || null,
      },
    });
    revalidatePath('/subscriptions');
    revalidatePath('/calendar');
    return { id: data.id };
  });
}

export async function toggleSubscriptionActive(id: string, active: boolean): Promise<ActionResult<{ id: string }>> {
  return safeAction(async () => {
    const { householdId } = await requireHousehold();
    const existing = await prisma.subscription.findFirst({ where: { id, householdId } });
    if (!existing) throw new Error('Subscription not found');
    await prisma.subscription.update({ where: { id }, data: { active } });
    revalidatePath('/subscriptions');
    revalidatePath('/dashboard');
    return { id };
  });
}

export async function deleteSubscription(id: string): Promise<ActionResult<{ id: string }>> {
  return safeAction(async () => {
    const { householdId } = await requireHousehold();
    const existing = await prisma.subscription.findFirst({ where: { id, householdId } });
    if (!existing) throw new Error('Subscription not found');
    await prisma.subscription.delete({ where: { id } });
    revalidatePath('/subscriptions');
    return { id };
  });
}

/** Records a subscription payment as an expense and advances the next payment date. */
export async function paySubscription(id: string, accountId: string, paidDate: Date): Promise<ActionResult<{ id: string }>> {
  return safeAction(async () => {
    const { householdId, baseCurrency } = await requireHousehold();
    const sub = await prisma.subscription.findFirst({ where: { id, householdId } });
    if (!sub) throw new Error('Subscription not found');
    const account = await prisma.account.findFirst({ where: { id: accountId, householdId } });
    if (!account) throw new Error('Account not found');

    const { baseAmount, exchangeRate } = await resolveBaseAmount(householdId, sub.amount, sub.currency, baseCurrency, paidDate);

    await prisma.$transaction([
      prisma.transaction.create({
        data: {
          householdId,
          type: 'EXPENSE',
          date: paidDate,
          amount: sub.amount,
          currency: sub.currency,
          baseAmount,
          baseCurrency,
          exchangeRate,
          accountId,
          categoryId: sub.categoryId,
          payee: sub.name,
          description: `Subscription: ${sub.name}`,
          subscriptionId: sub.id,
        },
      }),
      prisma.subscription.update({
        where: { id },
        data: { nextPaymentDate: addPeriod(sub.nextPaymentDate, sub.billingCycle as any, 1) },
      }),
    ]);

    revalidatePath('/subscriptions');
    revalidatePath('/dashboard');
    revalidatePath('/transactions');
    return { id };
  });
}
