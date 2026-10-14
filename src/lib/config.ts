// Tutte le chiavi arrivano da variabili d'ambiente EXPO_PUBLIC_* (vedi .env.example).
// Se Supabase non è configurato l'app funziona in "modalità locale": i dati restano
// sul telefono e non si possono invitare altri dispositivi.

export const config = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  revenueCatIosKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '',
  revenueCatAndroidKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '',
  /** Identificativo dell'entitlement configurato su RevenueCat. */
  entitlementId: 'premium',
  /** Scansioni IA gratuite al mese per famiglia (deve coincidere con la Edge Function). */
  freeScansPerMonth: 3,
  /** Link allo store usato nei messaggi di invito. */
  shareUrl: process.env.EXPO_PUBLIC_SHARE_URL ?? '',
};

export const isCloud = Boolean(config.supabaseUrl && config.supabaseAnonKey);
