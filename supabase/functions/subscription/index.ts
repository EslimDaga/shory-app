import { createClient } from 'npm:@supabase/supabase-js@2';
import { refreshSubscription } from '../_shared/subscription.ts';

// The signed-in user's plan, re-read from RevenueCat right now. The app calls it after a purchase
// or a restore, so Pro shows up at once even before RevenueCat's webhook arrives.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  const authorization = request.headers.get('Authorization');
  if (!authorization) return json(401, { error: 'missing_authorization' });

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) return json(401, { error: 'invalid_session' });

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  try {
    return json(200, { subscription: await refreshSubscription(db, data.user.id) });
  } catch (refreshError) {
    console.error('subscription: refresh failed', refreshError);
    return json(503, { error: 'unavailable' });
  }
});
