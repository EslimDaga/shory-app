import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { isUserId, refreshSubscription } from '../_shared/subscription.ts';

// RevenueCat → Shory. Called by RevenueCat on every purchase, renewal, cancellation, expiration,
// refund or transfer. The event only says *who* changed; their state is re-read from RevenueCat.
// RevenueCat sends the Authorization header set in its dashboard (REVENUECAT_WEBHOOK_AUTH).

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const WEBHOOK_AUTH = Deno.env.get('REVENUECAT_WEBHOOK_AUTH');

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// Constant-time comparison, so the secret can't be guessed byte by byte from response timings.
function safeEqual(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  let difference = left.length ^ right.length;
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return difference === 0;
}

// False for a deleted Shory account, whose events are skipped: there is no row to store, and
// reading it from RevenueCat would re-create the subscriber that delete-account removed.
async function accountExists(db: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await db.auth.admin.getUserById(userId);
  if (error?.status === 404) return false;
  if (error) throw error;
  return data.user !== null;
}

type WebhookEvent = {
  type?: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  transferred_from?: string[];
  transferred_to?: string[];
};

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  if (!WEBHOOK_AUTH) {
    console.error('revenuecat-webhook: REVENUECAT_WEBHOOK_AUTH is not set');
    return json(500, { error: 'not_configured' });
  }
  if (!safeEqual(request.headers.get('Authorization') ?? '', `Bearer ${WEBHOOK_AUTH}`)) {
    return json(401, { error: 'unauthorized' });
  }

  const body = (await request.json().catch(() => null)) as { event?: WebhookEvent } | null;
  const event = body?.event;
  if (!event) return json(400, { error: 'bad_request' });

  // Every Shory account the event touches (a transfer moves Pro from one account to another).
  const userIds = [
    ...new Set(
      [
        event.app_user_id,
        event.original_app_user_id,
        ...(event.aliases ?? []),
        ...(event.transferred_from ?? []),
        ...(event.transferred_to ?? []),
      ].filter(isUserId),
    ),
  ];

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  // Every account is refreshed even if another one fails. Retrying the whole event is harmless: a
  // refresh only re-reads RevenueCat and writes the same rows again.
  const results = await Promise.allSettled(
    userIds.map(async (userId) => {
      if (await accountExists(db, userId)) await refreshSubscription(db, userId);
    }),
  );
  const failures = results.flatMap((result) => (result.status === 'rejected' ? [result.reason] : []));
  if (failures.length > 0) {
    // A non-2xx answer makes RevenueCat retry the event later.
    console.error('revenuecat-webhook: refresh failed', event.type, failures);
    return json(500, { error: 'refresh_failed' });
  }
  return json(200, { ok: true, users: userIds.length });
});
