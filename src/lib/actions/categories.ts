'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { categorySchema, paymentMethodSchema } from '@/lib/validations';
import { requireHousehold, safeAction, type ActionResult } from '@/lib/server/action-utils';

export async function createCategory(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return safeAction(async () => {
    const { householdId } = await requireHousehold();
    const data = categorySchema.parse(raw);
    const category = await prisma.category.create({
      data: {
        householdId,
        name: data.name,
        kind: data.kind,
        color: data.color,
        icon: data.icon,
        parentId: data.parentId || null,
      },
    });
    revalidatePath('/settings');
    return { id: category.id };
  });
}

export async function updateCategory(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return safeAction(async () => {
    const { householdId } = await requireHousehold();
    const data = categorySchema.parse(raw);
    if (!data.id) throw new Error('Missing category id');
    const existing = await prisma.category.findFirst({ where: { id: data.id, householdId } });
    if (!existing) throw new Error('Category not found');
    await prisma.category.update({
      where: { id: data.id },
      data: { name: data.name, color: data.color, icon: data.icon, parentId: data.parentId || null },
    });
    revalidatePath('/settings');
    return { id: data.id };
  });
}

export async function deleteCategory(id: string): Promise<ActionResult<{ id: string }>> {
  return safeAction(async () => {
    const { householdId } = await requireHousehold();
    const existing = await prisma.category.findFirst({ where: { id, householdId } });
    if (!existing) throw new Error('Category not found');

    // Budgets reference a category with onDelete: Cascade (deleting the category deletes the
    // budget), so they're not a blocker. Transactions, Bills, and Subscriptions have no cascade —
    // the database would reject the delete with a raw constraint error, so check each up front
    // and give a clear, specific message instead. This applies to every category, including the
    // starter ones seeded at registration — there's nothing special about those at the data level.
    const [transactionCount, billCount, subscriptionCount] = await Promise.all([
      prisma.transaction.count({ where: { categoryId: id } }),
      prisma.bill.count({ where: { categoryId: id } }),
      prisma.subscription.count({ where: { categoryId: id } }),
    ]);
    const blockers: string[] = [];
    if (transactionCount > 0) blockers.push(`${transactionCount} transaction${transactionCount === 1 ? '' : 's'}`);
    if (billCount > 0) blockers.push(`${billCount} bill${billCount === 1 ? '' : 's'}`);
    if (subscriptionCount > 0) blockers.push(`${subscriptionCount} subscription${subscriptionCount === 1 ? '' : 's'}`);
    if (blockers.length > 0) {
      throw new Error(`This category is used by ${blockers.join(' and ')}. Reassign or delete those first.`);
    }

    await prisma.category.delete({ where: { id } });
    revalidatePath('/settings');
    return { id };
  });
}

export async function createPaymentMethod(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return safeAction(async () => {
    const { householdId } = await requireHousehold();
    const data = paymentMethodSchema.parse(raw);
    const pm = await prisma.paymentMethod.create({ data: { householdId, name: data.name } });
    revalidatePath('/settings');
    return { id: pm.id };
  });
}

export async function deletePaymentMethod(id: string): Promise<ActionResult<{ id: string }>> {
  return safeAction(async () => {
    const { householdId } = await requireHousehold();
    const existing = await prisma.paymentMethod.findFirst({ where: { id, householdId } });
    if (!existing) throw new Error('Payment method not found');
    await prisma.paymentMethod.delete({ where: { id } });
    revalidatePath('/settings');
    return { id };
  });
}
