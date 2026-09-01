import {
  LayoutDashboard, TrendingUp, TrendingDown, ArrowLeftRight, Wallet, Receipt,
  Repeat, PiggyBank, Target, HandCoins, Users, FileBarChart, CalendarDays,
  Sparkles, Settings,
} from 'lucide-react';

export const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/income', label: 'Income', icon: TrendingUp },
  { href: '/expenses', label: 'Expenses', icon: TrendingDown },
  { href: '/transactions', label: 'Transactions', icon: Receipt },
  { href: '/accounts', label: 'Accounts', icon: Wallet },
  { href: '/bills', label: 'Bills', icon: Repeat },
  { href: '/subscriptions', label: 'Subscriptions', icon: Repeat },
  { href: '/budgets', label: 'Budgets', icon: PiggyBank },
  { href: '/savings-goals', label: 'Savings Goals', icon: Target },
  { href: '/debts', label: 'Debts', icon: HandCoins },
  { href: '/receivables', label: 'Receivables', icon: Users },
  { href: '/reports', label: 'Reports', icon: FileBarChart },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/insights', label: 'Financial Insights', icon: Sparkles },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const;

// Subset shown in the mobile bottom tab bar (rest reachable via "More").
export const MOBILE_PRIMARY_NAV = [
  NAV_ITEMS[0], // Dashboard
  NAV_ITEMS[3], // Transactions
  NAV_ITEMS[4], // Accounts
  NAV_ITEMS[11], // Reports
];
