import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getCurrentSession, canWrite } from '@/lib/auth';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Wraps a route handler with auth + consistent error formatting. */
export function withHousehold<T extends any[]>(
  fn: (ctx: { householdId: string; userId: string; role: string }, ...args: T) => Promise<NextResponse>,
  opts: { requireWrite?: boolean } = {},
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      const session = await getCurrentSession();
      if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (opts.requireWrite && !canWrite(session.user.role)) {
        return NextResponse.json({ error: 'You do not have permission to perform this action' }, { status: 403 });
      }
      return await fn(
        { householdId: session.user.householdId, userId: session.user.id, role: session.user.role },
        ...args,
      );
    } catch (err) {
      return handleError(err);
    }
  };
}

export function handleError(err: unknown): NextResponse {
  if (err instanceof ZodError) {
    return NextResponse.json({ error: 'Validation failed', issues: err.flatten() }, { status: 422 });
  }
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  // eslint-disable-next-line no-console
  console.error(err);
  return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
}
