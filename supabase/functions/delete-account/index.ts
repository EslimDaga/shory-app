import { createClient } from 'npm:@supabase/supabase-js@2';
import { importPKCS8, SignJWT } from 'npm:jose@5';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Sign in with Apple token revocation (required by App Review for apps that offer Sign in with
// Apple). Set with `supabase secrets set`; see docs/AUTH_SETUP.md.
const APPLE_TEAM_ID = Deno.env.get('APPLE_TEAM_ID');
const APPLE_KEY_ID = Deno.env.get('APPLE_KEY_ID');
const APPLE_CLIENT_ID = Deno.env.get('APPLE_CLIENT_ID');
const APPLE_PRIVATE_KEY = Deno.env.get('APPLE_PRIVATE_KEY');

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// The short-lived client secret Apple's token endpoints expect: an ES256 JWT signed with the
// Sign in with Apple key.
async function appleClientSecret(): Promise<string> {
  const key = await importPKCS8(APPLE_PRIVATE_KEY!.replace(/\\n/g, '\n'), 'ES256');
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: APPLE_KEY_ID! })
    .setIssuer(APPLE_TEAM_ID!)
    .setIssuedAt()
    .setExpirationTime('5m')
    .setAudience('https://appleid.apple.com')
    .setSubject(APPLE_CLIENT_ID!)
    .sign(key);
}

// The `sub` claim of an ID token Apple just returned to us over TLS (so its signature needn't be
// re-checked here).
function tokenSubject(idToken: string | undefined): string | null {
  const payload = idToken?.split('.')[1];
  if (!payload) return null;
  try {
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as { sub?: unknown };
    return typeof decoded.sub === 'string' ? decoded.sub : null;
  } catch {
    return null;
  }
}

// Trades the app's one-time authorization code for a refresh token, then revokes it, which
// unlinks Shory from the person's Apple ID. The code must belong to the account being deleted:
// otherwise someone could pass a code for a different Apple ID.
async function revokeAppleTokens(authorizationCode: string, appleUserId: string): Promise<boolean> {
  const secret = await appleClientSecret();
  const tokenResponse = await fetch('https://appleid.apple.com/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: APPLE_CLIENT_ID!,
      client_secret: secret,
      code: authorizationCode,
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenResponse.ok) return false;
  const tokens = (await tokenResponse.json()) as { refresh_token?: string; id_token?: string };
  const refreshToken = tokens.refresh_token;
  if (!refreshToken || tokenSubject(tokens.id_token) !== appleUserId) return false;

  const revokeResponse = await fetch('https://appleid.apple.com/auth/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: APPLE_CLIENT_ID!,
      client_secret: secret,
      token: refreshToken,
      token_type_hint: 'refresh_token',
    }),
  });
  return revokeResponse.ok;
}

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

  const body = (await request.json().catch(() => ({}))) as { appleAuthorizationCode?: unknown };
  const appleCode = typeof body.appleAuthorizationCode === 'string' ? body.appleAuthorizationCode : null;
  const isAppleUser = data.user.app_metadata?.provider === 'apple';

  if (isAppleUser) {
    const configured = APPLE_TEAM_ID && APPLE_KEY_ID && APPLE_CLIENT_ID && APPLE_PRIVATE_KEY;
    if (!configured) {
      console.error('delete-account: Apple revocation secrets are not set');
      return json(500, { error: 'apple_revocation_unavailable' });
    }
    const appleIdentity = data.user.identities?.find((identity) => identity.provider === 'apple');
    const appleUserId = (appleIdentity?.identity_data?.sub as string | undefined) ?? appleIdentity?.id;
    if (!appleCode || !appleUserId) return json(400, { error: 'missing_apple_authorization_code' });
    try {
      if (!(await revokeAppleTokens(appleCode, appleUserId))) {
        return json(502, { error: 'apple_revocation_failed' });
      }
    } catch (revokeError) {
      console.error('delete-account: Apple revocation threw', revokeError);
      return json(502, { error: 'apple_revocation_failed' });
    }
  }

  // Purchase history at RevenueCat goes too (best effort: the account is deleted either way). The
  // App Store subscription itself can only be cancelled by the person, in their Apple ID settings.
  const revenueCatKey = Deno.env.get('REVENUECAT_SECRET_KEY');
  if (revenueCatKey) {
    await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(data.user.id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${revenueCatKey}` },
      signal: AbortSignal.timeout(10_000),
    }).catch((revenueCatError) => console.error('delete-account: RevenueCat delete failed', revenueCatError));
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id);
  if (deleteError) {
    // Details stay in the function logs; the app only needs to know it failed.
    console.error('delete-account: deleteUser failed', deleteError.message);
    return json(500, { error: 'delete_failed' });
  }

  return json(200, { deleted: true });
});
