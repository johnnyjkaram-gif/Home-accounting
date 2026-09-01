import { getCurrentSession, canWrite } from '@/lib/auth';
import { ZodError } from 'zod';

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/** Every server action starts by calling this to get the acting household + permission check. */
export async function requireHousehold(requireWrite = true) {
  const session = await getCurrentSession();
  if (!session?.user) {
    throw new ActionAuthError('You must be signed in.');
  }
  if (requireWrite && !canWrite(session.user.role)) {
    throw new ActionAuthError('Your account role does not allow making changes.');
  }
  return { householdId: session.user.householdId, userId: session.user.id, role: session.user.role, baseCurrency: session.user.baseCurrency };
}

export class ActionAuthError extends Error {}

/** Wraps an action body, turning thrown errors into a typed ActionResult instead of an unhandled exception. */
export async function safeAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (err) {
    if (err instanceof ZodError) {
      const flat = err.flatten().fieldErrors as Record<string, string[]>;
      return { ok: false, error: 'Please check the highlighted fields.', fieldErrors: flat };
    }
    if (err instanceof ActionAuthError) {
      return { ok: false, error: err.message };
    }
    if (err instanceof Error) {
      return { ok: false, error: err.message };
    }
    return { ok: false, error: 'Something went wrong. Please try again.' };
  }
}
