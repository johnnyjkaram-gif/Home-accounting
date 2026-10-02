import {
  LayoutDashboard, TrendingUp, TrendingDown, Wallet, HandCoins, Settings,
} from 'lucide-react';

// Trimmed down to just what this household actually uses day-to-day: income,
// expenses, the credit-card accounts, debts, and settings. The other sections
// (Transactions, Bills, Subscriptions, Budgets, Savings Goals, Receivables,
// Reports, Calendar, Financial Insights) still exist and still work at their
// URLs if ever needed again — they're just not cluttering the everyday menu.
export const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/income', label: 'Income', icon: TrendingUp },
  { href: '/expenses', label: 'Expenses', icon: TrendingDown },
  { href: '/accounts', label: 'Accounts', icon: Wallet },
  { href: '/debts', label: 'Debts', icon: HandCoins },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const;

// Subset shown in the mobile bottom tab bar (rest reachable via "More").
export const MOBILE_PRIMARY_NAV = [
  NAV_ITEMS[0], // Dashboard
  NAV_ITEMS[1], // Income
  NAV_ITEMS[2], // Expenses
  NAV_ITEMS[3], // Accounts
];
