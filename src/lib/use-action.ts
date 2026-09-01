'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import type { ActionResult } from '@/lib/server/action-utils';

/**
 * Runs a server action, shows a toast on failure, surfaces per-field errors,
 * and calls onSuccess when it resolves ok. Keeps every form's submit handler
 * to a couple of lines instead of repeating try/catch + toast boilerplate.
 */
export function useAction<T>(action: (input: any) => Promise<ActionResult<T>>, onSuccess?: (data: T) => void) {
  const [pending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function run(input: any) {
    setFieldErrors({});
    startTransition(async () => {
      const result = await action(input);
      if (result.ok) {
        onSuccess?.(result.data);
      } else {
        toast.error(result.error);
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
      }
    });
  }

  return { run, pending, fieldErrors };
}

export function fieldError(fieldErrors: Record<string, string[]>, name: string): string | undefined {
  return fieldErrors[name]?.[0];
}
