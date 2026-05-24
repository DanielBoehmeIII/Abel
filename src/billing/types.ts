export type TierId = 'free' | 'starter' | 'pro' | 'power';
export type BillingPeriod = 'monthly' | 'yearly';
export type OverageBehavior = 'block' | 'meter' | 'credit' | 'topup';
export type UsageEventType = 'chat' | 'graph' | 'memory' | 'focus' | 'quest' | 'export' | 'reasoning' | 'agent';
export type ProviderName = 'claude' | 'chatgpt' | 'gemini' | 'local' | 'mock';
export type TokenType = 'input' | 'output' | 'cache_read' | 'cache_write';
export type SetupMode = 'subscription' | 'local' | 'manual';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete' | 'unpaid' | 'incomplete_expired';

export interface TierDefinition {
  id: TierId;
  name: string;
  price: Record<BillingPeriod, number>;
  includedUsage: {
    inputTokens: number;
    outputTokens: number;
    cacheReads: number;
    aiRequests: number;
    graphNodes: number;
    memoryEntries: number;
    exportsPerMonth: number;
  };
  rateLimits: {
    requestsPerMin: number;
    requestsPerDay: number;
    concurrentRequests: number;
  };
  features: Record<string, boolean>;
  overageBehavior: OverageBehavior;
  overagePricing: {
    inputTokensPerMillion: number;
    outputTokensPerMillion: number;
    cacheReadsPerMillion: number;
  };
  softCap: number;
  hardCap: number;
  rolloverCredits: boolean;
}

export interface Subscription {
  id: string;
  userId: string;
  tierId: TierId;
  period: BillingPeriod;
  status: SubscriptionStatus;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  canceledAt?: string;
  cancelAtPeriodEnd: boolean;
  trialEndsAt?: string;
  trialStart?: string;
  paymentFailedAt?: string;
  paymentFailureCount: number;
  gracePeriodEndsAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UsageEvent {
  id: string;
  userId: string;
  type: UsageEventType;
  provider: ProviderName;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  estimatedProviderCost: number;
  estimatedRevenue: number;
  latencyMs: number;
  projectId?: string;
  sessionId?: string;
  featureUsed?: string;
  streamed: boolean;
  toolCalls: number;
  imageCount: number;
  createdAt: string;
}

export interface ProviderUsageRecord {
  id: string;
  userId: string;
  subscriptionId: string;
  billingPeriod: string;
  provider: ProviderName;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  totalRequests: number;
  totalCost: number;
  totalRevenue: number;
  createdAt: string;
  updatedAt: string;
}

export interface TokenUsageRecord {
  id: string;
  userId: string;
  date: string;
  tierId: TierId;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  aiRequests: number;
}

export interface OverageCharge {
  id: string;
  userId: string;
  subscriptionId: string;
  billingPeriod: string;
  type: TokenType;
  overageUnits: number;
  ratePerUnit: number;
  amountCents: number;
  currency: string;
  status: 'pending' | 'invoiced' | 'paid' | 'waived';
  createdAt: string;
  paidAt?: string;
}

export interface Invoice {
  id: string;
  userId: string;
  subscriptionId: string;
  stripeInvoiceId?: string;
  periodStart: string;
  periodEnd: string;
  baseAmountCents: number;
  overageAmountCents: number;
  creditsAppliedCents: number;
  totalCents: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
  paidAt?: string;
  pdfUrl?: string;
  createdAt: string;
}

export interface CreditBalance {
  id: string;
  userId: string;
  balanceCents: number;
  lifetimeCreditsCents: number;
  lifetimeUsageCents: number;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProfitMetrics {
  id: string;
  userId: string;
  billingPeriod: string;
  tierId: TierId;
  revenueCents: number;
  providerSpendCents: number;
  grossProfitCents: number;
  grossMarginPct: number;
  projectedMonthlyCostCents: number;
  overageRisk: 'low' | 'medium' | 'high';
  highBurn: boolean;
  createdAt: string;
}

export interface MarginSnapshot {
  id: string;
  snapshotDate: string;
  totalRevenueCents: number;
  totalProviderSpendCents: number;
  totalGrossProfitCents: number;
  overallMarginPct: number;
  activeUsers: number;
  topBurnUsers: Array<{ userId: string; spendCents: number }>;
  tierBreakdown: Record<TierId, { userCount: number; revenueCents: number; spendCents: number }>;
  providerBreakdown: Record<ProviderName, { spendCents: number; requestCount: number }>;
  createdAt: string;
}

export interface StripeCustomer {
  id: string;
  userId: string;
  stripeCustomerId: string;
  paymentMethodBrand?: string;
  paymentMethodLast4?: string;
  defaultPaymentMethodId?: string;
  createdAt: string;
}

export interface TokenBudget {
  id: string;
  userId: string;
  tierId: TierId;
  monthlyInputTokenBudget: number;
  monthlyOutputTokenBudget: number;
  dailyInputLimit: number;
  dailyOutputLimit: number;
  softWarningThreshold: number;
  hardCapEnabled: boolean;
  notificationsEnabled: boolean;
  notificationSentAt?: string;
}

export interface UsageForecast {
  userId: string;
  tierId: TierId;
  periodStart: string;
  estimatedMonthEndTokens: { input: number; output: number };
  burnRate: { dailyTokens: number; trendDays: number };
  tierMismatch: boolean;
  recommendedTier?: TierId;
  upgradeSavingsCents?: number;
  projectedOverageCents: number;
}

export interface FeatureAccessMap {
  'basic-chat': boolean;
  'basic-graph': boolean;
  'basic-memory': boolean;
  'basic-quests': boolean;
  'focus-sessions': boolean;
  'skill-web': boolean;
  'data-export': boolean;
  'advanced-graph': boolean;
  'ai-assist-deep': boolean;
  'long-term-memory': boolean;
  'multi-agent': boolean;
  'export-systems': boolean;
  'advanced-reasoning': boolean;
  'api-access': boolean;
}

export const TIER_ORDER: TierId[] = ['free', 'starter', 'pro', 'power'];

export function tierRank(tierId: TierId): number {
  return TIER_ORDER.indexOf(tierId);
}
