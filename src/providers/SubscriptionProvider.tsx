import { createContext, use, useCallback, useEffect, useState, type ReactNode } from 'react';
import type { CustomerInfo } from 'react-native-purchases';
import { strings } from '@/i18n/es';
import {
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
export type ProFeature = 'widget' | 'template' | 'video' | 'watermark' | 'football' | 'upgrade';

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
  buy: (plan: Plan) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
};

type PlansStatus = 'idle' | 'loading' | 'failed';

// Store problems are otherwise invisible in the paywall; in development they're logged.
function logStoreError(where: string, error: unknown) {
  if (__DEV__) console.warn(`[purchases] ${where}:`, error instanceof Error ? error.message : error);
}

// Only our own wording reaches the paywall, never the store's developer-facing text.
const storeMessage = (error: unknown) =>
  error instanceof StoreError ? error.message : strings.paywall.failed;

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
  const update = useCallback(
    (owner: string, patch: Partial<Omit<Account, 'userId'>>) =>
      setAccount((previous) => ({
        ...(previous.userId === owner ? previous : { ...EMPTY_ACCOUNT, userId: owner }),
        ...patch,
      })),
    [],
  );
  const [paywall, setPaywall] = useState<ProFeature | null>(null);
  const [unlocked, setUnlocked] = useState<'purchase' | 'restore' | null>(null);
  const [busy, setBusy] = useState<'purchase' | 'restore' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Purchases follow the Shory account: switching accounts switches whose purchases are shown.
  useEffect(() => {
    if (!userId) {
      stopPurchases();
      return;
    }
    let active = true;
    let unsubscribe = () => {};
    (async () => {
      try {
        await startPurchases(userId);
        if (!active) return;
        unsubscribe = listenToCustomerInfo((info) => active && update(userId, { customerInfo: info }));
        const [info, loadedPlans] = await Promise.all([
          getCustomerInfo(),
          loadPlans().catch((error) => {
            logStoreError('loadPlans', error);
            return [];
          }),
        ]);
        if (active) update(userId, { customerInfo: info, plans: loadedPlans });
      } catch (error) {
        logStoreError('startPurchases', error);
        // Store unreachable: the app keeps working on the free plan and the server's record.
      }
      const plan = await syncServerPlan();
      if (active) update(userId, { serverPlan: plan });
    })();
    return () => {
      active = false;
      unsubscribe();
    };
  }, [userId, update]);

  const isPro = hasPro(customerInfo) || serverPlan?.plan === 'pro';

  // Plans are fetched with the account; if that failed (offline, store not ready), opening the
  // paywall tries again rather than showing an empty screen.
  const [plansStatus, setPlansStatus] = useState<PlansStatus>('idle');
  // The store's own reason, shown in development builds only.
  const [plansError, setPlansError] = useState<string | null>(null);
  const reloadPlans = useCallback(async () => {
    if (!userId || !purchasesAvailable) return;
    setPlansStatus('loading');
    try {
      update(userId, { plans: await loadPlans() });
      setPlansError(null);
      setPlansStatus('idle');
    } catch (error) {
      logStoreError('reloadPlans', error);
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
  const closePaywall = useCallback(() => {
    setPaywall(null);
    setUnlocked(null);
  }, []);

  const requirePro = (feature: ProFeature) => {
    if (isPro) return true;
    openPaywall(feature);
    return false;
  };

  const settle = async (info: CustomerInfo, action: 'purchase' | 'restore') => {
    if (!userId) return false;
    update(userId, { customerInfo: info });
    // The server re-reads the purchase from RevenueCat before trusting it.
    const plan = await syncServerPlan();
    update(userId, { serverPlan: plan });
    if (hasPro(info) || plan?.plan === 'pro') {
      setUnlocked(action);
      return true;
    }
    // A purchase that went through but hasn't unlocked Pro yet (the store is still confirming it)
    // must never end in silence.
    setError(action === 'restore' ? strings.paywall.nothingToRestore : strings.paywall.notActiveYet);
    return false;
  };

  const buy = async (plan: Plan) => {
    if (busy) return false;
    setBusy('purchase');
    setError(null);
    try {
      return await settle(await purchase(plan), 'purchase');
    } catch (caught) {
      if (!(caught instanceof PurchaseCancelledError)) setError(storeMessage(caught));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const restorePurchases = async () => {
    if (busy) return false;
    setBusy('restore');
    setError(null);
    try {
      return await settle(await restore(), 'restore');
    } catch (caught) {
      setError(storeMessage(caught));
      return false;
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
