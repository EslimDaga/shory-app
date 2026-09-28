import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
  type PurchasesPackage,
} from 'react-native-purchases';
import { strings } from '@/i18n/es';
import { getSupabase } from '@/services/auth/supabase';

// App Store purchases go through RevenueCat. The public SDK key is safe in the app: it can only
// start purchases and read the signed-in user's own status. The secret key lives in Supabase.
const API_KEY = Platform.OS === 'ios' ? (process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '') : '';
export const PRO_ENTITLEMENT = 'pro';

export const purchasesAvailable = API_KEY.length > 0;

export type PlanPeriod = 'monthly' | 'annual';

export type Plan = {
  period: PlanPeriod;
  price: string;
  // Only the annual plan: what it works out to per month, for comparison.
  pricePerMonth: string | null;
  // Free trial length in days, if this plan starts with one (Apple's introductory offer).
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
  constructor(
    message: string,
    readonly code: string | null,
  ) {
    super(message);
    this.name = 'StoreError';
  }
}

function toStoreError(error: unknown): StoreError {
  const code = (error as { code?: string } | null)?.code ?? null;
  const message = (code && STORE_MESSAGES[code as PURCHASES_ERROR_CODE]) || strings.paywall.failed;
  if (__DEV__) console.log(`[purchases] store error ${code ?? '?'}:`, (error as Error)?.message);
  return new StoreError(message, code);
}

// RevenueCat's default handler sends its errors to console.error, which covers the screen with
// LogBox in development. They go to the Metro log instead; the paywall shows its own message.
function logFromStore(level: LOG_LEVEL, message: string) {
  if (!__DEV__ || level === LOG_LEVEL.DEBUG || level === LOG_LEVEL.VERBOSE) return;
  console.log(`[RevenueCat] ${message}`);
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

function trialDays(pkg: PurchasesPackage): number | null {
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
  const plans: Plan[] = [];
  if (current.annual) {
    plans.push({
      period: 'annual',
      price: current.annual.product.priceString,
      pricePerMonth: current.annual.product.pricePerMonthString,
      trialDays: trialDays(current.annual),
      pkg: current.annual,
    });
  }
  if (current.monthly) {
    plans.push({
      period: 'monthly',
      price: current.monthly.product.priceString,
      pricePerMonth: null,
      trialDays: trialDays(current.monthly),
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

// Asks the server to re-read the purchase from RevenueCat and store it (see the `subscription`
// Edge Function). Server-side Pro features (live football data) go by that stored plan.
export async function syncServerPlan(): Promise<ServerPlan | null> {
  try {
    const { data, error } = await getSupabase().functions.invoke<{ subscription: ServerPlan }>(
      'subscription',
      {
        method: 'POST',
      },
    );
    return error || !data ? null : data.subscription;
  } catch {
    return null;
  }
}
