'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { Settings, LogOut } from 'lucide-react';
import { initials } from '@/lib/utils';

export function UserMenu({ name, email }: { name: string; email: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="h-9 w-9 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center">
        {initials(name || email)}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-56 card p-1.5 z-50 animate-fade-in">
            <div className="px-3 py-2">
              <p className="text-sm font-medium truncate">{name}</p>
              <p className="text-xs text-muted-foreground truncate">{email}</p>
            </div>
            <div className="h-px bg-border my-1" />
            <Link href="/settings" onClick={() => setOpen(false)} className="flex items-center gap-2.5 w-full rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted">
              <Settings className="h-4 w-4" /> Settings
            </Link>
            <button onClick={() => signOut({ callbackUrl: '/login' })} className="flex items-center gap-2.5 w-full rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted text-left text-danger">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
