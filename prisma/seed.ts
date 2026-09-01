/**
 * Demo data seed.
 *
 * Run with: npm run db:seed
 * Everything created here is flagged isDemo: true wherever the schema
 * supports it, so it can be wiped later from Settings → Data → "Remove demo
 * data" without touching anything the user has entered themselves.
 *
 * Uses relative imports (not the "@/..." alias) because this script runs
 * directly via tsx, outside of Next.js's module resolution.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { addPeriod, nextRunAfter } from '../src/lib/recurrence';
import { findRate, type RateRow } from '../src/lib/currency';
import { DEFAULT_INCOME_CATEGORIES, DEFAULT_EXPENSE_CATEGORIES, DEFAULT_PAYMENT_METHODS } from '../src/lib/constants';

const prisma = new PrismaClient();

const DEMO_EMAIL = 'demo@homeaccounting.app';
const BASE_CURRENCY = 'USD';

async function main() {
  console.log('Seeding demo data...');

  // Idempotent: wipe any previous demo household with this email first.
  const existingUser = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existingUser) {
    await prisma.household.delete({ where: { id: existingUser.householdId } });
    console.log('Removed previous demo household.');
  }

  const passwordHash = await bcrypt.hash('Demo1234', 12);

  const household = await prisma.household.create({
    data: {
      name: 'The Karam Family',
      baseCurrency: BASE_CURRENCY,
      users: { create: { name: 'Johnny Karam', email: DEMO_EMAIL, passwordHash, role: 'ADMIN' } },
      paymentMethods: { create: DEFAULT_PAYMENT_METHODS.map((name, i) => ({ name, isDefault: i === 0 })) },
    },
  });
  const householdId = household.id;

  // --- Categories ---
  const incomeCats = await Promise.all(
    DEFAULT_INCOME_CATEGORIES.map((c) => prisma.category.create({ data: { householdId, name: c.name, kind: 'INCOME', color: c.color, icon: c.icon, isDefault: true } })),
  );
  const expenseCats = await Promise.all(
    DEFAULT_EXPENSE_CATEGORIES.map((c) => prisma.category.create({ data: { householdId, name: c.name, kind: 'EXPENSE', color: c.color, icon: c.icon, isDefault: true } })),
  );
  const cat = (name: string) => [...incomeCats, ...expenseCats].find((c) => c.name === name)!;
  const pm = await prisma.paymentMethod.findMany({ where: { householdId } });
  const pmByName = (name: string) => pm.find((p) => p.name === name)?.id;

  // --- Accounts ---
  const bank = await prisma.account.create({ data: { householdId, name: 'Main Bank Account', type: 'BANK', currency: 'USD', openingBalance: 2500, color: '#6366f1', isDemo: true } });
  const cash = await prisma.account.create({ data: { householdId, name: 'Cash Wallet', type: 'CASH', currency: 'USD', openingBalance: 300, color: '#22c55e', isDemo: true } });
  const savings = await prisma.account.create({ data: { householdId, name: 'Savings Account', type: 'SAVINGS', currency: 'USD', openingBalance: 5000, color: '#0ea5e9', isDemo: true } });
  const creditCard = await prisma.account.create({ data: { householdId, name: 'Visa Credit Card', type: 'CREDIT_CARD', currency: 'USD', openingBalance: -400, color: '#ef4444', isDemo: true } });
  const cashLbp = await prisma.account.create({ data: { householdId, name: 'Cash (LBP)', type: 'CASH', currency: 'LBP', openingBalance: 3_000_000, color: '#f59e0b', isDemo: true } });

  // --- Exchange rates (historical, last 7 months) ---
  const now = new Date();
  const rateRows: RateRow[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const rate = 89000 + Math.round(Math.random() * 1000);
    await prisma.exchangeRate.create({ data: { householdId, baseCurrency: 'USD', targetCurrency: 'LBP', rate, date, source: 'MANUAL' } });
    rateRows.push({ baseCurrency: 'USD', targetCurrency: 'LBP', rate, date });
  }
  await prisma.exchangeRate.create({ data: { householdId, baseCurrency: 'USD', targetCurrency: 'EUR', rate: 0.92, date: new Date(now.getFullYear(), now.getMonth(), 1), source: 'MANUAL' } });
  rateRows.push({ baseCurrency: 'USD', targetCurrency: 'EUR', rate: 0.92, date: new Date(now.getFullYear(), now.getMonth(), 1) });

  function toBase(amount: number, currency: string, date: Date): { baseAmount: number; exchangeRate: number } {
    if (currency === BASE_CURRENCY) return { baseAmount: amount, exchangeRate: 1 };
    const rate = findRate(rateRows, currency, BASE_CURRENCY, date) ?? 1;
    return { baseAmount: Math.round(amount * rate * 100) / 100, exchangeRate: rate };
  }

  // --- Recurring salary: monthly, started 6 months ago ---
  const salaryStart = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  const salaryRule = await prisma.recurringRule.create({
    data: { householdId, frequency: 'MONTHLY', interval: 1, startDate: salaryStart, nextRunDate: nextRunAfter(salaryStart, 'MONTHLY', 1, now) },
  });
  let salaryDate = new Date(salaryStart);
  while (salaryDate <= now) {
    await prisma.transaction.create({
      data: {
        householdId, type: 'INCOME', date: salaryDate, amount: 3000, currency: 'USD', baseAmount: 3000, baseCurrency: 'USD', exchangeRate: 1,
        accountId: bank.id, categoryId: cat('Salary').id, payee: 'Employer Inc.', description: 'Monthly salary', isRecurring: true, recurringRuleId: salaryRule.id, isDemo: true,
      },
    });
    salaryDate = addPeriod(salaryDate, 'MONTHLY', 1);
  }

  // --- Recurring rent (expense), monthly ---
  const rentStart = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  const rentRule = await prisma.recurringRule.create({
    data: { householdId, frequency: 'MONTHLY', interval: 1, startDate: rentStart, nextRunDate: nextRunAfter(rentStart, 'MONTHLY', 1, now) },
  });
  let rentDate = new Date(rentStart);
  while (rentDate <= now) {
    await prisma.transaction.create({
      data: {
        householdId, type: 'EXPENSE', date: rentDate, amount: 500, currency: 'USD', baseAmount: 500, baseCurrency: 'USD', exchangeRate: 1,
        accountId: bank.id, categoryId: cat('Rent').id, payee: 'Landlord', description: 'Monthly rent', isRecurring: true, recurringRuleId: rentRule.id, isDemo: true,
      },
    });
    rentDate = addPeriod(rentDate, 'MONTHLY', 1);
  }

  // --- Assorted freelance / other income ---
  const freelanceDates = [20, 55, 95].map((daysAgo) => new Date(now.getTime() - daysAgo * 86400000));
  for (const d of freelanceDates) {
    await prisma.transaction.create({ data: { householdId, type: 'INCOME', date: d, amount: 450, currency: 'USD', baseAmount: 450, baseCurrency: 'USD', exchangeRate: 1, accountId: bank.id, categoryId: cat('Freelance').id, payee: 'Design client', description: 'Freelance project payment', isDemo: true } });
  }

  // --- Assorted expenses across categories, accounts, and currencies over the last 4 months ---
  const expenseTemplates: { category: string; payee: string; description: string; amountUsd: number; account: any; currency?: 'USD' | 'LBP' }[] = [
    { category: 'Food', payee: 'Fresh Market', description: 'Weekly groceries', amountUsd: 85, account: cash },
    { category: 'Food', payee: 'Corner Grocery', description: 'Groceries', amountUsd: 40, account: cashLbp, currency: 'LBP' },
    { category: 'Restaurants', payee: 'Family dinner', description: 'Family dinner', amountUsd: 50, account: cash },
    { category: 'Electricity', payee: 'Power Co.', description: 'Electricity bill', amountUsd: 60, account: bank },
    { category: 'Water', payee: 'City Water', description: 'Water bill', amountUsd: 20, account: bank },
    { category: 'Internet', payee: 'FiberNet ISP', description: 'Home internet', amountUsd: 40, account: creditCard },
    { category: 'Telephone', payee: 'Mobile Carrier', description: 'Phone plan', amountUsd: 25, account: creditCard },
    { category: 'Transportation', payee: 'Gas Station', description: 'Fuel', amountUsd: 45, account: cash },
    { category: 'Transportation', payee: 'Rideshare', description: 'Rideshare to airport', amountUsd: 30, account: creditCard },
    { category: 'Healthcare', payee: 'City Pharmacy', description: 'Prescription', amountUsd: 35, account: cash },
    { category: 'Shopping', payee: 'Department Store', description: 'New shoes', amountUsd: 70, account: creditCard },
    { category: 'Entertainment', payee: 'Cinema', description: 'Movie night', amountUsd: 28, account: cash },
    { category: 'Household', payee: 'Home Depot', description: 'Light bulbs & supplies', amountUsd: 32, account: cash },
    { category: 'Children', payee: 'School Store', description: 'School supplies', amountUsd: 55, account: bank },
    { category: 'Insurance', payee: 'SafeGuard Insurance', description: 'Car insurance premium', amountUsd: 90, account: bank },
  ];

  for (let monthOffset = 0; monthOffset < 4; monthOffset++) {
    for (const t of expenseTemplates) {
      // Skip some randomly so months aren't identical.
      if (Math.random() < 0.15) continue;
      const day = 3 + Math.floor(Math.random() * 24);
      const date = new Date(now.getFullYear(), now.getMonth() - monthOffset, day);
      if (date > now) continue;
      const currency = t.currency ?? 'USD';
      const amount = currency === 'LBP' ? Math.round(t.amountUsd * 89500) : Math.round(t.amountUsd * (0.85 + Math.random() * 0.3) * 100) / 100;
      const { baseAmount, exchangeRate } = toBase(amount, currency, date);
      await prisma.transaction.create({
        data: {
          householdId, type: 'EXPENSE', date, amount, currency, baseAmount, baseCurrency: BASE_CURRENCY, exchangeRate,
          accountId: t.account.id, categoryId: cat(t.category).id, payee: t.payee, description: t.description,
          paymentMethodId: pmByName(t.account.id === cash.id || t.account.id === cashLbp.id ? 'Cash' : 'Credit Card'),
          isDemo: true,
        },
      });
    }
  }

  // A "more this month" food bump so the insights engine has something to say.
  for (let i = 0; i < 3; i++) {
    const date = new Date(now.getFullYear(), now.getMonth(), 2 + i * 3);
    if (date > now) continue;
    await prisma.transaction.create({ data: { householdId, type: 'EXPENSE', date, amount: 65, currency: 'USD', baseAmount: 65, baseCurrency: 'USD', exchangeRate: 1, accountId: cash.id, categoryId: cat('Food').id, payee: 'Fresh Market', description: 'Extra grocery run', isDemo: true } });
  }

  // --- A transfer between accounts (must never appear as income/expense) ---
  await prisma.transaction.create({
    data: { householdId, type: 'TRANSFER', date: new Date(now.getTime() - 10 * 86400000), amount: 500, currency: 'USD', baseAmount: 500, baseCurrency: 'USD', exchangeRate: 1, accountId: bank.id, toAccountId: cash.id, description: 'Cash withdrawal', isDemo: true },
  });

  // --- Bills ---
  const inDays = (n: number) => new Date(now.getTime() + n * 86400000);
  await prisma.bill.create({ data: { householdId, name: 'Rent', amount: 500, currency: 'USD', dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 1), frequency: 'MONTHLY', categoryId: cat('Rent').id, accountId: bank.id, isDemo: true } });
  await prisma.bill.create({ data: { householdId, name: 'Electricity', amount: 60, currency: 'USD', dueDate: inDays(4), frequency: 'MONTHLY', categoryId: cat('Electricity').id, accountId: bank.id, isDemo: true } });
  await prisma.bill.create({ data: { householdId, name: 'Internet', amount: 40, currency: 'USD', dueDate: inDays(-2), frequency: 'MONTHLY', categoryId: cat('Internet').id, accountId: creditCard.id, isDemo: true } });
  await prisma.bill.create({ data: { householdId, name: 'Water', amount: 20, currency: 'USD', dueDate: inDays(0), frequency: 'MONTHLY', categoryId: cat('Water').id, accountId: bank.id, isDemo: true } });
  await prisma.bill.create({ data: { householdId, name: 'Car Insurance', amount: 480, currency: 'USD', dueDate: inDays(45), frequency: 'YEARLY', categoryId: cat('Insurance').id, accountId: bank.id, isDemo: true } });

  // --- Subscriptions ---
  await prisma.subscription.create({ data: { householdId, name: 'Netflix', amount: 15, currency: 'USD', billingCycle: 'MONTHLY', nextPaymentDate: inDays(6), categoryId: cat('Subscriptions').id, accountId: creditCard.id, active: true, isDemo: true } });
  await prisma.subscription.create({ data: { householdId, name: 'Spotify', amount: 10.99, currency: 'USD', billingCycle: 'MONTHLY', nextPaymentDate: inDays(12), categoryId: cat('Subscriptions').id, accountId: creditCard.id, active: true, isDemo: true } });
  await prisma.subscription.create({ data: { householdId, name: 'Cloud Storage 2TB', amount: 9.99, currency: 'USD', billingCycle: 'MONTHLY', nextPaymentDate: inDays(20), categoryId: cat('Subscriptions').id, accountId: creditCard.id, active: true, isDemo: true } });
  await prisma.subscription.create({ data: { householdId, name: 'AI Assistant Pro', amount: 20, currency: 'USD', billingCycle: 'MONTHLY', nextPaymentDate: inDays(15), categoryId: cat('Subscriptions').id, accountId: creditCard.id, active: true, isDemo: true } });
  await prisma.subscription.create({ data: { householdId, name: 'Old Gym App', amount: 12, currency: 'USD', billingCycle: 'MONTHLY', nextPaymentDate: inDays(9999), categoryId: cat('Subscriptions').id, accountId: creditCard.id, active: false, isDemo: true } });

  // --- Budgets (current month) ---
  const y = now.getFullYear(), m = now.getMonth() + 1;
  await prisma.budget.create({ data: { householdId, categoryId: cat('Food').id, amount: 500, currency: 'USD', period: 'MONTHLY', month: m, year: y } });
  await prisma.budget.create({ data: { householdId, categoryId: cat('Transportation').id, amount: 200, currency: 'USD', period: 'MONTHLY', month: m, year: y } });
  await prisma.budget.create({ data: { householdId, categoryId: cat('Rent').id, amount: 500, currency: 'USD', period: 'MONTHLY', month: m, year: y } });
  await prisma.budget.create({ data: { householdId, categoryId: cat('Entertainment').id, amount: 60, currency: 'USD', period: 'MONTHLY', month: m, year: y } });
  await prisma.budget.create({ data: { householdId, categoryId: cat('Shopping').id, amount: 100, currency: 'USD', period: 'MONTHLY', month: m, year: y } });

  // --- Savings goals ---
  const carGoal = await prisma.savingsGoal.create({ data: { householdId, name: 'New Car', targetAmount: 10000, currency: 'USD', currentAmount: 3500, deadline: new Date(now.getFullYear() + 1, now.getMonth(), 1), monthlyTarget: 300, accountId: savings.id, isDemo: true } });
  await prisma.savingsContribution.create({ data: { savingsGoalId: carGoal.id, accountId: savings.id, amount: 3500, date: salaryStart, notes: 'Starting balance' } });
  const emergencyGoal = await prisma.savingsGoal.create({ data: { householdId, name: 'Emergency Fund', targetAmount: 6000, currency: 'USD', currentAmount: 2200, monthlyTarget: 200, accountId: savings.id, isDemo: true } });
  await prisma.savingsContribution.create({ data: { savingsGoalId: emergencyGoal.id, accountId: savings.id, amount: 2200, date: salaryStart, notes: 'Starting balance' } });

  // --- Debts ---
  const carLoan = await prisma.debt.create({ data: { householdId, creditor: 'ABC Bank — Car Loan', originalAmount: 8000, remainingAmount: 5200, currency: 'USD', dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 5), interestRate: 4.5, monthlyPayment: 250, isDemo: true } });
  await prisma.debtPayment.create({ data: { debtId: carLoan.id, accountId: bank.id, amount: 250, date: new Date(now.getFullYear(), now.getMonth() - 1, 5) } });
  await prisma.debtPayment.create({ data: { debtId: carLoan.id, accountId: bank.id, amount: 250, date: new Date(now.getFullYear(), now.getMonth() - 2, 5) } });
  const ccDebt = await prisma.debt.create({ data: { householdId, creditor: 'Visa Credit Card Balance', originalAmount: 1200, remainingAmount: 400, currency: 'USD', interestRate: 19.9, monthlyPayment: 100, isDemo: true } });
  await prisma.debtPayment.create({ data: { debtId: ccDebt.id, accountId: bank.id, amount: 400, date: new Date(now.getFullYear(), now.getMonth() - 1, 15) } });

  // --- Receivables ---
  const r1 = await prisma.receivable.create({ data: { householdId, person: 'John (friend)', amount: 300, currency: 'USD', date: new Date(now.getTime() - 14 * 86400000), dueDate: inDays(10), description: 'Dinner + concert tickets', status: 'UNPAID', isDemo: true } });
  const r2 = await prisma.receivable.create({ data: { householdId, person: 'Client XYZ Ltd.', amount: 750, currency: 'USD', date: new Date(now.getTime() - 30 * 86400000), dueDate: inDays(-5), description: 'Website project invoice', status: 'PARTIAL', isDemo: true } });
  await prisma.receivablePayment.create({ data: { receivableId: r2.id, accountId: bank.id, amount: 250, date: new Date(now.getTime() - 10 * 86400000) } });

  console.log('\nDemo data seeded successfully.');
  console.log(`Sign in with: ${DEMO_EMAIL} / Demo1234\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
