'use server';

import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import {
  settingsGeneralSchema,
  currencySchema,
  exchangeRateSchema,
  changePasswordSchema,
} from '@/lib/validations';
import { requireHousehold, safeAction, type ActionResult } from '@/lib/server/action-utils';
import { fetchLatestRates, isLiveRatesConfigured } from '@/lib/exchange-rate-api';

export async function updateGeneralSettings(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return safeAction(async () => {
    const { householdId } = await requireHousehold(false);
    const data = settingsGeneralSchema.parse(raw);
    await prisma.household.update({
      where: { id: householdId },
      data: { name: data.name, baseCurrency: data.baseCurrency, dateFormat: data.dateFormat, language: data.language },
    });
    revalidatePath('/settings');
    revalidatePath('/dashboard');
    return { id: householdId };
  });
}

export async function addCurrency(raw: unknown): Promise<ActionResult<{ code: string }>> {
  return safeAction(async () => {
    await requireHousehold(false);
    const data = currencySchema.parse(raw);
    await prisma.currency.upsert({
      where: { code: data.code.toUpperCase() },
      create: { code: data.code.toUpperCase(), name: data.name, symbol: data.symbol },
      update: { name: data.name, symbol: data.symbol },
    });
    revalidatePath('/settings');
    return { code: data.code.toUpperCase() };
  });
}

export async function upsertExchangeRate(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return safeAction(async () => {
    const { householdId } = await requireHousehold();
    const data = exchangeRateSchema.parse(raw);
    if (data.baseCurrency === data.targetCurrency) throw new Error('Base and target currency must differ');

    const rate = await prisma.exchangeRate.upsert({
      where: {
        householdId_baseCurrency_targetCurrency_date: {
          householdId,
          baseCurrency: data.baseCurrency,
          targetCurrency: data.targetCurrency,
          date: data.date,
        },
      },
      create: { householdId, baseCurrency: data.baseCurrency, targetCurrency: data.targetCurrency, rate: data.rate, date: data.date, source: 'MANUAL' },
      update: { rate: data.rate, source: 'MANUAL' },
    });
    revalidatePath('/settings');
    return { id: rate.id };
  });
}

/**
 * Pulls today's published rates for the household's base currency from the
 * configured exchange-rate API (see src/lib/exchange-rate-api.ts) and stores
 * them as today's rate, source=API, for every currency the household has
 * added. Existing manually-entered historical rates are never touched —
 * this only ever adds/updates the row for today's date.
 */
export async function refreshExchangeRates(): Promise<ActionResult<{ updated: number }>> {
  return safeAction(async () => {
    const { householdId, baseCurrency } = await requireHousehold();
    if (!isLiveRatesConfigured()) {
      throw new Error('Automatic rates are not set up. Add EXCHANGE_RATE_API_KEY to your environment to enable this, or keep entering rates manually below.');
    }
    const liveRates = await fetchLatestRates(baseCurrency);
    if (!liveRates) {
      throw new Error('Could not reach the exchange-rate provider. Please try again shortly, or enter a rate manually.');
    }

    const currencies = await prisma.currency.findMany();
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    let updated = 0;
    for (const currency of currencies) {
      if (currency.code === baseCurrency) continue;
      const rate = liveRates[currency.code];
      if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) continue;
      await prisma.exchangeRate.upsert({
        where: {
          householdId_baseCurrency_targetCurrency_date: {
            householdId,
            baseCurrency,
            targetCurrency: currency.code,
            date: today,
          },
        },
        create: { householdId, baseCurrency, targetCurrency: currency.code, rate, date: today, source: 'API' },
        update: { rate, source: 'API' },
      });
      updated += 1;
    }

    revalidatePath('/settings');
    return { updated };
  });
}

export async function deleteExchangeRate(id: string): Promise<ActionResult<{ id: string }>> {
  return safeAction(async () => {
    const { householdId } = await requireHousehold();
    const existing = await prisma.exchangeRate.findFirst({ where: { id, householdId } });
    if (!existing) throw new Error('Rate not found');
    await prisma.exchangeRate.delete({ where: { id } });
    revalidatePath('/settings');
    return { id };
  });
}

export async function changePassword(raw: unknown): Promise<ActionResult<undefined>> {
  return safeAction(async () => {
    const { userId } = await requireHousehold(false);
    const data = changePasswordSchema.parse(raw);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');
    const valid = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!valid) throw new Error('Current password is incorrect');
    const passwordHash = await bcrypt.hash(data.newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    return undefined;
  });
}

/** Removes only rows flagged isDemo=true, keeping the account's own structure (categories/accounts stay). */
export async function deleteDemoData(): Promise<ActionResult<undefined>> {
  return safeAction(async () => {
    const { householdId } = await requireHousehold();
    await prisma.$transaction([
      prisma.transaction.deleteMany({ where: { householdId, isDemo: true } }),
      prisma.bill.deleteMany({ where: { householdId, isDemo: true } }),
      prisma.subscription.deleteMany({ where: { householdId, isDemo: true } }),
      prisma.savingsGoal.deleteMany({ where: { householdId, isDemo: true } }),
      prisma.debt.deleteMany({ where: { householdId, isDemo: true } }),
      prisma.receivable.deleteMany({ where: { householdId, isDemo: true } }),
      prisma.account.deleteMany({ where: { householdId, isDemo: true } }),
    ]);
    revalidatePath('/');
    return undefined;
  });
}

/** Danger zone: wipes every financial record for the household (keeps the user login). */
export async function deleteAllData(confirmText: string): Promise<ActionResult<undefined>> {
  return safeAction(async () => {
    const { householdId } = await requireHousehold();
    if (confirmText !== 'DELETE') throw new Error('Type DELETE to confirm.');
    await prisma.$transaction([
      prisma.attachment.deleteMany({ where: { transaction: { householdId } } }),
      prisma.transaction.deleteMany({ where: { householdId } }),
      prisma.savingsContribution.deleteMany({ where: { savingsGoal: { householdId } } }),
      prisma.debtPayment.deleteMany({ where: { debt: { householdId } } }),
      prisma.receivablePayment.deleteMany({ where: { receivable: { householdId } } }),
      prisma.bill.deleteMany({ where: { householdId } }),
      prisma.subscription.deleteMany({ where: { householdId } }),
      prisma.budget.deleteMany({ where: { householdId } }),
      prisma.savingsGoal.deleteMany({ where: { householdId } }),
      prisma.debt.deleteMany({ where: { householdId } }),
      prisma.receivable.deleteMany({ where: { householdId } }),
      prisma.recurringRule.deleteMany({ where: { householdId } }),
      prisma.notification.deleteMany({ where: { householdId } }),
      prisma.account.deleteMany({ where: { householdId } }),
      prisma.exchangeRate.deleteMany({ where: { householdId } }),
    ]);
    revalidatePath('/');
    return undefined;
  });
}
