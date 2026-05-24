import { describe, it, expect } from 'vitest';
import { TIERS, getFeatureAccess, annualSavingsPct } from '../billing/tiers';
import { calculateCost, calculateOverageCost, getPricing } from '../billing/pricing';
import { computeIncludedUsageRemaining } from '../billing/costEngine';
import { createTokenBudget } from '../billing/tokenBudget';
import { getRequiredTier, getUpgradeSuggestions } from '../billing/featureGating';
import { estimateTokens } from '../billing/providerAbstraction';
import { validateStripeWebhookSignature, checkForApiKeyInLogs } from '../billing/securityAudit';
import { isCacheable } from '../billing/cacheManager';
import { tierRank } from '../billing/types';

// ─── Tier & Pricing Tests ─────────────────────────────────────────────────────

describe('Tier Definitions', () => {
  it('has all 4 tier IDs defined', () => {
    (['free', 'starter', 'pro', 'power'] as const).forEach(id => {
      expect(TIERS[id]).toBeDefined();
      expect(TIERS[id].id).toBe(id);
    });
  });

  it('free tier has zero price and block overage', () => {
    expect(TIERS.free.price.monthly).toBe(0);
    expect(TIERS.free.overageBehavior).toBe('block');
  });

  it('starter tier costs $12/mo with 1M input tokens', () => {
    expect(TIERS.starter.price.monthly).toBe(1200);
    expect(TIERS.starter.includedUsage.inputTokens).toBe(1_000_000);
  });

  it('pro tier has higher limits than starter', () => {
    expect(TIERS.pro.price.monthly).toBeGreaterThan(TIERS.starter.price.monthly);
    expect(TIERS.pro.includedUsage.inputTokens).toBeGreaterThan(TIERS.starter.includedUsage.inputTokens);
  });
});

describe('Feature Access', () => {
  it('free tier has basic features only', () => {
    const f = getFeatureAccess('free');
    expect(f['basic-chat']).toBe(true);
    expect(f['basic-quests']).toBe(true);
    expect(f['advanced-reasoning']).toBe(false);
    expect(f['focus-sessions']).toBe(false);
  });

  it('pro tier has advanced features', () => {
    const f = getFeatureAccess('pro');
    expect(f['advanced-graph']).toBe(true);
    expect(f['ai-assist-deep']).toBe(true);
    expect(f['advanced-reasoning']).toBe(true);
  });

  it('power tier has advanced features', () => {
    const f = getFeatureAccess('power');
    expect(f['multi-agent']).toBe(true);
    expect(f['export-systems']).toBe(true);
    expect(f['api-access']).toBe(true);
  });
});

// ─── Cost Calculation Tests ──────────────────────────────────────────────────

describe('Cost Calculation', () => {
  it('calculates basic chat cost for Claude Sonnet in cents', () => {
    const cost = calculateCost('claude-sonnet-4-20250514', 500, 300, 0, 0, 0, 0);
    expect(cost).toBeCloseTo(0.6, 1);
  });

  it('local model costs zero', () => {
    expect(calculateCost('local', 100000, 50000, 0, 0, 0, 0)).toBe(0);
  });

  it('handles image and tool costs', () => {
    const base = calculateCost('claude-sonnet-4-20250514', 500, 300, 0, 0, 0, 0);
    const withExtras = calculateCost('claude-sonnet-4-20250514', 500, 300, 0, 0, 3, 5);
    expect(withExtras).toBeGreaterThan(base);
  });
});

describe('Overage Cost', () => {
  it('calculates overage cost for starter output', () => {
    const overage = calculateOverageCost('starter', 'output', 100000);
    expect(overage).toBe(150);
  });

  it('calculates overage cost for free tier (zero rate)', () => {
    expect(calculateOverageCost('free', 'output', 100000)).toBe(0);
  });
});

describe('Provider Pricing', () => {
  it('returns correct pricing for Claude Sonnet', () => {
    const p = getPricing('claude-sonnet-4-20250514');
    expect(p.inputPerMillion).toBe(300);
    expect(p.outputPerMillion).toBe(1500);
  });

  it('falls back to default for unknown models', () => {
    expect(getPricing('unknown-model')).toBeDefined();
  });
});

// ─── Type Tests ──────────────────────────────────────────────────────────────

describe('Type System', () => {
  it('tier ranking is correct', () => {
    expect(tierRank('free')).toBe(0);
    expect(tierRank('starter')).toBe(1);
    expect(tierRank('pro')).toBe(2);
    expect(tierRank('power')).toBe(3);
  });
});

// ─── Annual Savings Tests ────────────────────────────────────────────────────

describe('Annual Savings', () => {
  it('free tier has 0% savings', () => expect(annualSavingsPct('free')).toBe(0));
  it('starter tier has >0% savings', () => expect(annualSavingsPct('starter')).toBeGreaterThan(0));
  it('pro tier has >0% savings', () => expect(annualSavingsPct('pro')).toBeGreaterThan(0));
});

// ─── Usage Tracking Tests ─────────────────────────────────────────────────────

describe('Usage Tracking', () => {
  it('computes remaining usage for free tier', () => {
    const r = computeIncludedUsageRemaining('free', { inputTokens: 30000, outputTokens: 10000, cacheReadTokens: 5000 });
    expect(r.inputTokensRemaining).toBe(70000);
    expect(r.outputTokensRemaining).toBe(40000);
    expect(r.cacheReadsRemaining).toBe(20000);
  });

  it('handles exceeded usage capped at 100%', () => {
    const r = computeIncludedUsageRemaining('free', { inputTokens: 300000, outputTokens: 100000, cacheReadTokens: 50000 });
    expect(r.inputTokensRemaining).toBe(0);
    expect(r.inputPct).toBe(100);
  });
});

// ─── Token Budget Tests ──────────────────────────────────────────────────────

describe('Token Budget', () => {
  it('creates budget for pro tier', () => {
    const budget = createTokenBudget('user', 'pro');
    expect(budget.tierId).toBe('pro');
    expect(budget.monthlyInputTokenBudget).toBeGreaterThan(0);
  });
});

// ─── Feature Gating Tests ────────────────────────────────────────────────────

describe('Feature Gating', () => {
  it('gets required tier for features', () => {
    expect(getRequiredTier('basic-chat')).toBe('starter');
    expect(getRequiredTier('advanced-reasoning')).toBe('pro');
    expect(getRequiredTier('api-access')).toBe('power');
  });

  it('provides upgrade suggestions for free users', () => {
    const suggestions = getUpgradeSuggestions('free');
    expect(suggestions.length).toBeGreaterThan(0);
  });
});

// ─── Token Estimation Tests ──────────────────────────────────────────────────

describe('Token Estimation', () => {
  it('estimates tokens from text', () => {
    const tokens = estimateTokens('Hello, this is a test message for token estimation.');
    expect(tokens).toBeGreaterThan(0);
    expect(tokens).toBeLessThan(50);
  });
});

// ─── API Key Masking Tests ───────────────────────────────────────────────────

describe('API Key Masking', () => {
  function maskKey(key: string): string {
    if (!key || key.length < 8) return key;
    const prefix = key.startsWith('sk-') ? 'sk-' : key.slice(0, 4);
    const suffix = key.slice(-4);
    return `${prefix}${'•'.repeat(Math.min(key.length - prefix.length - 4, 16))}${suffix}`;
  }

  it('masks OpenAI API keys', () => {
    const masked = maskKey('sk-proj-abc123def456ghijklmnopqr');
    expect(masked).toContain('sk-');
    expect(masked).toContain('••••');
    expect(masked).not.toContain('proj-abc123def456ghijklmno');
  });

  it('masks Anthropic API keys', () => {
    expect(maskKey('sk-ant-api03-testkey1234567890-A')).toContain('••••');
  });

  it('returns short keys unchanged', () => expect(maskKey('short')).toBe('short'));
  it('handles empty keys', () => expect(maskKey('')).toBe(''));
  it('never reveals full key', () => {
    const fullKey = 'sk-abcdefghijklmnopqrstuvwxyz1234567890';
    expect(maskKey(fullKey)).not.toBe(fullKey);
    expect(maskKey(fullKey).length).toBeLessThan(fullKey.length);
  });
});

// ─── Security Audit Tests ────────────────────────────────────────────────────

describe('Security Audit', () => {
  it('validates webhook signature returns boolean', () => {
    expect(typeof validateStripeWebhookSignature('payload', 'sig', 'secret')).toBe('boolean');
  });

  it('rejects empty signature', () => {
    expect(validateStripeWebhookSignature('payload', '', 'secret')).toBe(false);
  });

  it('detects API keys in logs', () => {
    const logs = [
      { message: 'key: sk-ABCDEFGHIJKLMNOPQRST0123456789' },
      { message: 'normal log' },
      { message: 'key: ant-ABCDEFGHIJKLMNOPQRST0123456789' },
    ];
    expect(checkForApiKeyInLogs(logs).length).toBeGreaterThanOrEqual(2);
  });

  it('does not flag clean logs', () => {
    expect(checkForApiKeyInLogs([{ message: 'clean log' }]).length).toBe(0);
  });
});

// ─── Cache Manager Tests ─────────────────────────────────────────────────────

describe('Cache Manager', () => {
  it('non-streamed chat is cacheable', () => {
    expect(isCacheable({ type: 'chat', streamed: false, toolCalls: 0, imageCount: 0 })).toBe(true);
  });

  it('streamed chat is not cacheable', () => {
    expect(isCacheable({ type: 'chat', streamed: true, toolCalls: 0, imageCount: 0 })).toBe(false);
  });
});
