import { Platform } from 'react-native';
import Purchases, {
  INTRO_ELIGIBILITY_STATUS,
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
  type IntroEligibility,
  type PurchasesPackage,
} from 'react-native-purchases';
import { strings } from '@/i18n/es';
import { getSupabase } from '@/services/auth/supabase';
import { createLogger } from '@/services/observability/logger';

const log = createLogger('purchases');

// App Store purchases go through RevenueCat. The public SDK key is safe in the app: it can only
// start purchases and read the signed-in user's own status. The secret key lives in Supabase.
const API_KEY = Platform.OS === 'ios' ? (process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '') : '';
const PRO_ENTITLEMENT = 'pro';

export const purchasesAvailable = API_KEY.length > 0;

type PlanPeriod = 'monthly' | 'annual';

export type Plan = {
  period: PlanPeriod;
  price: string;
  // Only the annual plan: what it works out to per month, for comparison.
  pricePerMonth: string | null;
  // Free trial length in days, if this plan starts with one (Apple's introductory offer) and this
  // Apple ID can still use it.
  trialDays: number | null;
  pkg: PurchasesPackage;
};

export class PurchaseCancelledError extends Error {
  constructor() {
    super('cancelled');
    this.name = 'PurchaseCancelledError';
  }
}

// What the person sees when the store says no. The store's own text is written for developers
// (and names RevenueCat or its Test Store), so it never reaches the screen.
const STORE_MESSAGES: Partial<Record<PURCHASES_ERROR_CODE, string>> = {
  [PURCHASES_ERROR_CODE.NETWORK_ERROR]: strings.paywall.errors.offline,
  [PURCHASES_ERROR_CODE.OFFLINE_CONNECTION_ERROR]: strings.paywall.errors.offline,
  [PURCHASES_ERROR_CODE.PRODUCT_REQUEST_TIMED_OUT_ERROR]: strings.paywall.errors.offline,
  [PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR]: strings.paywall.errors.pending,
  [PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR]: strings.paywall.errors.notAllowed,
  [PURCHASES_ERROR_CODE.INSUFFICIENT_PERMISSIONS_ERROR]: strings.paywall.errors.notAllowed,
  [PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR]: strings.paywall.errors.alreadyOwned,
  [PURCHASES_ERROR_CODE.RECEIPT_ALREADY_IN_USE_ERROR]: strings.paywall.errors.otherAccount,
  [PURCHASES_ERROR_CODE.RECEIPT_IN_USE_BY_OTHER_SUBSCRIBER_ERROR]: strings.paywall.errors.otherAccount,
  [PURCHASES_ERROR_CODE.OPERATION_ALREADY_IN_PROGRESS_ERROR]: strings.paywall.errors.inProgress,
};

export class StoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StoreError';
  }
}

const EXPECTED_STORE_CODES = new Set<string>([
  PURCHASES_ERROR_CODE.NETWORK_ERROR,
  PURCHASES_ERROR_CODE.OFFLINE_CONNECTION_ERROR,
  PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR,
]);

function toStoreError(error: unknown): StoreError {
  const code = (error as { code?: string } | null)?.code ?? null;
  const message = (code && STORE_MESSAGES[code as PURCHASES_ERROR_CODE]) || strings.paywall.failed;
  // Connection trouble and payments awaiting approval (Ask to Buy) aren't bugs in the app.
  if (code && EXPECTED_STORE_CODES.has(code)) log.warn('store error', { storeCode: code });
  else log.error('store error', error, { storeCode: code ?? 'unknown' });
  return new StoreError(message);
}

// RevenueCat's default handler sends its errors to console.error, which covers the screen with
// LogBox in development. They go through the logger instead; the paywall shows its own message.
function logFromStore(level: LOG_LEVEL, message: string) {
  if (level === LOG_LEVEL.DEBUG || level === LOG_LEVEL.VERBOSE) return;
  if (level === LOG_LEVEL.ERROR) log.warn('revenuecat', { sdkMessage: message });
  else log.debug('revenuecat', { sdkMessage: message });
}

let configured = false;

// Configured once, with the Supabase user id as RevenueCat's app user id: purchases belong to
// the Shory account, and the server can look them up by the same id.
export async function startPurchases(userId: string): Promise<void> {
  if (!purchasesAvailable) return;
  if (!configured) {
    Purchases.setLogHandler(logFromStore);
    await Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.WARN : LOG_LEVEL.ERROR);
    Purchases.configure({
      apiKey: API_KEY,
      appUserID: userId,
      // Trusted entitlements: RevenueCat signs its responses, so a Pro status forged between the
      // app and RevenueCat (a tampered proxy) shows up as FAILED and is not honored below.
      entitlementVerificationMode: Purchases.ENTITLEMENT_VERIFICATION_MODE.INFORMATIONAL,
    });
    configured = true;
    return;
  }
  await Purchases.logIn(userId);
}

// Purchases must land on the signed-in Shory account. If switching RevenueCat to it failed at
// sign-in (offline), RevenueCat is still on an anonymous id, so it switches again before buying.
export async function ensureUser(userId: string): Promise<void> {
  if (!purchasesAvailable) return;
  try {
    if (!configured) {
      await startPurchases(userId);
      return;
    }
    if ((await Purchases.getAppUserID()) !== userId) await Purchases.logIn(userId);
  } catch (error) {
    throw toStoreError(error);
  }
}

export async function stopPurchases(): Promise<void> {
  if (!configured) return;
  try {
    await Purchases.logOut();
  } catch {
    // Already anonymous: nothing to do.
  }
}

export const hasPro = (info: CustomerInfo | null) =>
  Boolean(info?.entitlements.active[PRO_ENTITLEMENT]) &&
  info?.entitlements.verification !== Purchases.VERIFICATION_RESULT.FAILED;

export function listenToCustomerInfo(onChange: (info: CustomerInfo) => void): () => void {
  if (!configured) return () => {};
  Purchases.addCustomerInfoUpdateListener(onChange);
  return () => {
    Purchases.removeCustomerInfoUpdateListener(onChange);
  };
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!configured) return null;
  return Purchases.getCustomerInfo();
}

// Apple gives the free trial only to an Apple ID that hasn't had one in this subscription group:
// not to a lapsed subscriber, nor to a second Shory account on the same Apple ID. Unless RevenueCat
// confirms eligibility, the plan shows its normal price instead of a trial Apple won't honor.
function trialDays(pkg: PurchasesPackage, eligibility: Record<string, IntroEligibility>): number | null {
  const status = eligibility[pkg.product.identifier]?.status;
  if (status !== INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE) return null;
  const intro = pkg.product.introPrice;
  if (!intro || intro.price !== 0) return null;
  const perUnit = { DAY: 1, WEEK: 7, MONTH: 30, YEAR: 365 }[intro.periodUnit] ?? 0;
  return perUnit * intro.periodNumberOfUnits * (intro.cycles || 1) || null;
}

// The current offering's monthly and annual plans, as set up in RevenueCat.
// Throws (with the reason) rather than returning nothing: an empty paywall hides the problem.
export async function loadPlans(): Promise<Plan[]> {
  if (!configured) throw new Error('RevenueCat is not configured (missing key or native module)');
  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  if (!current) throw new Error('RevenueCat has no current offering');
  const offered = [current.annual, current.monthly].flatMap((pkg) => (pkg ? [pkg.product.identifier] : []));
  const eligibility: Record<string, IntroEligibility> =
    await Purchases.checkTrialOrIntroductoryPriceEligibility(offered).catch((error) => {
      log.warn('trial eligibility failed', { errorMessage: (error as Error)?.message });
      return {};
    });
  const plans: Plan[] = [];
  if (current.annual) {
    plans.push({
      period: 'annual',
      price: current.annual.product.priceString,
      pricePerMonth: current.annual.product.pricePerMonthString,
      trialDays: trialDays(current.annual, eligibility),
      pkg: current.annual,
    });
  }
  if (current.monthly) {
    plans.push({
      period: 'monthly',
      price: current.monthly.product.priceString,
      pricePerMonth: null,
      trialDays: trialDays(current.monthly, eligibility),
      pkg: current.monthly,
    });
  }
  if (plans.length === 0) throw new Error('The current offering has no monthly or annual package');
  return plans;
}

export async function purchase(plan: Plan): Promise<CustomerInfo> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(plan.pkg);
    return customerInfo;
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) throw new PurchaseCancelledError();
    throw toStoreError(error);
  }
}

export async function restore(): Promise<CustomerInfo> {
  try {
    return await Purchases.restorePurchases();
  } catch (error) {
    throw toStoreError(error);
  }
}

export async function manageSubscription(): Promise<void> {
  await Purchases.showManageSubscriptions();
}

export type ServerPlan = {
  plan: 'free' | 'pro';
  periodType: string | null;
  expiresAt: string | null;
  willRenew: boolean;
};

// The Edge Function waits up to 10 s on RevenueCat; past this the sync gives up (returns null)
// rather than keep a purchase spinner running on a stalled network.
const SYNC_TIMEOUT_MS = 15_000;

// Asks the server to re-read the purchase from RevenueCat and store it (see the `subscription`
// Edge Function). Server-side Pro features (live football data) go by that stored plan.
export async function syncServerPlan(): Promise<ServerPlan | null> {
  try {
    const { data, error } = await getSupabase().functions.invoke<{ subscription: ServerPlan }>(
      'subscription',
      { method: 'POST', timeout: SYNC_TIMEOUT_MS },
    );
    if (error) log.error('server plan sync failed', error);
    return error || !data ? null : data.subscription;
  } catch (error) {
    log.error('server plan sync failed', error);
    return null;
  }
}
