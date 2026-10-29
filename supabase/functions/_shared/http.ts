import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2';
import { aiTrace } from './gemini.ts';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export class HttpError extends Error {
  constructor(public status: number, message: string, public extra: Record<string, unknown> = {}) {
    super(message);
  }
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Service-role client: bypasses RLS, so every query below filters by user_id explicitly. */
export function adminClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SECRET_KEY');
  if (!url || !key) throw new HttpError(500, 'Server is missing Supabase credentials.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Verifies the caller's access token with Supabase Auth and returns the user. */
export async function requireUser(req: Request, admin: SupabaseClient): Promise<User> {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new HttpError(401, 'Please sign in again.');
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, 'Your session has expired. Please sign in again.');
  return data.user;
}

/** Wraps a handler with CORS, JSON parsing and consistent error responses. */
export function serve(handler: (req: Request, body: Record<string, unknown>) => Promise<Response>) {
  Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    try {
      const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
      aiTrace.length = 0;
      const res = await handler(req, body);
      // Opt-in timing info for debugging slow AI calls (no content, just status + ms).
      if (req.headers.get('x-debug') === '1') res.headers.set('x-ai-trace', aiTrace.join(' | ').slice(0, 1000));
      return res;
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message, ...e.extra }, e.status);
      console.error(e);
      return json({ error: 'Something went wrong on our side. Please try again.' }, 500);
    }
  });
}
