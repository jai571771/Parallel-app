import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';

/** Thrown when the server says a free-tier allowance is used up. */
export class LimitError extends Error {
  constructor(message: string, public limit: string) {
    super(message);
    this.name = 'LimitError';
  }
}

async function invoke<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let payload: { error?: string; code?: string; limit?: string } | null = null;
    if (error instanceof FunctionsHttpError) {
      try {
        payload = await error.context.json();
      } catch {
        // non-JSON body
      }
    }
    if (payload?.code === 'LIMIT_REACHED') {
      throw new LimitError(payload.error ?? 'You have reached your free allowance.', payload.limit ?? '');
    }
    throw new Error(payload?.error ?? error.message ?? 'Something went wrong. Please try again.');
  }
  return data as T;
}

/**
 * Creates a new snapshot (baseline + one alternate) from the user's profile, or —
 * when `snapshotId` is given — adds another alternate path to an existing snapshot.
 */
export function generateSnapshot(args: {
  horizonYears: number;
  decision?: string;
  snapshotId?: string;
  labContext?: string;
  replaceOldest?: boolean;
}) {
  return invoke<{ snapshotId: string }>('generate-snapshot', args);
}

export function generateNarrative(scenarioId: string) {
  return invoke<{ narrative: string }>('generate-narrative', { scenarioId });
}

export function generatePlan(scenarioId: string) {
  return invoke<{ planId: string }>('generate-plan', { scenarioId });
}
