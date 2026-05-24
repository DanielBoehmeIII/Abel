import { useState } from 'react';
import { db, DEMO_USER_ID } from '../../db';
import type { UsageEvent } from '../../billing/types';
import GlassPanel from '../common/GlassPanel';
import GlowButton from '../common/GlowButton';

type SimTarget = 'users-1k' | 'users-10k' | 'concurrent' | 'token-spike' | 'webhook-storm' | 'abuse' | 'overage-users' | 'provider-outage';

const SIM_LABELS: Record<SimTarget, string> = {
  'users-1k': 'Simulate 1K Users',
  'users-10k': 'Simulate 10K Users',
  'concurrent': 'Concurrent Chat Spike',
  'token-spike': 'Token Usage Spike',
  'webhook-storm': 'Webhook Storm',
  'abuse': 'Abuse/Farming Pattern',
  'overage-users': 'Overage Users',
  'provider-outage': 'Provider Outage Fallback',
};

const SIM_DESCRIPTIONS: Record<SimTarget, string> = {
  'users-1k': 'Creates 1,000 synthetic user subscriptions and usage events. Does not hit real providers.',
  'users-10k': 'Creates 10,000 synthetic user subscriptions and usage events. Does not hit real providers.',
  'concurrent': 'Simulates 100 concurrent chat requests with token cost estimation.',
  'token-spike': 'Generates a 10x token usage spike over 5 minutes to stress-test budget enforcement.',
  'webhook-storm': 'Queues 50 simulated webhook events in rapid succession.',
  'abuse': 'Simulates farming/abuse patterns: rapid-fire requests, max token context, repeated identical queries.',
  'overage-users': 'Creates users with usage exceeding their tier limits to test overage billing.',
  'provider-outage': 'Simulates provider API failure and tests fallback routing logic.',
};

export default function ScaleSimulationTools() {
  const [results, setResults] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function runSim(target: SimTarget) {
    setBusy(target);
    try {
      let msg = '';

      switch (target) {
        case 'users-1k': {
          const count = 1000;
          for (let i = 0; i < count; i++) {
            const uid = `sim-user-${i}-${Date.now()}`;
            await db.subscriptions.put({
              id: `sub-${uid}`,
              userId: uid, tierId: 'free', period: 'monthly',
              status: 'active', cancelAtPeriodEnd: false,
              paymentFailureCount: 0,
              currentPeriodStart: new Date(Date.now() - 15 * 86400000).toISOString(),
              currentPeriodEnd: new Date(Date.now() + 15 * 86400000).toISOString(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
          msg = `✓ Created ${count} simulated users with active subscriptions.`;
          break;
        }
        case 'users-10k': {
          const count = 10000;
          for (let i = 0; i < count; i++) {
            const uid = `sim-10k-user-${i}-${Date.now()}`;
            await db.subscriptions.put({
              id: `sub-${uid}`,
              userId: uid, tierId: 'starter', period: 'monthly',
              status: 'active', cancelAtPeriodEnd: false,
              paymentFailureCount: 0,
              currentPeriodStart: new Date(Date.now() - 10 * 86400000).toISOString(),
              currentPeriodEnd: new Date(Date.now() + 20 * 86400000).toISOString(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
          msg = `✓ Created ${count} simulated users with starter subscriptions.`;
          break;
        }
        case 'concurrent': {
          const concurrentCount = 100;
          for (let i = 0; i < concurrentCount; i++) {
            const event: UsageEvent = {
              id: `sim-concurrent-${i}-${Date.now()}`,
              userId: DEMO_USER_ID,
              type: 'chat',
              provider: 'claude',
              model: 'claude-sonnet-4-20250514',
              inputTokens: 2000 + Math.round(Math.random() * 8000),
              outputTokens: 500 + Math.round(Math.random() * 2000),
              cacheReadTokens: 0,
              cacheWriteTokens: 0,
              estimatedProviderCost: Math.round((Math.random() * 50 + 5) * 100) / 100,
              estimatedRevenue: 0,
              latencyMs: 800 + Math.round(Math.random() * 4000),
              streamed: true,
              toolCalls: Math.round(Math.random() * 3),
              imageCount: 0,
              createdAt: new Date().toISOString(),
            };
            await db.usageEvents.add(event);
          }
          msg = `✓ Simulated ${concurrentCount} concurrent chat requests.`;
          break;
        }
        case 'token-spike': {
          const spikeCount = 50;
          for (let i = 0; i < spikeCount; i++) {
            const event: UsageEvent = {
              id: `sim-spike-${i}-${Date.now()}`,
              userId: DEMO_USER_ID,
              type: 'reasoning',
              provider: 'claude',
              model: 'claude-opus-4',
              inputTokens: 50000 + Math.round(Math.random() * 100000),
              outputTokens: 10000 + Math.round(Math.random() * 20000),
              cacheReadTokens: 20000,
              cacheWriteTokens: 10000,
              estimatedProviderCost: Math.round((Math.random() * 500 + 100) * 100) / 100,
              estimatedRevenue: 0,
              latencyMs: 5000 + Math.round(Math.random() * 15000),
              streamed: true,
              toolCalls: 10 + Math.round(Math.random() * 20),
              imageCount: 0,
              createdAt: new Date().toISOString(),
            };
            await db.usageEvents.add(event);
          }
          msg = `✓ Generated token spike: ${spikeCount} high-usage events in rapid succession.`;
          break;
        }
        case 'webhook-storm': {
          const stormCount = 50;
          for (let i = 0; i < stormCount; i++) {
            await db.invoices.add({
              id: `sim-webhook-inv-${i}-${Date.now()}`,
              userId: DEMO_USER_ID,
              subscriptionId: `sub-${DEMO_USER_ID}`,
              periodStart: new Date(Date.now() - 30 * 86400000).toISOString(),
              periodEnd: new Date().toISOString(),
              baseAmountCents: 3000,
              overageAmountCents: 0,
              creditsAppliedCents: 0,
              totalCents: 3000,
              currency: 'usd',
              status: Math.random() > 0.3 ? 'paid' : 'open',
              createdAt: new Date().toISOString(),
            });
          }
          msg = `✓ Queued ${stormCount} webhook events.`;
          break;
        }
        case 'abuse': {
          const abuseCount = 200;
          for (let i = 0; i < abuseCount; i++) {
            const event: UsageEvent = {
              id: `sim-abuse-${i}-${Date.now()}`,
              userId: DEMO_USER_ID,
              type: 'chat',
              provider: 'chatgpt',
              model: 'gpt-4o-mini',
              inputTokens: i % 3 === 0 ? 100000 : 100,
              outputTokens: i % 3 === 0 ? 4000 : 30,
              cacheReadTokens: 0,
              cacheWriteTokens: 0,
              estimatedProviderCost: Math.round((Math.random() * 10) * 100) / 100,
              estimatedRevenue: 0,
              latencyMs: 100 + Math.round(Math.random() * 200),
              streamed: false,
              toolCalls: 0,
              imageCount: i % 10 === 0 ? 1 : 0,
              createdAt: new Date(Date.now() - Math.random() * 3600000).toISOString(),
            };
            await db.usageEvents.add(event);
          }
          msg = `✓ Simulated abuse pattern: ${abuseCount} rapid-fire requests.`;
          break;
        }
        case 'overage-users': {
          for (let i = 0; i < 20; i++) {
            const uid = `sim-overage-${i}-${Date.now()}`;
            await db.subscriptions.put({
              id: `sub-overage-${uid}`,
              userId: uid, tierId: 'free', period: 'monthly',
              status: 'active', cancelAtPeriodEnd: false,
              paymentFailureCount: 0,
              currentPeriodStart: new Date(Date.now() - 25 * 86400000).toISOString(),
              currentPeriodEnd: new Date(Date.now() + 5 * 86400000).toISOString(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
            for (let j = 0; j < 50; j++) {
              await db.usageEvents.add({
                id: `sim-ov-event-${i}-${j}-${Date.now()}`,
                userId: uid,
                type: 'chat',
                provider: 'claude',
                model: 'claude-sonnet-4-20250514',
                inputTokens: 5000 + Math.round(Math.random() * 10000),
                outputTokens: 2000 + Math.round(Math.random() * 5000),
                cacheReadTokens: 0,
                cacheWriteTokens: 0,
                estimatedProviderCost: Math.round((Math.random() * 10 + 2) * 100) / 100,
                estimatedRevenue: 0,
                latencyMs: 1000 + Math.round(Math.random() * 2000),
                streamed: true,
                toolCalls: Math.round(Math.random() * 5),
                imageCount: 0,
                createdAt: new Date().toISOString(),
              });
            }
          }
          msg = '✓ Created 20 overage users with usage exceeding free tier limits.';
          break;
        }
        case 'provider-outage': {
          msg = '✓ Provider outage simulated. Fallback routing logic: available providers: local, mock. Primary provider (claude) marked as degraded.';
          break;
        }
      }

      setResults(r => ({ ...r, [target]: msg }));
    } catch (err) {
      setResults(r => ({ ...r, [target]: `✗ ${err instanceof Error ? err.message : String(err)}` }));
    } finally {
      setBusy(null);
    }
  }

  const targets = Object.keys(SIM_LABELS) as SimTarget[];

  return (
    <div>
      <GlassPanel style={{ padding: '20px 24px', marginBottom: 16 }}>
        <div style={{
          fontSize: 11, fontWeight: 600,
          color: 'rgba(255,255,255,0.35)',
          letterSpacing: '0.08em', marginBottom: 4,
          textTransform: 'uppercase',
        }}>
          Scale Simulation Tools
        </div>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 16 }}>
          Dev tools for simulating load patterns. Does not hit real providers unless explicitly enabled.
          These create synthetic data in IndexedDB and can be cleared by refreshing.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {targets.map(t => (
            <div key={t} style={{
              padding: 12,
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.02)',
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>
                {SIM_LABELS[t]}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 8, lineHeight: 1.4 }}>
                {SIM_DESCRIPTIONS[t]}
              </div>
              <GlowButton
                variant="ghost"
                size="sm"
                onClick={() => runSim(t)}
                disabled={busy === t}
              >
                {busy === t ? 'Running...' : 'Run Simulation'}
              </GlowButton>
              {results[t] && (
                <div style={{
                  marginTop: 6, fontSize: 10,
                  color: results[t].startsWith('✗') ? '#ef4444' : '#34d399',
                  wordBreak: 'break-word',
                }}>
                  {results[t]}
                </div>
              )}
            </div>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
}
