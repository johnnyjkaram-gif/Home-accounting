'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { savePushSubscription, deletePushSubscription } from '@/lib/actions/push';

type Status = 'checking' | 'unsupported' | 'no-key' | 'denied' | 'off' | 'on';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function PushNotificationsToggle() {
  const [status, setStatus] = useState<Status>('checking');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        setStatus('unsupported');
        return;
      }
      if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
        setStatus('no-key');
        return;
      }
      if (Notification.permission === 'denied') {
        setStatus('denied');
        return;
      }
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        setStatus(sub ? 'on' : 'off');
      } catch {
        setStatus('off');
      }
    })();
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error('Notification permission was not granted.');
        setStatus('denied');
        return;
      }
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string),
      });
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      const res = await savePushSubscription({ endpoint: json.endpoint, keys: json.keys });
      if (res.ok) {
        toast.success('Notifications enabled on this device');
        setStatus('on');
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error('Could not enable notifications on this device.');
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await deletePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus('off');
      toast.success('Notifications turned off on this device');
    } finally {
      setBusy(false);
    }
  }

  if (status === 'checking') return null;

  if (status === 'unsupported') {
    return (
      <p className="text-sm text-muted-foreground">
        Push notifications aren&apos;t supported in this browser. On iPhone: open this app in Safari, tap Share →
        &quot;Add to Home Screen&quot;, then open it from the Home Screen icon and try again here.
      </p>
    );
  }

  if (status === 'no-key') {
    return <p className="text-sm text-muted-foreground">Push notifications aren&apos;t set up on the server yet.</p>;
  }

  if (status === 'denied') {
    return (
      <p className="text-sm text-danger">
        Notifications are blocked for this site in your browser/phone settings. Allow notifications for this site,
        then reload this page.
      </p>
    );
  }

  return (
    <button className={status === 'on' ? 'btn-outline' : 'btn-primary'} disabled={busy} onClick={status === 'on' ? disable : enable}>
      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
      {status === 'on' ? (
        <>
          <BellOff className="h-4 w-4" /> Turn off on this device
        </>
      ) : (
        <>
          <Bell className="h-4 w-4" /> Enable on this device
        </>
      )}
    </button>
  );
}
