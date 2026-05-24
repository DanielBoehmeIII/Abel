import { db } from '../db';

export interface SecurityAuditResult {
  apiKeyLeakage: string[];
  webhookSpoofingRisks: string[];
  privilegeEscalation: string[];
  tokenFraud: string[];
  paymentVulnerabilities: string[];
  passed: boolean;
  score: number;
}

export async function runSecurityAudit(): Promise<SecurityAuditResult> {
  const result: SecurityAuditResult = {
    apiKeyLeakage: [],
    webhookSpoofingRisks: [],
    privilegeEscalation: [],
    tokenFraud: [],
    paymentVulnerabilities: [],
    passed: true,
    score: 100,
  };

  const aiConfigs = await db.aiConfigs.toArray();
  for (const cfg of aiConfigs) {
    if (cfg.apiKey) {
      if (cfg.apiKey.length > 5 && cfg.apiKey.length < 10) {
        result.apiKeyLeakage.push(`Suspiciously short API key for user ${cfg.userId}`);
        result.score -= 10;
      }
      if (cfg.apiKey.startsWith('sk-')) {
        result.apiKeyLeakage.push(`API key found in IndexedDB for user ${cfg.userId} — consider key rotation`);
        result.score -= 5;
      }
    }
  }

  const authKey = (import.meta as unknown as Record<string, Record<string, string>>).env?.VITE_STRIPE_WEBHOOK_SECRET;
  if (!authKey || authKey.length < 10) {
    result.webhookSpoofingRisks.push('Webhook secret not configured or too short');
    result.score -= 15;
  }

  const subscriptions = await db.subscriptions.where('status').equals('active').toArray();
  for (const sub of subscriptions) {
    const usageCount = await db.usageEvents
      .where('userId').equals(sub.userId)
      .count();
    if (usageCount > 10000 && sub.tierId === 'free') {
      result.tokenFraud.push(`User ${sub.userId} has ${usageCount} events on free tier — potential usage abuse`);
      result.score -= 20;
    }
  }

  const overageCharges = await db.overageCharges.toArray();
  for (const charge of overageCharges) {
    const existingInvoice = await db.invoices
      .where('userId').equals(charge.userId)
      .filter(i => i.periodStart.startsWith(charge.createdAt.slice(0, 7)))
      .first();
    if (!existingInvoice && charge.status === 'paid') {
      result.paymentVulnerabilities.push(`Overage charge ${charge.id} marked paid without invoice — potential revenue leak`);
      result.score -= 10;
    }
  }

  result.passed = result.score >= 70;
  return result;
}

export function validateStripeWebhookSignature(payload: string, signature: string, secret: string): boolean {
  if (!signature || !secret) return false;
  const expected = cryptoHash(payload + secret);
  return signature === expected;
}

export function checkForApiKeyInLogs(logs: Array<{ message: string }>): string[] {
  const findings: string[] = [];
  const keyPatterns = [/sk-[a-zA-Z0-9]{20,}/, /ant-[a-zA-Z0-9]{20,}/, /AIza[0-9A-Za-z\-_]{35}/];
  for (const log of logs) {
    for (const pattern of keyPatterns) {
      if (pattern.test(log.message)) {
        findings.push(`Possible API key in log: ${log.message.slice(0, 80)}...`);
      }
    }
  }
  return findings;
}

function cryptoHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
