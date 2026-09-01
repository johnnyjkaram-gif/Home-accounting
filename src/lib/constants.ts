export const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Salary', color: '#22c55e', icon: 'Wallet' },
  { name: 'Business', color: '#16a34a', icon: 'Briefcase' },
  { name: 'Freelance', color: '#0ea5e9', icon: 'Laptop' },
  { name: 'Investments', color: '#8b5cf6', icon: 'TrendingUp' },
  { name: 'Interest', color: '#06b6d4', icon: 'Percent' },
  { name: 'Rental Income', color: '#f59e0b', icon: 'Home' },
  { name: 'Sales', color: '#ec4899', icon: 'Tag' },
  { name: 'Other', color: '#64748b', icon: 'MoreHorizontal' },
];

export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Food', color: '#f97316', icon: 'UtensilsCrossed' },
  { name: 'Rent', color: '#ef4444', icon: 'Home' },
  { name: 'Electricity', color: '#eab308', icon: 'Zap' },
  { name: 'Water', color: '#3b82f6', icon: 'Droplet' },
  { name: 'Internet', color: '#6366f1', icon: 'Wifi' },
  { name: 'Telephone', color: '#8b5cf6', icon: 'Phone' },
  { name: 'Transportation', color: '#14b8a6', icon: 'Car' },
  { name: 'Education', color: '#0ea5e9', icon: 'GraduationCap' },
  { name: 'Healthcare', color: '#f43f5e', icon: 'HeartPulse' },
  { name: 'Shopping', color: '#d946ef', icon: 'ShoppingBag' },
  { name: 'Entertainment', color: '#a855f7', icon: 'Film' },
  { name: 'Restaurants', color: '#fb923c', icon: 'UtensilsCrossed' },
  { name: 'Household', color: '#84cc16', icon: 'Sofa' },
  { name: 'Children', color: '#22d3ee', icon: 'Baby' },
  { name: 'Insurance', color: '#64748b', icon: 'Shield' },
  { name: 'Taxes', color: '#78716c', icon: 'Landmark' },
  { name: 'Subscriptions', color: '#e11d48', icon: 'Repeat' },
  { name: 'Other', color: '#94a3b8', icon: 'MoreHorizontal' },
];

export const DEFAULT_PAYMENT_METHODS = [
  'Cash',
  'Bank Transfer',
  'Credit Card',
  'Debit Card',
  'Online Payment',
  'Digital Wallet',
  'Other',
];

export const DEFAULT_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'LBP', name: 'Lebanese Pound', symbol: 'ل.ل' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
];

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  BANK: 'Bank Account',
  CASH: 'Cash Wallet',
  SAVINGS: 'Savings Account',
  CREDIT_CARD: 'Credit Card',
  DIGITAL_WALLET: 'Digital Wallet',
  OTHER: 'Other',
};

export const FREQUENCY_LABELS: Record<string, string> = {
  ONE_TIME: 'One-time',
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  YEARLY: 'Yearly',
};

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const CHART_COLORS = [
  '#6366f1', '#22c55e', '#f97316', '#ef4444', '#0ea5e9', '#8b5cf6',
  '#eab308', '#ec4899', '#14b8a6', '#f43f5e', '#84cc16', '#a855f7',
  '#3b82f6', '#e11d48', '#78716c', '#22d3ee', '#d946ef', '#94a3b8',
];
