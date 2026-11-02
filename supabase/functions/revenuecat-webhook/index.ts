// RevenueCat → Supabase: keeps profiles.plan in sync with Google Play subscriptions
// (purchases, renewals, cancellations, expirations, refunds).
import { adminClient, json } from '../_shared/http.ts';
import { syncPlan } from '../_shared/revenuecat.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const expected = Deno.env.get('REVENUECAT_WEBHOOK_AUTH');
  const got = req.headers.get('Authorization') ?? '';
  if (!expected || !(safeEqual(got, expected) || safeEqual(got, `Bearer ${expected}`))) {
    return json({ error: 'Unauthorized' }, 401);
  }

  try {
    const payload = await req.json();
    const event = payload?.event;
    if (!event?.id) return json({ error: 'Bad payload' }, 400);
    if (event.type === 'TEST') return json({ ok: true, test: true });

    const admin = adminClient();
    // Process each event once.
    const { error: dupErr } = await admin.from('billing_events').insert({ event_id: String(event.id) });
    if (dupErr) {
      if (dupErr.code === '23505') return json({ ok: true, duplicate: true });
      throw dupErr;
    }

    // The app logs users into RevenueCat with their Supabase id; anonymous ids are ignored.
    const ids = [event.app_user_id, event.original_app_user_id, ...(event.aliases ?? [])].filter(
      (x): x is string => typeof x === 'string' && UUID.test(x),
    );
    const userId = ids[0];
    if (!userId) return json({ ok: true, skipped: 'no app user id' });

    const result = await syncPlan(admin, userId);
    console.log(`revenuecat ${event.type} → ${userId}: ${result.plan}`);
    return json({ ok: true, ...result });
  } catch (e) {
    console.error('webhook failed', e);
    // 500 makes RevenueCat retry later.
    return json({ error: 'Webhook processing failed' }, 500);
  }
});
