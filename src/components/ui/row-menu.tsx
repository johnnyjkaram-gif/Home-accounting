'use client';

import { useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

export function RowMenu({ items }: { items: { label: string; onClick: () => void; danger?: boolean }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button className="btn-ghost btn-sm !px-1.5" onClick={() => setOpen((o) => !o)} aria-label="More actions">
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-40 card p-1.5 z-50 animate-fade-in">
            {items.map((item, i) => (
              <button
                key={i}
                onClick={() => { setOpen(false); item.onClick(); }}
                className={cn('flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted text-left', item.danger && 'text-danger')}
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
