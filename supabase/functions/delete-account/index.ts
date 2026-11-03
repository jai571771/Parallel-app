// Permanently deletes the caller's account (Google Play requires in-app account deletion).
// Every user table references auth.users with ON DELETE CASCADE, so this removes all their data.
import { adminClient, HttpError, json, requireUser, serve } from '../_shared/http.ts';

serve(async (req, body) => {
  const admin = adminClient();
  const user = await requireUser(req, admin);
  if (body.confirm !== 'DELETE') throw new HttpError(400, 'Please confirm account deletion.');

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error('deleteUser failed', error);
    throw new HttpError(500, "We couldn't delete your account. Please try again or email us.");
  }
  return json({ deleted: true });
});
