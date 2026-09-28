import { createContext, use, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { CustomerInfo } from 'react-native-purchases';
import { strings } from '@/i18n/es';
import {
  ensureUser,
  getCustomerInfo,
  hasPro,
  listenToCustomerInfo,
  loadPlans,
  purchase,
  PurchaseCancelledError,
  purchasesAvailable,
  restore,
  startPurchases,
  StoreError,
  stopPurchases,
  syncServerPlan,
  type Plan,
  type ServerPlan,
} from '@/services/purchases/purchases';
import { useAuth } from './AuthProvider';

// Why the paywall opened: it leads with the feature the person just tried to use.
export type ProFeature = 'widget' | 'template' | 'video' | 'upgrade';

// How a purchase or restore ended. `message` says what went wrong; null when the person cancelled.
type StoreOutcome = { ok: true } | { ok: false; message: string | null };

type SubscriptionContextValue = {
  isPro: boolean;
  // Server's view (expiry, trial, renewal) for the account screen.
  serverPlan: ServerPlan | null;
  plans: Plan[];
  plansStatus: PlansStatus;
  plansError: string | null;
  reloadPlans: () => Promise<void>;
  paywall: ProFeature | null;
  // Set once a purchase or restore unlocks Pro: the paywall turns into a welcome screen.
  unlocked: 'purchase' | 'restore' | null;
  busy: 'purchase' | 'restore' | null;
  error: string | null;
  available: boolean;
  openPaywall: (feature: ProFeature) => void;
  closePaywall: () => void;
  // True if the user has Pro; otherwise opens the paywall for `feature` and returns false.
  requirePro: (feature: ProFeature) => boolean;
  buy: (plan: Plan) => Promise<StoreOutcome>;
  restorePurchases: () => Promise<StoreOutcome>;
};

type PlansStatus = 'idle' | 'loading' | 'failed';

// Store problems are otherwise invisible in the paywall; in development they're logged.
function logStoreError(where: string, error: unknown) {
  if (__DEV__) console.warn(`[purchases] ${where}:`, error instanceof Error ? error.message : error);
}

// Only our own wording reaches the paywall, never the store's developer-facing text.
const storeMessage = (error: unknown) =>
  error instanceof StoreError ? error.message : strings.paywall.failed;

// The server's record is read once per session, so it only counts until the date it expires.
const serverGrantsPro = (plan: ServerPlan | null) =>
  plan?.plan === 'pro' && (!plan.expiresAt || Date.parse(plan.expiresAt) > Date.now());

type Account = {
  userId: string | null;
  customerInfo: CustomerInfo | null;
  serverPlan: ServerPlan | null;
  plans: Plan[];
};

const EMPTY_ACCOUNT: Account = { userId: null, customerInfo: null, serverPlan: null, plans: [] };

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  // Tagged with the account it belongs to, so another account (or none) never sees it.
  const [account, setAccount] = useState<Account>(EMPTY_ACCOUNT);
  const current = account.userId !== null && account.userId === userId ? account : EMPTY_ACCOUNT;
  const { customerInfo, serverPlan, plans } = current;
  // The account signed in right now, for results that arrive after an await.
  const userIdRef = useRef(userId);
  const update = useCallback((owner: string, patch: Partial<Omit<Account, 'userId'>>) => {
    // A late result for an account that has signed out must not replace the next one's state.
    if (userIdRef.current !== owner) return;
    setAccount((previous) => ({
      ...(previous.userId === owner ? previous : { ...EMPTY_ACCOUNT, userId: owner }),
      ...patch,
    }));
  }, []);
  const [paywall, setPaywall] = useState<ProFeature | null>(null);
  const [unlocked, setUnlocked] = useState<'purchase' | 'restore' | null>(null);
  const [busy, setBusy] = useState<'purchase' | 'restore' | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Plans are fetched with the account; if that failed (offline, store not ready), opening the
  // paywall tries again rather than showing an empty screen.
  const [plansStatus, setPlansStatus] = useState<PlansStatus>('idle');
  // The store's own reason, shown in development builds only.
  const [plansError, setPlansError] = useState<string | null>(null);

  // The paywall belongs to the session it opened in: signing out (or into another account) closes
  // it and forgets its result, so it never stays over the sign-in screen.
  const [sessionUserId, setSessionUserId] = useState(userId);
  if (sessionUserId !== userId) {
    setSessionUserId(userId);
    setPaywall(null);
    setUnlocked(null);
    setError(null);
    setPlansStatus('idle');
    setPlansError(null);
  }

  // Purchases follow the Shory account: switching accounts switches whose purchases are shown.
  useEffect(() => {
    userIdRef.current = userId;
    if (!userId) {
      stopPurchases();
      return;
    }
    let active = true;
    let unsubscribe = () => {};
    const refreshServerPlan = async () => {
      const plan = await syncServerPlan();
      // A failed sync keeps the last known plan rather than dropping to free.
      if (active && plan) update(userId, { serverPlan: plan });
    };
    // Whether the store granted Pro the last time it reported, to notice the moment it stops.
    let storePro = false;
    const onStoreInfo = (info: CustomerInfo | null) => {
      if (!active) return;
      update(userId, { customerInfo: info });
      const wasPro = storePro;
      storePro = hasPro(info);
      // Pro ended in the store (expired, refunded): the server's copy is re-read so it stops
      // unlocking Pro as well.
      if (wasPro && !storePro) refreshServerPlan();
    };
    (async () => {
      try {
        await startPurchases(userId);
        if (!active) return;
        unsubscribe = listenToCustomerInfo(onStoreInfo);
        const [info, loadedPlans] = await Promise.all([
          getCustomerInfo(),
          loadPlans().catch((error) => {
            logStoreError('loadPlans', error);
            return [];
          }),
        ]);
        onStoreInfo(info);
        if (active) update(userId, { plans: loadedPlans });
      } catch (error) {
        logStoreError('startPurchases', error);
        // Store unreachable: the app keeps working on the free plan and the server's record.
      }
      await refreshServerPlan();
    })();
    return () => {
      active = false;
      unsubscribe();
    };
  }, [userId, update]);

  const isPro = hasPro(customerInfo) || serverGrantsPro(serverPlan);

  const reloadPlans = useCallback(async () => {
    if (!userId || !purchasesAvailable) return;
    setPlansStatus('loading');
    try {
      const loaded = await loadPlans();
      // Signed out meanwhile: the session reset already cleared the status.
      if (userIdRef.current !== userId) return;
      update(userId, { plans: loaded });
      setPlansError(null);
      setPlansStatus('idle');
    } catch (error) {
      logStoreError('reloadPlans', error);
      if (userIdRef.current !== userId) return;
      setPlansError(error instanceof Error ? error.message : String(error));
      setPlansStatus('failed');
    }
  }, [userId, update]);

  const openPaywall = useCallback(
    (feature: ProFeature) => {
      setError(null);
      setUnlocked(null);
      setPaywall(feature);
      if (plans.length === 0) reloadPlans();
    },
    [plans.length, reloadPlans],
  );
  // Only hides the sheet: the welcome screen stays on it while it slides away. Opening the
  // paywall again starts it fresh.
  const closePaywall = useCallback(() => setPaywall(null), []);

  const requirePro = (feature: ProFeature) => {
    if (isPro) return true;
    openPaywall(feature);
    return false;
  };

  const fail = (message: string): StoreOutcome => {
    setError(message);
    return { ok: false, message };
  };

  const settle = async (
    owner: string,
    info: CustomerInfo,
    action: 'purchase' | 'restore',
  ): Promise<StoreOutcome> => {
    update(owner, { customerInfo: info });
    // The server re-reads the purchase from RevenueCat before trusting it.
    const sync = syncServerPlan().then((plan) => {
      if (plan) update(owner, { serverPlan: plan });
      return plan;
    });
    // The store already confirmed Pro: no need to wait for the server, which catches up behind.
    if (hasPro(info)) {
      setUnlocked(action);
      return { ok: true };
    }
    const plan = await sync;
    // Signed out meanwhile: the plan was read with whatever session is current now.
    if (userIdRef.current !== owner) return { ok: false, message: null };
    if (serverGrantsPro(plan)) {
      setUnlocked(action);
      return { ok: true };
    }
    // A purchase that went through but hasn't unlocked Pro yet (the store is still confirming it)
    // must never end in silence.
    return fail(action === 'restore' ? strings.paywall.nothingToRestore : strings.paywall.notActiveYet);
  };

  const buy = async (plan: Plan): Promise<StoreOutcome> => {
    // Never without a Shory account: the purchase would land on an anonymous store id.
    if (busy || !userId) return { ok: false, message: null };
    const owner = userId;
    setBusy('purchase');
    setError(null);
    try {
      await ensureUser(owner);
      return await settle(owner, await purchase(plan), 'purchase');
    } catch (caught) {
      if (caught instanceof PurchaseCancelledError) return { ok: false, message: null };
      return fail(storeMessage(caught));
    } finally {
      setBusy(null);
    }
  };

  const restorePurchases = async (): Promise<StoreOutcome> => {
    if (busy || !userId) return { ok: false, message: null };
    const owner = userId;
    setBusy('restore');
    setError(null);
    try {
      await ensureUser(owner);
      return await settle(owner, await restore(), 'restore');
    } catch (caught) {
      return fail(storeMessage(caught));
    } finally {
      setBusy(null);
    }
  };

  const value: SubscriptionContextValue = {
    isPro,
    serverPlan,
    plans,
    plansStatus,
    plansError: __DEV__ ? plansError : null,
    reloadPlans,
    paywall,
    unlocked,
    busy,
    error,
    available: purchasesAvailable,
    openPaywall,
    closePaywall,
    requirePro,
    buy,
    restorePurchases,
  };

  return <SubscriptionContext value={value}>{children}</SubscriptionContext>;
}

export function useSubscription(): SubscriptionContextValue {
  const context = use(SubscriptionContext);
  if (!context) throw new Error('useSubscription must be used inside SubscriptionProvider');
  return context;
}
