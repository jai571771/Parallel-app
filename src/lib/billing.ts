import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Linking, Platform } from 'react-native';
import Purchases, { type PurchasesPackage } from 'react-native-purchases';
import { supabase } from './supabase';

const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/**
 * Real Google Play purchases need a development/production build plus a RevenueCat key.
 * In Expo Go (or before setup) the paywall explains that instead of crashing.
 */
export const billingAvailable = Platform.OS === 'android' && !isExpoGo && ANDROID_KEY.length > 0;

export const billingUnavailableReason = isExpoGo
  ? 'Subscriptions work in the installed PARALLEL app, not in Expo Go.'
  : !ANDROID_KEY
    ? 'Subscriptions are being set up. Check back soon!'
    : 'Subscriptions are only available on Android for now.';

let configuredFor: string | null = null;

/** Links the RevenueCat customer to the Supabase user, so webhooks know who paid. */
export async function initBilling(userId: string) {
  if (!billingAvailable) return;
  if (configuredFor === null) {
    Purchases.configure({ apiKey: ANDROID_KEY, appUserID: userId });
  } else if (configuredFor !== userId) {
    await Purchases.logIn(userId);
  }
  configuredFor = userId;
}

export async function getPlusPackage(): Promise<PurchasesPackage | null> {
  if (!billingAvailable) return null;
  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  return current?.monthly ?? current?.availablePackages[0] ?? null;
}

/** Tells our server to re-check RevenueCat, so Plus unlocks right away. */
export async function syncPlan() {
  const { data, error } = await supabase.functions.invoke('billing', { body: { action: 'sync' } });
  if (error) throw new Error("Your purchase went through, but we couldn't refresh your plan yet. Pull to refresh in a minute.");
  return data as { plan: 'plus' | 'free'; plus_until: string | null };
}

/** Opens the Google Play purchase sheet. Returns false if the user cancelled. */
export async function buyPlus(pkg: PurchasesPackage): Promise<boolean> {
  try {
    await Purchases.purchasePackage(pkg);
  } catch (e) {
    if ((e as { userCancelled?: boolean }).userCancelled) return false;
    throw new Error((e as { message?: string }).message ?? 'The purchase could not be completed.');
  }
  await syncPlan();
  return true;
}

export async function restorePurchases() {
  if (billingAvailable) await Purchases.restorePurchases();
  return syncPlan();
}

/** Cancelling or changing a Play subscription happens in Google Play itself. */
export async function manageSubscription() {
  const pkg = Constants.expoConfig?.android?.package ?? '';
  await Linking.openURL(`https://play.google.com/store/account/subscriptions?package=${pkg}`);
}
