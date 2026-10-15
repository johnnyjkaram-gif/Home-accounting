import webpush from 'web-push';
import { prisma } from '@/lib/prisma';

let configured = false;

function ensureConfigured(): boolean {
  if (configured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  const subject = process.env.VAPID_SUBJECT || 'mailto:no-reply@example.com';
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/**
 * Sends a push notification to every OTHER household member's registered
 * device(s) — never back to whoever triggered it, since they already know
 * (they just entered it themselves). Safe to call unconditionally: it's a
 * no-op if VAPID keys aren't configured yet, or nobody else has notifications
 * enabled on any device, and it never throws (a failed push should never
 * break the transaction it's attached to).
 */
export async function notifyOtherHouseholdMembers(
  householdId: string,
  actingUserId: string,
  payload: PushPayload,
): Promise<void> {
  if (!ensureConfigured()) return;

  const subs = await prisma.pushSubscription.findMany({
    where: { userId: { not: actingUserId }, user: { householdId } },
  });
  if (subs.length === 0) return;

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/dashboard',
  });

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
        );
      } catch (err: any) {
        // 404/410 = the browser revoked or expired this subscription — stop trying it.
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
      }
    }),
  );
}
