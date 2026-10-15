'use server';

import { prisma } from '@/lib/prisma';
import { requireHousehold, safeAction, type ActionResult } from '@/lib/server/action-utils';

interface SubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/** Registers (or re-registers) this device for push notifications. Any
 * household role can do this — it only affects their own device. */
export async function savePushSubscription(sub: SubscriptionInput): Promise<ActionResult<{ id: string }>> {
  return safeAction(async () => {
    const { userId } = await requireHousehold(false);
    if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
      throw new Error('Invalid subscription.');
    }
    const row = await prisma.pushSubscription.upsert({
      where: { endpoint: sub.endpoint },
      create: { userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      update: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    });
    return { id: row.id };
  });
}

/** Removes this device's subscription (turning notifications off on it). */
export async function deletePushSubscription(endpoint: string): Promise<ActionResult<{ ok: true }>> {
  return safeAction(async () => {
    await requireHousehold(false);
    await prisma.pushSubscription.deleteMany({ where: { endpoint } });
    return { ok: true };
  });
}
