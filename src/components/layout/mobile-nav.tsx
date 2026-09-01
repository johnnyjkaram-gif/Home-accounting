'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MOBILE_PRIMARY_NAV, NAV_ITEMS } from './nav-items';
import { Modal } from '@/components/ui/modal';

export function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-surface border-t border-border pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5 h-16">
          {MOBILE_PRIMARY_NAV.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={cn('flex flex-col items-center justify-center gap-1 text-[11px]', active ? 'text-primary' : 'text-muted-foreground')}>
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
          <button onClick={() => setMoreOpen(true)} className="flex flex-col items-center justify-center gap-1 text-[11px] text-muted-foreground">
            <Menu className="h-5 w-5" />
            More
          </button>
        </div>
      </nav>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="All sections" size="sm">
        <div className="grid grid-cols-3 gap-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className="flex flex-col items-center gap-1.5 rounded-xl p-3 text-center text-xs font-medium hover:bg-muted"
              >
                <Icon className="h-5 w-5 text-primary" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </Modal>
    </>
  );
}
