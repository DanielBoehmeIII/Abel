type AppEnv = 'development' | 'preview' | 'production';

function boolEnv(name: string, fallback: boolean): boolean {
  const raw = import.meta.env[name];
  if (raw === undefined || raw === '') return fallback;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  throw new Error(`Invalid ${name}: expected "true" or "false"`);
}

function enumEnv<T extends string>(name: string, values: readonly T[], fallback: T): T {
  const raw = import.meta.env[name] as string | undefined;
  if (!raw) return fallback;
  if ((values as readonly string[]).includes(raw)) return raw as T;
  throw new Error(`Invalid ${name}: expected one of ${values.join(', ')}`);
}

function listEnv(name: string): string[] {
  const raw = import.meta.env[name] as string | undefined;
  return raw ? raw.split(',').map(v => v.trim()).filter(Boolean) : [];
}

export const appEnv = {
  appEnv: enumEnv<AppEnv>('VITE_ABEL_APP_ENV', ['development', 'preview', 'production'], import.meta.env.PROD ? 'production' : 'development'),
  betaAccessEnabled: boolEnv('VITE_ABEL_BETA_ENABLED', false),
  inviteCodes: listEnv('VITE_ABEL_INVITE_CODES'),
  analyticsEnabled: boolEnv('VITE_ABEL_ANALYTICS_ENABLED', false),
  feedbackEnabled: boolEnv('VITE_ABEL_FEEDBACK_ENABLED', true),
  release: (import.meta.env.VITE_ABEL_RELEASE as string | undefined) || 'local',
  healthVersion: (import.meta.env.VITE_ABEL_HEALTH_VERSION as string | undefined) || '1',
  stripePublishableKey: (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined) || '',
  stripeWebhookSecret: (import.meta.env.VITE_STRIPE_WEBHOOK_SECRET as string | undefined) || '',
  stripePriceLookupKey: (import.meta.env.VITE_STRIPE_PRICE_LOOKUP_KEY as string | undefined) || '',

  acceptedPaymentMethods: listEnv('VITE_ACCEPTED_PAYMENT_METHODS'),
  defaultCurrency: (import.meta.env.VITE_DEFAULT_CURRENCY as string | undefined) || 'usd',
  trialEnabled: boolEnv('VITE_TRIAL_ENABLED', true),
  referralEnabled: boolEnv('VITE_REFERRAL_ENABLED', true),
  creditPacksEnabled: boolEnv('VITE_CREDIT_PACKS_ENABLED', true),
} as const;

export function validateEnv(): void {
  if (appEnv.betaAccessEnabled && appEnv.appEnv === 'production' && appEnv.inviteCodes.length === 0) {
    throw new Error('VITE_ABEL_BETA_ENABLED requires VITE_ABEL_INVITE_CODES in production');
  }
}
