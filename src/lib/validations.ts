import { z } from 'zod';

export const registerSchema = z.object({
  householdName: z.string().min(2, 'Household name is required').max(100),
  name: z.string().min(2, 'Name is required').max(100),
  email: z.string().email('Enter a valid email address').max(255),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(200)
    .regex(/[A-Za-z]/, 'Password must include a letter')
    .regex(/[0-9]/, 'Password must include a number'),
  baseCurrency: z.string().min(3).max(10).default('USD'),
});

export const accountSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Name is required').max(100),
  type: z.enum(['BANK', 'CASH', 'SAVINGS', 'CREDIT_CARD', 'DIGITAL_WALLET', 'OTHER']),
  currency: z.string().min(3).max(10),
  openingBalance: z.coerce.number().finite(),
  color: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
});

const recurringInput = z.object({
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
  interval: z.coerce.number().int().min(1).max(100).default(1),
  endDate: z.coerce.date().optional().nullable(),
});

export const transactionSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['INCOME', 'EXPENSE']),
  date: z.coerce.date(),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  currency: z.string().min(3).max(10),
  accountId: z.string().min(1, 'Account is required'),
  categoryId: z.string().min(1, 'Category is required'),
  subcategory: z.string().optional().nullable(),
  payee: z.string().max(200).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  paymentMethodId: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  isRecurring: z.boolean().default(false),
  recurring: recurringInput.optional().nullable(),
});

export const transferSchema = z
  .object({
    date: z.coerce.date(),
    amount: z.coerce.number().positive('Amount must be greater than zero'),
    fromAccountId: z.string().min(1, 'Source account is required'),
    toAccountId: z.string().min(1, 'Destination account is required'),
    description: z.string().max(500).optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
  })
  .refine((data) => data.fromAccountId !== data.toAccountId, {
    message: 'Source and destination accounts cannot be the same',
    path: ['toAccountId'],
  });

export const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(100),
  kind: z.enum(['INCOME', 'EXPENSE']),
  color: z.string().default('#6366f1'),
  icon: z.string().default('Wallet'),
  parentId: z.string().optional().nullable(),
});

export const billSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(150),
  amount: z.coerce.number().positive(),
  currency: z.string().min(3).max(10),
  dueDate: z.coerce.date(),
  frequency: z.enum(['ONE_TIME', 'WEEKLY', 'MONTHLY', 'YEARLY']),
  categoryId: z.string().optional().nullable(),
  accountId: z.string().optional().nullable(),
  autoReminder: z.boolean().default(true),
  notes: z.string().max(2000).optional().nullable(),
});

export const subscriptionSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(150),
  amount: z.coerce.number().positive(),
  currency: z.string().min(3).max(10),
  billingCycle: z.enum(['WEEKLY', 'MONTHLY', 'YEARLY']),
  nextPaymentDate: z.coerce.date(),
  categoryId: z.string().optional().nullable(),
  accountId: z.string().optional().nullable(),
  active: z.boolean().default(true),
  notes: z.string().max(2000).optional().nullable(),
});

export const budgetSchema = z.object({
  id: z.string().optional(),
  categoryId: z.string().min(1),
  amount: z.coerce.number().positive(),
  currency: z.string().min(3).max(10),
  period: z.enum(['MONTHLY', 'YEARLY']),
  month: z.coerce.number().int().min(1).max(12).optional().nullable(),
  year: z.coerce.number().int().min(2000).max(2100),
});

export const savingsGoalSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(150),
  targetAmount: z.coerce.number().positive(),
  currency: z.string().min(3).max(10),
  currentAmount: z.coerce.number().min(0).default(0),
  deadline: z.coerce.date().optional().nullable(),
  monthlyTarget: z.coerce.number().min(0).optional().nullable(),
  accountId: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const goalContributionSchema = z.object({
  goalId: z.string().min(1),
  amount: z.coerce.number().positive(),
  date: z.coerce.date(),
  accountId: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const debtSchema = z.object({
  id: z.string().optional(),
  creditor: z.string().min(1).max(150),
  originalAmount: z.coerce.number().positive(),
  remainingAmount: z.coerce.number().min(0),
  currency: z.string().min(3).max(10),
  dueDate: z.coerce.date().optional().nullable(),
  interestRate: z.coerce.number().min(0).max(100).default(0),
  monthlyPayment: z.coerce.number().min(0).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const debtPaymentSchema = z.object({
  debtId: z.string().min(1),
  amount: z.coerce.number().positive(),
  date: z.coerce.date(),
  accountId: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const receivableSchema = z.object({
  id: z.string().optional(),
  person: z.string().min(1).max(150),
  amount: z.coerce.number().positive(),
  currency: z.string().min(3).max(10),
  date: z.coerce.date(),
  dueDate: z.coerce.date().optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const receivablePaymentSchema = z.object({
  receivableId: z.string().min(1),
  amount: z.coerce.number().positive(),
  date: z.coerce.date(),
  accountId: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const exchangeRateSchema = z.object({
  baseCurrency: z.string().min(3).max(10),
  targetCurrency: z.string().min(3).max(10),
  rate: z.coerce.number().positive(),
  date: z.coerce.date(),
});

export const currencySchema = z.object({
  code: z.string().min(2).max(10),
  name: z.string().min(1).max(100),
  symbol: z.string().min(1).max(10),
});

export const paymentMethodSchema = z.object({
  name: z.string().min(1).max(100),
});

export const settingsGeneralSchema = z.object({
  name: z.string().min(2).max(100),
  baseCurrency: z.string().min(3).max(10),
  dateFormat: z.string().min(1).max(30),
  language: z.string().min(2).max(10),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Za-z]/, 'Password must include a letter')
      .regex(/[0-9]/, 'Password must include a number'),
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: 'New password must be different from the current password',
    path: ['newPassword'],
  });
