import type { CustomerInfo } from 'react-native-purchases';

// No App Store on web: everyone there uses the free plan.
export const purchasesAvailable = false;
type PlanPeriod = 'monthly' | 'annual';
export type Plan = {
  period: PlanPeriod;
  price: string;
  pricePerMonth: string | null;
  trialDays: number | null;
  pkg: never;
};
export type ServerPlan = {
  plan: 'free' | 'pro';
  periodType: string | null;
  expiresAt: string | null;
  willRenew: boolean;
};
export class PurchaseCancelledError extends Error {}
export class StoreError extends Error {}
export const startPurchases = async (_userId: string) => {};
export const ensureUser = async (_userId: string) => {};
export const stopPurchases = async () => {};
export const hasPro = (_info: CustomerInfo | null) => false;
export const listenToCustomerInfo = (_onChange: (info: CustomerInfo) => void) => () => {};
export const getCustomerInfo = async (): Promise<CustomerInfo | null> => null;
export const loadPlans = async (): Promise<Plan[]> => [];
export const purchase = async (_plan: Plan): Promise<CustomerInfo> => {
  throw new Error('Purchases are not available on web');
};
export const restore = async (): Promise<CustomerInfo> => {
  throw new Error('Purchases are not available on web');
};
export const manageSubscription = async () => {};
export const syncServerPlan = async (): Promise<ServerPlan | null> => null;
