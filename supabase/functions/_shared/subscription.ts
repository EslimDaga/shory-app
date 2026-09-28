import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

// RevenueCat is the source of truth for purchases. Whatever triggers a refresh (a webhook, the
// app after buying), the state is re-read from RevenueCat's API with the secret key, never taken
// from the caller.
const REVENUECAT_SECRET_KEY = Deno.env.get('REVENUECAT_SECRET_KEY');
export const PRO_ENTITLEMENT = 'pro';

export type Subscription = {
  plan: 'free' | 'pro';
  periodType: string | null;
  productId: string | null;
  expiresAt: string | null;
  willRenew: boolean;
};

type Subscriber = {
  entitlements: Record<
    string,
    { expires_date: string | null; grace_period_expires_date: string | null; product_identifier: string }
  >;
  subscriptions: Record<
    string,
    {
      period_type?: string;
      unsubscribe_detected_at?: string | null;
      billing_issues_detected_at?: string | null;
    }
  >;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// App user ids are Supabase user ids; anything else (RevenueCat anonymous ids) is ignored.
export const isUserId = (value: unknown): value is string => typeof value === 'string' && UUID.test(value);

async function fetchSubscriber(userId: string): Promise<Subscriber> {
  if (!REVENUECAT_SECRET_KEY) throw new Error('REVENUECAT_SECRET_KEY is not set');
  const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${REVENUECAT_SECRET_KEY}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`RevenueCat ${response.status}`);
  const { subscriber } = (await response.json()) as { subscriber: Subscriber };
  return subscriber;
}

export function toSubscription(subscriber: Subscriber, now = Date.now()): Subscription {
  const entitlement = subscriber.entitlements[PRO_ENTITLEMENT];
  // A billing grace period keeps Pro on while Apple retries the payment.
  const until = entitlement?.grace_period_expires_date ?? entitlement?.expires_date ?? null;
  const active = entitlement !== undefined && (until === null || Date.parse(until) > now);
  if (!active) return { plan: 'free', periodType: null, productId: null, expiresAt: null, willRenew: false };
  const purchase = subscriber.subscriptions[entitlement.product_identifier];
  return {
    plan: 'pro',
    periodType: purchase?.period_type ?? null,
    productId: entitlement.product_identifier,
    expiresAt: until,
    willRenew: !purchase?.unsubscribe_detected_at && !purchase?.billing_issues_detected_at,
  };
}

// Re-reads the user's purchases from RevenueCat and stores the result.
export async function refreshSubscription(db: SupabaseClient, userId: string): Promise<Subscription> {
  const subscription = toSubscription(await fetchSubscriber(userId));
  const { error } = await db.from('subscriptions').upsert({
    user_id: userId,
    plan: subscription.plan,
    period_type: subscription.periodType,
    product_id: subscription.productId,
    expires_at: subscription.expiresAt,
    will_renew: subscription.willRenew,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`subscriptions upsert failed: ${error.message}`);
  return subscription;
}
