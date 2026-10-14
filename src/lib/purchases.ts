import { Platform } from 'react-native';
import Purchases, { type PurchasesPackage } from 'react-native-purchases';

import { config } from './config';

/**
 * Abbonamenti con RevenueCat (App Store + Google Play con un'unica integrazione).
 * Su web o senza chiavi configurate gli acquisti sono disattivati.
 */
let configured = false;

function apiKey(): string {
  if (Platform.OS === 'ios') return config.revenueCatIosKey;
  if (Platform.OS === 'android') return config.revenueCatAndroidKey;
  return '';
}

export function purchasesAvailable(): boolean {
  return Boolean(apiKey());
}

/** userId = id dell'utente Supabase: il webhook RevenueCat attiva il premium per tutta la famiglia. */
export function initPurchases(userId: string | null): void {
  if (configured || !purchasesAvailable()) return;
  Purchases.configure({ apiKey: apiKey(), appUserID: userId ?? undefined });
  configured = true;
}

export async function hasActiveEntitlement(): Promise<boolean> {
  if (!configured) return false;
  try {
    const info = await Purchases.getCustomerInfo();
    return Boolean(info.entitlements.active[config.entitlementId]);
  } catch {
    return false;
  }
}

export interface Plan {
  id: string;
  title: string;
  price: string;
  period: 'mensile' | 'annuale';
  pkg: PurchasesPackage;
}

export async function loadPlans(): Promise<Plan[]> {
  if (!configured) return [];
  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  if (!current) return [];
  const plans: Plan[] = [];
  if (current.annual) {
    plans.push({ id: 'annual', title: 'Annuale', price: current.annual.product.priceString, period: 'annuale', pkg: current.annual });
  }
  if (current.monthly) {
    plans.push({ id: 'monthly', title: 'Mensile', price: current.monthly.product.priceString, period: 'mensile', pkg: current.monthly });
  }
  return plans;
}

/** Ritorna true se l'acquisto è andato a buon fine, false se l'utente ha annullato. */
export async function buy(plan: Plan): Promise<boolean> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(plan.pkg);
    return Boolean(customerInfo.entitlements.active[config.entitlementId]);
  } catch (e) {
    if ((e as { userCancelled?: boolean }).userCancelled) return false;
    throw e;
  }
}

export async function restore(): Promise<boolean> {
  if (!configured) return false;
  const info = await Purchases.restorePurchases();
  return Boolean(info.entitlements.active[config.entitlementId]);
}
