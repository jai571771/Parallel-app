// Called by the app right after a purchase or restore, so Plus unlocks immediately
// without waiting for the RevenueCat webhook.
import { adminClient, HttpError, json, requireUser, serve } from '../_shared/http.ts';
import { syncPlan } from '../_shared/revenuecat.ts';

serve(async (req, body) => {
  const admin = adminClient();
  const user = await requireUser(req, admin);
  if (body.action !== 'sync') throw new HttpError(400, 'Unknown action.');
  return json(await syncPlan(admin, user.id));
});
