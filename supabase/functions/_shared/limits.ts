import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { HttpError } from './http.ts';

// Mirror of src/lib/limits.ts — keep in sync.
export const LIMITS = {
  free: { generationsPerMonth: 5, savedSnapshots: 1, alternatesPerSnapshot: 1, narrativesPerSnapshot: 1, activePlans: 1, horizons: [3, 5] },
  plus: { generationsPerMonth: 60, savedSnapshots: 20, alternatesPerSnapshot: 3, narrativesPerSnapshot: 4, activePlans: 10, horizons: [1, 3, 5, 10] },
} as const;

export type PlanName = keyof typeof LIMITS;

export function limitsFor(plan: string | null | undefined) {
  return LIMITS[plan === 'plus' ? 'plus' : 'free'];
}

export function limitReached(message: string, limit: string): never {
  throw new HttpError(429, message, { code: 'LIMIT_REACHED', limit });
}

export function currentPeriod(d = new Date()) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export async function assertMonthlyAllowance(admin: SupabaseClient, userId: string, plan: string) {
  const { data } = await admin
    .from('usage')
    .select('generations')
    .eq('user_id', userId)
    .eq('period', currentPeriod())
    .maybeSingle();
  const used = data?.generations ?? 0;
  const max = limitsFor(plan).generationsPerMonth;
  if (used >= max) {
    limitReached(
      plan === 'plus'
        ? `You've reached this month's fair-use limit of ${max} explorations.`
        : `You've used all ${max} free explorations this month. They refresh next month.`,
      'monthly',
    );
  }
}

export async function recordGeneration(admin: SupabaseClient, userId: string) {
  const { error } = await admin.rpc('increment_usage', { p_user: userId, p_period: currentPeriod() });
  if (error) console.error('increment_usage failed', error);
}
