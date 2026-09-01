import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { nextRunAfter } from '@/lib/recurrence';

/**
 * Materializes due recurring income/expense transactions.
 *
 * Next.js has no built-in scheduler, so this endpoint is designed to be
 * called periodically by an external scheduler (e.g. Vercel Cron — see
 * vercel.json — or any hourly/daily cron hitting this URL). Each call finds
 * every active RecurringRule whose nextRunDate has arrived, clones the most
 * recent transaction that used that rule (same amount/account/category/
 * currency) onto today's occurrence, and advances nextRunDate. Protect it
 * with CRON_SECRET so only your scheduler can trigger it.
 */
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret') ?? req.headers.get('x-cron-secret');
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const dueRules = await prisma.recurringRule.findMany({
    where: { active: true, nextRunDate: { lte: now }, OR: [{ endDate: null }, { endDate: { gte: now } }] },
    include: { transactions: { orderBy: { date: 'desc' }, take: 1 } },
  });

  let created = 0;
  for (const rule of dueRules) {
    const template = rule.transactions[0];
    if (!template) continue; // no template to clone from — skip safely

    await prisma.$transaction([
      prisma.transaction.create({
        data: {
          householdId: template.householdId,
          type: template.type,
          date: rule.nextRunDate,
          amount: template.amount,
          currency: template.currency,
          baseAmount: template.baseAmount,
          baseCurrency: template.baseCurrency,
          exchangeRate: template.exchangeRate,
          accountId: template.accountId,
          categoryId: template.categoryId,
          subcategory: template.subcategory,
          payee: template.payee,
          description: template.description,
          paymentMethodId: template.paymentMethodId,
          isRecurring: true,
          recurringRuleId: rule.id,
        },
      }),
      prisma.recurringRule.update({
        where: { id: rule.id },
        data: { nextRunDate: nextRunAfter(rule.startDate, rule.frequency as any, rule.interval, rule.nextRunDate) },
      }),
    ]);
    created++;
  }

  return NextResponse.json({ ok: true, rulesChecked: dueRules.length, transactionsCreated: created });
}
