import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { getReferenceData } from '@/lib/server/reference-data';
import { Sidebar } from '@/components/layout/sidebar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Topbar } from '@/components/layout/topbar';
import { AppDataProvider } from '@/components/app-data-context';
import { QuickAddMenu } from '@/components/layout/quick-add-menu';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  if (!session?.user) redirect('/login');

  const data = await getReferenceData(session.user.householdId);

  return (
    <AppDataProvider data={data}>
      <div className="flex min-h-screen bg-background">
        <Sidebar householdName={data.household.name} />
        <div className="flex-1 min-w-0 flex flex-col">
          <Topbar userName={session.user.name ?? ''} userEmail={session.user.email ?? ''} />
          <main className="flex-1 min-w-0 p-4 sm:p-6 pb-24 md:pb-6">{children}</main>
        </div>
        <MobileNav />
        <div className="md:hidden fixed right-4 bottom-20 z-30">
          <QuickAddMenu />
        </div>
      </div>
    </AppDataProvider>
  );
}
