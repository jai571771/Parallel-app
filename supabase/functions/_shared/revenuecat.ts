import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { HttpError } from './http.ts';

/** RevenueCat entitlement that unlocks PARALLEL Plus. */
export const ENTITLEMENT = 'plus';

/**
 * Asks RevenueCat for the user's current Plus entitlement (RevenueCat recommends
 * re-fetching the subscriber rather than trusting webhook payloads).
 * Returns the expiry date, or null if the user has never had Plus.
 */
export async function fetchPlusExpiry(appUserId: string): Promise<string | null> {
  const key = Deno.env.get('REVENUECAT_SECRET_KEY');
  if (!key) throw new HttpError(500, 'Subscriptions are not configured yet (missing REVENUECAT_SECRET_KEY).');

  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`, {
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    console.error('RevenueCat error', res.status, await res.text());
    throw new HttpError(502, "We couldn't check your subscription right now. Please try again.");
  }
  const data = await res.json();
  const ent = data?.subscriber?.entitlements?.[ENTITLEMENT];
  // Lifetime/non-expiring grants have expires_date = null but are still active.
  if (ent && ent.expires_date === null) return '2999-12-31T00:00:00Z';
  return ent?.expires_date ?? null;
}

/** Re-checks RevenueCat and writes the result to profiles.plan / plus_until. */
export async function syncPlan(admin: SupabaseClient, userId: string) {
  const until = await fetchPlusExpiry(userId);
  const { data, error } = await admin.rpc('set_plan', { p_user: userId, p_until: until });
  if (error) throw error;
  return { plan: data as 'plus' | 'free', plus_until: until };
}
