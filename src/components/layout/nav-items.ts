import {
  LayoutDashboard, TrendingUp, TrendingDown, Wallet, HandCoins, FileBarChart, Settings,
} from 'lucide-react';

// Trimmed down to just what this household actually uses day-to-day: income,
// expenses, the credit-card accounts, debts, reports, and settings. The other
// sections (Transactions, Bills, Subscriptions, Budgets, Savings Goals,
// Receivables, Calendar, Financial Insights) still exist and still work at
// their URLs if ever needed again — they're just not cluttering the everyday
// menu. Reports was added back in (previously URL-only) once Daily/Weekly
// report types made it worth a one-tap link.
//
// New items go at the END of this array — MOBILE_PRIMARY_NAV below picks the
// bottom-tab-bar items by index, so inserting in the middle would silently
// swap which items show there.
export const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/income', label: 'Income', icon: TrendingUp },
  { href: '/expenses', label: 'Expenses', icon: TrendingDown },
  { href: '/accounts', label: 'Accounts', icon: Wallet },
  { href: '/debts', label: 'Debts', icon: HandCoins },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/reports', label: 'Reports', icon: FileBarChart },
] as const;

// Subset shown in the mobile bottom tab bar (rest reachable via "More").
export const MOBILE_PRIMARY_NAV = [
  NAV_ITEMS[0], // Dashboard
  NAV_ITEMS[1], // Income
  NAV_ITEMS[2], // Expenses
  NAV_ITEMS[3], // Accounts
];
