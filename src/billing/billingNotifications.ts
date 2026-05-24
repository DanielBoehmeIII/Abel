export interface BillingNotification {
  type: 'receipt' | 'usage_alert' | 'renewal' | 'payment_failed' | 'upgrade' | 'trial_ending' | 'overage_warning';
  userId: string;
  email: string;
  subject: string;
  body: string;
  sentAt?: string;
}

export function generateReceipt(params: {
  userName: string;
  email: string;
  amountCents: number;
  planName: string;
  periodStart: string;
  periodEnd: string;
  invoiceId: string;
}): BillingNotification {
  return {
    type: 'receipt',
    userId: params.userName,
    email: params.email,
    subject: `Your Abel receipt — ${params.planName}`,
    body: [
      `Hi ${params.userName},`,
      '',
      `Thank you for your payment of $${(params.amountCents / 100).toFixed(2)} for ${params.planName}.`,
      `Period: ${params.periodStart.slice(0, 10)} to ${params.periodEnd.slice(0, 10)}`,
      `Invoice: ${params.invoiceId}`,
      '',
      '— Abel Billing',
    ].join('\n'),
  };
}

export function generateUsageAlert(params: {
  userName: string;
  email: string;
  usagePct: number;
  planName: string;
  tierId: string;
}): BillingNotification {
  return {
    type: 'usage_alert',
    userId: params.userName,
    email: params.email,
    subject: `Usage alert — you've used ${params.usagePct}% of your ${params.planName} plan`,
    body: `Hi ${params.userName},\n\nYou've used ${params.usagePct}% of your included ${params.planName} usage. Consider upgrading to avoid overage charges.\n\n— Abel Billing`,
  };
}

export function generateRenewalReminder(params: {
  userName: string;
  email: string;
  planName: string;
  renewAmountCents: number;
  daysUntilRenewal: number;
}): BillingNotification {
  return {
    type: 'renewal',
    userId: params.userName,
    email: params.email,
    subject: `Your Abel plan renews in ${params.daysUntilRenewal} days`,
    body: `Hi ${params.userName},\n\nYour ${params.planName} plan will renew at $${(params.renewAmountCents / 100).toFixed(2)} in ${params.daysUntilRenewal} days.\n\n— Abel Billing`,
  };
}

export function generatePaymentFailed(params: {
  userName: string;
  email: string;
  amountCents: number;
  retryDate: string;
}): BillingNotification {
  return {
    type: 'payment_failed',
    userId: params.userName,
    email: params.email,
    subject: 'Payment failed — update your billing info',
    body: `Hi ${params.userName},\n\nYour payment of $${(params.amountCents / 100).toFixed(2)} failed. We'll retry on ${params.retryDate}. Please update your payment method.\n\n— Abel Billing`,
  };
}

export function generateUpgradeConfirmation(params: {
  userName: string;
  email: string;
  newPlan: string;
  oldPlan: string;
  proratedCents: number;
}): BillingNotification {
  return {
    type: 'upgrade',
    userId: params.userName,
    email: params.email,
    subject: `Welcome to ${params.newPlan}!`,
    body: `Hi ${params.userName},\n\nYou've been upgraded from ${params.oldPlan} to ${params.newPlan}. Prorated charge: $${(params.proratedCents / 100).toFixed(2)}.\n\n— Abel Billing`,
  };
}

export function generateTrialEnding(params: {
  userName: string;
  email: string;
  daysRemaining: number;
}): BillingNotification {
  return {
    type: 'trial_ending',
    userId: params.userName,
    email: params.email,
    subject: `Your trial ends in ${params.daysRemaining} days`,
    body: `Hi ${params.userName},\n\nYour free trial ends in ${params.daysRemaining} days. Choose a plan to keep using Abel with full access.\n\n— Abel Billing`,
  };
}

export function generateOverageWarning(params: {
  userName: string;
  email: string;
  overageCents: number;
  projectedTotal: number;
}): BillingNotification {
  return {
    type: 'overage_warning',
    userId: params.userName,
    email: params.email,
    subject: 'Overage warning — projected charges exceed your plan',
    body: `Hi ${params.userName},\n\nYour projected overage is $${(params.overageCents / 100).toFixed(2)}. Upgrade to avoid additional charges.\n\n— Abel Billing`,
  };
}
