import { useState, useEffect, useCallback } from 'react';
import type { TierId, Subscription, UsageEvent, SetupMode } from '../../billing/types';
import { TIERS, TIER_ORDER } from '../../billing';
import {
  getCustomerSubscription, changeSubscriptionTier,
  cancelSubscription, reactivateSubscription,
  createCheckoutSession, createPortalSession,
} from '../../billing/stripe';
import {
  getUsageForPeriod, getTotalUsageThisPeriod,
} from '../../billing/usageTracker';
import { generateForecast } from '../../billing/forecast';
import { createTokenBudget } from '../../billing/tokenBudget';
import { TierCard } from './TierCard';
import { UsageDashboard } from './UsageDashboard';
import GlassPanel from '../common/GlassPanel';
import GlowButton from '../common/GlowButton';

interface BillingSectionProps {
  userId: string;
  setupMode?: SetupMode;
  onSetupModeChange?: (mode: SetupMode) => void;
}

async function fetchBillingData(userId: string) {
  const sub = await getCustomerSubscription(userId);
  const periodStart = sub?.currentPeriodStart ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [period, events] = await Promise.all([
    getTotalUsageThisPeriod(userId, periodStart),
    getUsageForPeriod(userId, periodStart),
  ]);
  const forecast = await generateForecast(userId, sub?.tierId ?? 'free', periodStart);
  return { sub, period, events, forecast };
}

const SETUP_MODE_DESCRIPTIONS: Record<SetupMode, { title: string; desc: string; icon: string; warning?: string }> = {
  subscription: {
    title: 'Abel-Managed Subscription',
    desc: 'Monthly billing through Stripe. Includes managed AI usage, tier limits, and overage protection.',
    icon: '◉',
  },
  local: {
    title: 'Local Provider Setup',
    desc: 'Use your own local AI model. No Abel-managed usage billing.',
    icon: '⬡',
    warning: 'Performance depends on your hardware and local provider. Not recommended for production use.',
  },
  manual: {
    title: 'Manual API Keys',
    desc: 'Bring your own Claude, OpenAI, or Gemini API key. You are responsible for provider costs.',
    icon: '◇',
    warning: 'You are responsible for all API provider costs. Usage is not metered by Abel.',
  },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export function BillingSection({ userId, setupMode = 'subscription', onSetupModeChange }: BillingSectionProps) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usagePeriod, setUsagePeriod] = useState({ inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 });
  const [todayUsage] = useState({ inputTokens: 0, outputTokens: 0 });
  const [recentEvents, setRecentEvents] = useState<UsageEvent[]>([]);
  const [forecast, setForecast] = useState<import('../../billing/types').UsageForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [portalUrl, setPortalUrl] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchBillingData(userId).then(({ sub, period, events, forecast }) => {
      if (cancelled) return;
      setSubscription(sub ?? null);
      setUsagePeriod(period);
      setRecentEvents(events);
      setForecast(forecast);
    }).catch(e => {
      if (cancelled) return;
      setError(e instanceof Error ? e.message : 'Failed to load billing data');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [userId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { sub, period, events, forecast } = await fetchBillingData(userId);
      setSubscription(sub ?? null);
      setUsagePeriod(period);
      setRecentEvents(events);
      setForecast(forecast);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load billing data');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const currentTierId: TierId = subscription?.tierId ?? 'free';

  const handleTierSelect = async (tierId: TierId) => {
    if (tierId === currentTierId) return;
    try {
      if (subscription) {
        await changeSubscriptionTier(subscription.id, tierId);
      }
      const session = await createCheckoutSession({
        tierId, period: 'monthly', userId,
        successUrl: window.location.href,
        cancelUrl: window.location.href,
      });
      setStatusMessage(`Checkout session created: ${session.sessionId}`);
      await loadData();
    } catch {
      setError('Failed to update plan');
    }
  };

  const handleCancel = async () => {
    if (!subscription) return;
    try {
      await cancelSubscription(subscription.id);
      await loadData();
      setConfirmCancel(false);
      setStatusMessage('Subscription will cancel at period end');
    } catch {
      setError('Failed to cancel subscription');
    }
  };

  const handleReactivate = async () => {
    if (!subscription) return;
    try {
      await reactivateSubscription(subscription.id);
      await loadData();
      setStatusMessage('Subscription reactivated');
    } catch {
      setError('Failed to reactivate subscription');
    }
  };

  const handlePortal = async () => {
    const result = await createPortalSession();
    setPortalUrl(result.url);
    window.open(result.url, '_blank');
  };

  const budget = createTokenBudget(userId, currentTierId);
  const modeInfo = SETUP_MODE_DESCRIPTIONS[setupMode];
  const subActive = subscription?.status === 'active' || subscription?.status === 'trialing';
  const isCanceled = subscription?.status === 'canceled';
  const isPastDue = subscription?.status === 'past_due' || subscription?.status === 'unpaid';

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
        Loading billing...
      </div>
    );
  }

  return (
    <div className="billing-section" style={{ maxWidth: 900, margin: '0 auto' }}>
      {error && (
        <div className="glass" style={{ padding: '12px 16px', marginBottom: 16, border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, fontSize: 12, color: '#ef4444' }}>
          {error}
        </div>
      )}

      {statusMessage && (
        <div className="glass" style={{ padding: '12px 16px', marginBottom: 16, border: '1px solid rgba(34,211,238,0.2)', borderRadius: 10, fontSize: 12, color: '#22d3ee' }}>
          {statusMessage}
          <button onClick={() => setStatusMessage('')} style={{ marginLeft: 12, background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 11 }}>dismiss</button>
        </div>
      )}

      {/* Setup Mode Display */}
      <GlassPanel style={{ padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 22, color: 'rgba(34,211,238,0.6)' }}>{modeInfo.icon}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 2 }}>
                {modeInfo.title}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
                {modeInfo.desc}
              </div>
              {modeInfo.warning && (
                <div style={{ marginTop: 6, fontSize: 11, color: 'rgba(240,192,64,0.7)', lineHeight: 1.4 }}>
                  ⚠ {modeInfo.warning}
                </div>
              )}
            </div>
          </div>

          {onSetupModeChange && (
            <select
              value={setupMode}
              onChange={e => onSetupModeChange(e.target.value as SetupMode)}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.7)',
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              <option value="subscription">Abel-managed subscription</option>
              <option value="local">Local setup</option>
              <option value="manual">Manual API keys</option>
            </select>
          )}
        </div>
      </GlassPanel>

      {/* Subscription Status */}
      {setupMode === 'subscription' && (
        <GlassPanel style={{ padding: '20px 24px', marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', marginBottom: 12, textTransform: 'uppercase' }}>
            Subscription Status
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 14 }}>
            <StatusField label="Plan" value={TIERS[currentTierId]?.name ?? 'Free'} />
            <StatusField
              label="Status"
              value={subscription?.status ?? 'no subscription'}
              color={isPastDue ? '#ef4444' : isCanceled ? 'rgba(255,255,255,0.4)' : '#34d399'}
            />
            {subscription?.currentPeriodEnd && (
              <StatusField label="Renewal Date" value={formatDate(subscription.currentPeriodEnd)} />
            )}
            {subscription?.cancelAtPeriodEnd && (
              <StatusField label="Cancels At" value={formatDate(subscription.currentPeriodEnd ?? '')} color="#fbbf24" />
            )}
            {subscription?.paymentFailureCount && subscription.paymentFailureCount > 0 && (
              <StatusField label="Failed Payments" value={String(subscription.paymentFailureCount)} color="#ef4444" />
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {subActive && !subscription?.cancelAtPeriodEnd && (
              <GlowButton variant="danger" size="sm" onClick={() => setConfirmCancel(true)}>
                Cancel at Period End
              </GlowButton>
            )}
            {subActive && subscription?.cancelAtPeriodEnd && (
              <GlowButton variant="cyan" size="sm" onClick={handleReactivate}>
                Reactivate Subscription
              </GlowButton>
            )}
            {subActive && (
              <GlowButton variant="ghost" size="sm" onClick={handlePortal}>
                Open Stripe Portal
              </GlowButton>
            )}
          </div>

          {confirmCancel && (
            <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: 'rgba(239,68,68,0.8)' }}>Cancel at end of billing period?</span>
              <GlowButton variant="danger" size="sm" onClick={handleCancel}>Confirm Cancel</GlowButton>
              <GlowButton variant="ghost" size="sm" onClick={() => setConfirmCancel(false)}>Keep Plan</GlowButton>
            </div>
          )}

          {portalUrl && (
            <div style={{ marginTop: 10, fontSize: 11, color: 'rgba(34,211,238,0.6)' }}>
              Portal URL: {portalUrl}
            </div>
          )}
        </GlassPanel>
      )}

      {/* Usage Dashboard */}
      <UsageDashboard
        tierId={currentTierId}
        usageThisPeriod={usagePeriod}
        todayUsage={todayUsage}
        budget={budget}
        recentEvents={recentEvents}
        loading={false}
      />

      {/* Forecast */}
      {forecast && (
        <GlassPanel style={{ padding: '20px 24px', margin: '16px 0' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', marginBottom: 12, textTransform: 'uppercase' }}>
            Monthly Forecast
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 14 }}>
            <StatusField label="Est. Input" value={formatTokenShort(forecast.estimatedMonthEndTokens.input)} />
            <StatusField label="Est. Output" value={formatTokenShort(forecast.estimatedMonthEndTokens.output)} />
            <StatusField label="Daily Burn" value={formatTokenShort(forecast.burnRate.dailyTokens)} />
            <StatusField label="Trend Days" value={`${forecast.burnRate.trendDays}d`} />
          </div>
          {forecast.tierMismatch && forecast.recommendedTier && (
            <div style={{ padding: '8px 12px', background: 'rgba(251,191,36,0.08)', borderRadius: 8, border: '1px solid rgba(251,191,36,0.15)', fontSize: 11, color: '#fbbf24' }}>
              Usage pattern suggests upgrading to {TIERS[forecast.recommendedTier]?.name ?? forecast.recommendedTier}.
              {forecast.upgradeSavingsCents && forecast.upgradeSavingsCents > 0
                ? ` Could save ~$${(forecast.upgradeSavingsCents / 100).toFixed(2)}/mo in overage costs.`
                : ''}
            </div>
          )}
          {forecast.projectedOverageCents > 0 && (
            <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
              Projected overage: ${(forecast.projectedOverageCents / 100).toFixed(2)}
            </div>
          )}
        </GlassPanel>
      )}

      {/* Plan Selection */}
      {setupMode === 'subscription' && (
        <div style={{ marginTop: 24 }}>
          <div style={{
            fontSize: 11, fontWeight: 600,
            color: 'rgba(255,255,255,0.35)',
            letterSpacing: '0.08em', marginBottom: 16,
            textTransform: 'uppercase',
          }}>
            Available Plans
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(225px, 1fr))', gap: 16 }}>
            {TIER_ORDER.map(tierId => (
              <TierCard
                key={tierId}
                tier={TIERS[tierId]}
                currentTierId={currentTierId}
                onSelect={(tid) => handleTierSelect(tid)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Local / Manual Info */}
      {(setupMode === 'local' || setupMode === 'manual') && (
        <GlassPanel style={{ padding: '20px 24px', marginTop: 20 }}>
          <div style={{
            fontSize: 11, fontWeight: 600,
            color: 'rgba(255,255,255,0.35)',
            letterSpacing: '0.08em', marginBottom: 12,
            textTransform: 'uppercase',
          }}>
            {setupMode === 'local' ? 'Local Provider Configuration' : 'Manual API Configuration'}
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, margin: 0 }}>
            {setupMode === 'local'
              ? 'Abel uses your local AI provider (e.g. Ollama). No usage is billed through Abel. '
              : 'Abel sends requests directly to your configured API provider. '
            }
            {setupMode === 'manual' && 'Store your API keys in the LLM Provider section of Settings.'}
            You can switch to an Abel-managed subscription at any time to access tiered pricing, usage tracking, and overage protection.
          </p>
          {setupMode === 'manual' && (
            <div style={{ marginTop: 12, fontSize: 11, color: 'rgba(240,192,64,0.7)', lineHeight: 1.4 }}>
              ⚠ API keys are stored in your browser's IndexedDB. Never share your keys.
            </div>
          )}
        </GlassPanel>
      )}
    </div>
  );
}

function StatusField({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em', marginBottom: 3, textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: color ?? 'rgba(255,255,255,0.8)' }}>
        {value}
      </div>
    </div>
  );
}

function formatTokenShort(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}
