import type { Plan } from './types';

/**
 * Usage allowances. The Edge Functions enforce the same numbers server-side
 * (supabase/functions/_shared/limits.ts) — keep the two in sync.
 */
export const LIMITS: Record<Plan, {
  generationsPerMonth: number;
  savedSnapshots: number;
  alternatesPerSnapshot: number;
  narrativesPerSnapshot: number;
  activePlans: number;
  horizons: number[];
}> = {
  free: {
    generationsPerMonth: 5,
    savedSnapshots: 1,
    alternatesPerSnapshot: 1,
    narrativesPerSnapshot: 1,
    activePlans: 1,
    horizons: [3, 5],
  },
  plus: {
    generationsPerMonth: 60,
    savedSnapshots: 20,
    alternatesPerSnapshot: 3,
    narrativesPerSnapshot: 4,
    activePlans: 10,
    horizons: [1, 3, 5, 10],
  },
};

export const PLUS_PRICE_LABEL = '₹299 / month';

export function currentPeriod(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
