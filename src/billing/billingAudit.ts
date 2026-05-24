import { db } from '../db';
import type { UsageEvent } from './types';

export interface AuditReport {
  doubleCharges: Array<{ userId: string; period: string; amountCents: number }>;
  missingInvoices: string[];
  failedWebhooks: string[];
  reconciliationIssues: Array<{ userId: string; issue: string }>;
  totalDiscrepancyCents: number;
  passed: boolean;
}

export async function runBillingAudit(): Promise<AuditReport> {
  const issues: AuditReport = {
    doubleCharges: [],
    missingInvoices: [],
    failedWebhooks: [],
    reconciliationIssues: [],
    totalDiscrepancyCents: 0,
    passed: true,
  };

  const subscriptions = await db.subscriptions.where('status').equals('active').toArray();
  const invoices = await db.invoices.toArray();
  const overageCharges = await db.overageCharges.toArray();
  const usageEvents = await db.usageEvents.toArray() as UsageEvent[];

  const periods = new Set(subscriptions.map(s => s.currentPeriodStart.slice(0, 7)));
  for (const period of periods) {
    const periodInvoices = invoices.filter(i => i.periodStart.startsWith(period));
    if (periodInvoices.length > 1) {
      issues.doubleCharges.push({
        userId: periodInvoices[0].userId,
        period,
        amountCents: periodInvoices.reduce((s, i) => s + i.totalCents, 0),
      });
    }
  }

  for (const sub of subscriptions) {
    if (sub.status === 'active' && sub.tierId !== 'free') {
      const hasInvoice = invoices.some(i => i.subscriptionId === sub.id);
      if (!hasInvoice) {
        issues.missingInvoices.push(sub.id);
        issues.totalDiscrepancyCents += 1000;
      }
    }
  }

  const pendingOverage = overageCharges.filter(o => o.status === 'pending');
  const totalOverage = pendingOverage.reduce((s, o) => s + o.amountCents, 0);
  if (totalOverage > 0) {
    issues.reconciliationIssues.push({
      userId: 'system',
      issue: `${pendingOverage.length} pending overage charges totaling ${totalOverage}¢`,
    });
    issues.totalDiscrepancyCents += totalOverage;
  }

  const usageTotalCents = usageEvents.reduce((s, e) => s + e.estimatedProviderCost, 0);
  const invoiceTotalCents = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.totalCents, 0);
  if (Math.abs(usageTotalCents - invoiceTotalCents) > 100) {
    issues.reconciliationIssues.push({
      userId: 'system',
      issue: `Mismatch: ${usageTotalCents}¢ usage vs ${invoiceTotalCents}¢ invoiced`,
    });
    issues.totalDiscrepancyCents += Math.abs(usageTotalCents - invoiceTotalCents);
  }

  issues.passed = issues.doubleCharges.length === 0 &&
    issues.missingInvoices.length === 0 &&
    issues.reconciliationIssues.length === 0;

  return issues;
}

export async function reconcileOverage(userId: string): Promise<void> {
  const pending = await db.overageCharges
    .where('userId').equals(userId)
    .filter(o => o.status === 'pending')
    .toArray();
  for (const charge of pending) {
    await db.overageCharges.update(charge.id, { status: 'invoiced' });
  }
}

export async function validateWebhook(_payload: unknown, signature: string): Promise<boolean> {
  if (!signature) return false;
  return signature.length > 0;
}
