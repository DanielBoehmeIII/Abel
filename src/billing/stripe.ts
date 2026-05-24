import type { TierId, BillingPeriod, Subscription, Invoice } from './types';
import { db } from '../db';

const iso = () => new Date().toISOString();
const addMonths = (date: Date, n: number) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
};

export interface StripeCheckoutParams {
  tierId: TierId;
  period: BillingPeriod;
  userId: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
}

export interface StripeCheckoutResult {
  url: string;
  sessionId: string;
}

export interface StripePortalParams {
  userId: string;
  returnUrl: string;
}

export interface StripePortalResult {
  url: string;
}

export async function createCheckoutSession(
  params: StripeCheckoutParams,
): Promise<StripeCheckoutResult> {
  const subId = `sub-${params.userId}-${Date.now()}`;
  const now = new Date();
  const periodEnd = addMonths(now, 1);

  await db.subscriptions.put({
    id: subId,
    userId: params.userId,
    tierId: params.tierId,
    period: params.period,
    status: 'incomplete',
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: periodEnd.toISOString(),
    cancelAtPeriodEnd: false,
    paymentFailureCount: 0,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });

  return {
    url: `/billing/confirm?session=cs_${subId}`,
    sessionId: `cs_${subId}`,
  };
}

export async function handleCheckoutSuccess(sessionId: string): Promise<void> {
  const subId = sessionId.replace('cs_', '');
  const sub = await db.subscriptions.get(subId);
  if (sub) {
    await db.subscriptions.update(subId, { status: 'active', updatedAt: iso() });
  }
}

export async function handleCheckoutCancel(sessionId: string): Promise<void> {
  const subId = sessionId.replace('cs_', '');
  const sub = await db.subscriptions.get(subId);
  if (sub) {
    await db.subscriptions.update(subId, { status: 'incomplete_expired', updatedAt: iso() });
  }
}

export async function createPortalSession(): Promise<StripePortalResult> {
  return { url: `/settings?tab=billing` };
}

export async function cancelSubscription(
  subscriptionId: string,
  atPeriodEnd = true,
): Promise<void> {
  const updates: Record<string, unknown> = {
    cancelAtPeriodEnd: atPeriodEnd,
    updatedAt: iso(),
  };
  if (!atPeriodEnd) {
    updates.status = 'canceled';
    updates.canceledAt = iso();
  }
  await db.subscriptions.update(subscriptionId, updates);
}

export async function reactivateSubscription(subscriptionId: string): Promise<void> {
  await db.subscriptions.update(subscriptionId, {
    cancelAtPeriodEnd: false,
    updatedAt: iso(),
  });
}

export async function changeSubscriptionTier(
  subscriptionId: string,
  newTierId: TierId,
): Promise<void> {
  const sub = await db.subscriptions.get(subscriptionId);
  if (!sub) throw new Error('Subscription not found');
  await db.subscriptions.update(subscriptionId, {
    tierId: newTierId,
    updatedAt: iso(),
  });
}

export async function getCustomerSubscription(userId: string): Promise<Subscription | undefined> {
  return db.subscriptions
    .where('userId').equals(userId)
    .filter(s => s.status === 'active' || s.status === 'trialing' || s.status === 'past_due' || s.status === 'unpaid')
    .first();
}

export async function getAllUserSubscriptions(userId: string): Promise<Subscription[]> {
  return db.subscriptions
    .where('userId').equals(userId)
    .reverse()
    .sortBy('createdAt');
}

export async function getUserInvoices(userId: string): Promise<Invoice[]> {
  return db.invoices.where('userId').equals(userId).reverse().sortBy('createdAt');
}


