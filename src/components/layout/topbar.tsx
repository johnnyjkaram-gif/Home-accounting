import { ThemeToggle } from './theme-toggle';
import { QuickAddMenu } from './quick-add-menu';
import { GlobalSearch } from './global-search';
import { NotificationsBell } from './notifications-bell';
import { UserMenu } from './user-menu';

export function Topbar({ userName, userEmail }: { userName: string; userEmail: string }) {
  return (
    <header className="sticky top-0 z-20 h-16 border-b border-border bg-surface/80 backdrop-blur supports-[backdrop-filter]:bg-surface/60 flex items-center gap-3 px-4 sm:px-6">
      <div className="flex-1 min-w-0 max-w-md">
        <GlobalSearch />
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
        <NotificationsBell />
        <ThemeToggle />
        <QuickAddMenu className="hidden sm:block" />
        <UserMenu name={userName} email={userEmail} />
      </div>
    </header>
  );
}
