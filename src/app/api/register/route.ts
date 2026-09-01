import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { registerSchema } from '@/lib/validations';
import { handleError } from '@/lib/api-helpers';
import { rateLimit } from '@/lib/rate-limit';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES, DEFAULT_PAYMENT_METHODS } from '@/lib/constants';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
    const { ok } = rateLimit(`register:${ip}`, 5, 15 * 60 * 1000);
    if (!ok) {
      return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
    }

    const body = await req.json();
    const data = registerSchema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase().trim() } });
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const household = await prisma.household.create({
      data: {
        name: data.householdName,
        baseCurrency: data.baseCurrency,
        users: {
          create: {
            name: data.name,
            email: data.email.toLowerCase().trim(),
            passwordHash,
            role: 'ADMIN',
          },
        },
        categories: {
          create: [
            ...DEFAULT_INCOME_CATEGORIES.map((c) => ({ name: c.name, kind: 'INCOME' as const, color: c.color, icon: c.icon, isDefault: true })),
            ...DEFAULT_EXPENSE_CATEGORIES.map((c) => ({ name: c.name, kind: 'EXPENSE' as const, color: c.color, icon: c.icon, isDefault: true })),
          ],
        },
        paymentMethods: {
          create: DEFAULT_PAYMENT_METHODS.map((name, i) => ({ name, isDefault: i === 0 })),
        },
      },
    });

    return NextResponse.json({ ok: true, householdId: household.id }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
