-- Home Accounting — one-time database setup
-- Paste this ENTIRE file into Neon's SQL Editor (in your project dashboard) and click Run.
-- It creates every table the app needs. You do not need Node.js, Prisma, or a
-- terminal to run this — it's plain SQL, run once, directly in your browser.
-- After this succeeds, just open your deployed app and use the "Create one"
-- (register) link to make your real account — no separate data-loading step needed.

BEGIN;

CREATE TYPE "Role" AS ENUM ('ADMIN', 'MEMBER', 'VIEWER', 'REPORTS_ONLY');
CREATE TYPE "AccountType" AS ENUM ('BANK', 'CASH', 'SAVINGS', 'CREDIT_CARD', 'DIGITAL_WALLET', 'OTHER');
CREATE TYPE "CategoryKind" AS ENUM ('INCOME', 'EXPENSE');
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER', 'DEBT_PAYMENT', 'RECEIVABLE_PAYMENT');
CREATE TYPE "Frequency" AS ENUM ('ONE_TIME', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');
CREATE TYPE "BudgetPeriod" AS ENUM ('MONTHLY', 'YEARLY');
CREATE TYPE "ReceivableStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID');
CREATE TYPE "RateSource" AS ENUM ('MANUAL', 'API');
CREATE TYPE "NotificationType" AS ENUM ('BILL_REMINDER', 'BUDGET_ALERT', 'SUBSCRIPTION_REMINDER', 'DEBT_REMINDER', 'GOAL_MILESTONE', 'SYSTEM');

CREATE TABLE "Household" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "baseCurrency" TEXT NOT NULL DEFAULT 'USD',
  "dateFormat" TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
  "language" TEXT NOT NULL DEFAULT 'en',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Currency" (
  "code" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "symbol" TEXT NOT NULL
);

CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "householdId" TEXT NOT NULL REFERENCES "Household"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'ADMIN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "User_householdId_idx" ON "User"("householdId");

CREATE TABLE "Account" (
  "id" TEXT PRIMARY KEY,
  "householdId" TEXT NOT NULL REFERENCES "Household"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "type" "AccountType" NOT NULL,
  "currency" TEXT NOT NULL,
  "openingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "color" TEXT,
  "icon" TEXT,
  "archived" BOOLEAN NOT NULL DEFAULT false,
  "isDemo" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "Account_householdId_idx" ON "Account"("householdId");

CREATE TABLE "Category" (
  "id" TEXT PRIMARY KEY,
  "householdId" TEXT NOT NULL REFERENCES "Household"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "kind" "CategoryKind" NOT NULL,
  "color" TEXT NOT NULL DEFAULT '#6366f1',
  "icon" TEXT NOT NULL DEFAULT 'Wallet',
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "parentId" TEXT REFERENCES "Category"("id") ON DELETE SET NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "Category_householdId_name_kind_parentId_key" ON "Category"("householdId", "name", "kind", "parentId");
CREATE INDEX "Category_householdId_idx" ON "Category"("householdId");

CREATE TABLE "PaymentMethod" (
  "id" TEXT PRIMARY KEY,
  "householdId" TEXT NOT NULL REFERENCES "Household"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX "PaymentMethod_householdId_name_key" ON "PaymentMethod"("householdId", "name");

CREATE TABLE "ExchangeRate" (
  "id" TEXT PRIMARY KEY,
  "householdId" TEXT NOT NULL REFERENCES "Household"("id") ON DELETE CASCADE,
  "baseCurrency" TEXT NOT NULL,
  "targetCurrency" TEXT NOT NULL,
  "rate" DOUBLE PRECISION NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "source" "RateSource" NOT NULL DEFAULT 'MANUAL',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "ExchangeRate_householdId_baseCurrency_targetCurrency_date_key" ON "ExchangeRate"("householdId", "baseCurrency", "targetCurrency", "date");
CREATE INDEX "ExchangeRate_householdId_baseCurrency_targetCurrency_date_idx" ON "ExchangeRate"("householdId", "baseCurrency", "targetCurrency", "date");

CREATE TABLE "RecurringRule" (
  "id" TEXT PRIMARY KEY,
  "householdId" TEXT NOT NULL REFERENCES "Household"("id") ON DELETE CASCADE,
  "frequency" "Frequency" NOT NULL,
  "interval" INTEGER NOT NULL DEFAULT 1,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3),
  "nextRunDate" TIMESTAMP(3) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "RecurringRule_householdId_idx" ON "RecurringRule"("householdId");

CREATE TABLE "Bill" (
  "id" TEXT PRIMARY KEY,
  "householdId" TEXT NOT NULL REFERENCES "Household"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "frequency" "Frequency" NOT NULL DEFAULT 'MONTHLY',
  "categoryId" TEXT REFERENCES "Category"("id"),
  "accountId" TEXT REFERENCES "Account"("id"),
  "lastPaidDate" TIMESTAMP(3),
  "autoReminder" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "isDemo" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "Bill_householdId_idx" ON "Bill"("householdId");

CREATE TABLE "Subscription" (
  "id" TEXT PRIMARY KEY,
  "householdId" TEXT NOT NULL REFERENCES "Household"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL,
  "billingCycle" "Frequency" NOT NULL DEFAULT 'MONTHLY',
  "nextPaymentDate" TIMESTAMP(3) NOT NULL,
  "categoryId" TEXT REFERENCES "Category"("id"),
  "accountId" TEXT REFERENCES "Account"("id"),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "isDemo" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "Subscription_householdId_idx" ON "Subscription"("householdId");

CREATE TABLE "SavingsGoal" (
  "id" TEXT PRIMARY KEY,
  "householdId" TEXT NOT NULL REFERENCES "Household"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "targetAmount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL,
  "currentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "deadline" TIMESTAMP(3),
  "monthlyTarget" DOUBLE PRECISION,
  "accountId" TEXT REFERENCES "Account"("id"),
  "notes" TEXT,
  "achieved" BOOLEAN NOT NULL DEFAULT false,
  "isDemo" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "SavingsGoal_householdId_idx" ON "SavingsGoal"("householdId");

CREATE TABLE "Debt" (
  "id" TEXT PRIMARY KEY,
  "householdId" TEXT NOT NULL REFERENCES "Household"("id") ON DELETE CASCADE,
  "creditor" TEXT NOT NULL,
  "originalAmount" DOUBLE PRECISION NOT NULL,
  "remainingAmount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL,
  "dueDate" TIMESTAMP(3),
  "interestRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "monthlyPayment" DOUBLE PRECISION,
  "notes" TEXT,
  "isDemo" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "Debt_householdId_idx" ON "Debt"("householdId");

CREATE TABLE "Receivable" (
  "id" TEXT PRIMARY KEY,
  "householdId" TEXT NOT NULL REFERENCES "Household"("id") ON DELETE CASCADE,
  "person" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "dueDate" TIMESTAMP(3),
  "description" TEXT,
  "status" "ReceivableStatus" NOT NULL DEFAULT 'UNPAID',
  "notes" TEXT,
  "isDemo" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "Receivable_householdId_idx" ON "Receivable"("householdId");

CREATE TABLE "Transaction" (
  "id" TEXT PRIMARY KEY,
  "householdId" TEXT NOT NULL REFERENCES "Household"("id") ON DELETE CASCADE,
  "type" "TransactionType" NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL,
  "baseAmount" DOUBLE PRECISION NOT NULL,
  "baseCurrency" TEXT NOT NULL,
  "exchangeRate" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "accountId" TEXT NOT NULL REFERENCES "Account"("id"),
  "toAccountId" TEXT REFERENCES "Account"("id"),
  "categoryId" TEXT REFERENCES "Category"("id"),
  "subcategory" TEXT,
  "payee" TEXT,
  "description" TEXT,
  "paymentMethodId" TEXT REFERENCES "PaymentMethod"("id"),
  "notes" TEXT,
  "isRecurring" BOOLEAN NOT NULL DEFAULT false,
  "recurringRuleId" TEXT REFERENCES "RecurringRule"("id"),
  "billId" TEXT REFERENCES "Bill"("id"),
  "subscriptionId" TEXT REFERENCES "Subscription"("id"),
  "debtId" TEXT REFERENCES "Debt"("id"),
  "receivableId" TEXT REFERENCES "Receivable"("id"),
  "savingsGoalId" TEXT REFERENCES "SavingsGoal"("id"),
  "isDemo" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "Transaction_householdId_date_idx" ON "Transaction"("householdId", "date");
CREATE INDEX "Transaction_householdId_type_idx" ON "Transaction"("householdId", "type");
CREATE INDEX "Transaction_accountId_idx" ON "Transaction"("accountId");
CREATE INDEX "Transaction_categoryId_idx" ON "Transaction"("categoryId");

CREATE TABLE "SavingsContribution" (
  "id" TEXT PRIMARY KEY,
  "savingsGoalId" TEXT NOT NULL REFERENCES "SavingsGoal"("id") ON DELETE CASCADE,
  "accountId" TEXT REFERENCES "Account"("id"),
  "amount" DOUBLE PRECISION NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "SavingsContribution_savingsGoalId_idx" ON "SavingsContribution"("savingsGoalId");

CREATE TABLE "DebtPayment" (
  "id" TEXT PRIMARY KEY,
  "debtId" TEXT NOT NULL REFERENCES "Debt"("id") ON DELETE CASCADE,
  "accountId" TEXT REFERENCES "Account"("id"),
  "amount" DOUBLE PRECISION NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "DebtPayment_debtId_idx" ON "DebtPayment"("debtId");

CREATE TABLE "ReceivablePayment" (
  "id" TEXT PRIMARY KEY,
  "receivableId" TEXT NOT NULL REFERENCES "Receivable"("id") ON DELETE CASCADE,
  "accountId" TEXT REFERENCES "Account"("id"),
  "amount" DOUBLE PRECISION NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "ReceivablePayment_receivableId_idx" ON "ReceivablePayment"("receivableId");

CREATE TABLE "Attachment" (
  "id" TEXT PRIMARY KEY,
  "transactionId" TEXT REFERENCES "Transaction"("id") ON DELETE CASCADE,
  "billId" TEXT REFERENCES "Bill"("id") ON DELETE CASCADE,
  "debtId" TEXT REFERENCES "Debt"("id") ON DELETE CASCADE,
  "receivableId" TEXT REFERENCES "Receivable"("id") ON DELETE CASCADE,
  "filename" TEXT NOT NULL,
  "storedName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Budget" (
  "id" TEXT PRIMARY KEY,
  "householdId" TEXT NOT NULL REFERENCES "Household"("id") ON DELETE CASCADE,
  "categoryId" TEXT NOT NULL REFERENCES "Category"("id") ON DELETE CASCADE,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL,
  "period" "BudgetPeriod" NOT NULL DEFAULT 'MONTHLY',
  "month" INTEGER,
  "year" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "Budget_householdId_categoryId_period_month_year_key" ON "Budget"("householdId", "categoryId", "period", "month", "year");
CREATE INDEX "Budget_householdId_year_month_idx" ON "Budget"("householdId", "year", "month");

CREATE TABLE "Notification" (
  "id" TEXT PRIMARY KEY,
  "householdId" TEXT NOT NULL REFERENCES "Household"("id") ON DELETE CASCADE,
  "type" "NotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "relatedId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "Notification_householdId_read_idx" ON "Notification"("householdId", "read");

COMMIT;
