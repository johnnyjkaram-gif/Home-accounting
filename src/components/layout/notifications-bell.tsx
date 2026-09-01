'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LiveNotification { id: string; tone: 'warning' | 'danger' | 'neutral'; title: string; message: string; href: string }

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<LiveNotification[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/notifications').then((r) => r.json()).then((d) => setItems(d.notifications ?? [])).catch(() => {});
  }, []);

  const visible = items.filter((i) => !dismissed.has(i.id));

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="btn-ghost btn-sm !h-10 !w-10 !px-0 relative" aria-label="Notifications">
        <Bell className="h-[18px] w-[18px]" />
        {visible.length > 0 && (
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-danger" />
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 card p-1.5 z-50 max-h-96 overflow-y-auto animate-fade-in">
            <div className="px-3 py-2 flex items-center justify-between">
              <p className="text-sm font-semibold">Notifications</p>
              <span className="text-xs text-muted-foreground">{visible.length}</span>
            </div>
            {visible.length === 0 && <p className="text-sm text-muted-foreground px-3 py-6 text-center">You're all caught up.</p>}
            {visible.map((n) => (
              <div key={n.id} className="rounded-lg px-3 py-2.5 hover:bg-muted group">
                <Link href={n.href} onClick={() => setOpen(false)} className="block">
                  <div className="flex items-center gap-2">
                    <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', n.tone === 'danger' ? 'bg-danger' : n.tone === 'warning' ? 'bg-warning' : 'bg-primary')} />
                    <p className="text-sm font-medium">{n.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 ml-3.5">{n.message}</p>
                </Link>
                <button
                  className="text-xs text-muted-foreground hover:text-foreground ml-3.5 mt-1 opacity-0 group-hover:opacity-100"
                  onClick={() => setDismissed((d) => new Set(d).add(n.id))}
                >
                  Dismiss
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
