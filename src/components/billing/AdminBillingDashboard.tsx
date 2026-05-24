import { useState, useEffect } from 'react';
import { db } from '../../db';
import type { ProfitMetrics, MarginSnapshot, Subscription, UsageEvent } from '../../billing/types';
import { takeMarginSnapshot, calculateProfitMetrics } from '../../billing/marginEngine';
import { computeMarginByTier } from '../../billing/profitAnalytics';
import { assessChurnRisk } from '../../billing/churnReduction';
import GlassPanel from '../common/GlassPanel';

export function AdminBillingDashboard() {
  const [snapshot, setSnapshot] = useState<MarginSnapshot | null>(null);
  const [allMetrics, setAllMetrics] = useState<ProfitMetrics[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [marginByTier, setMarginByTier] = useState<Record<string, number>>({});
  const [churnRisks, setChurnRisks] = useState<Array<{ userId: string; riskLevel: string; tier: string }>>([]);
  const [cacheSavings, setCacheSavings] = useState(0);
  const [totalOverageRevenue, setTotalOverageRevenue] = useState(0);

  useEffect(() => {
    async function load() {
      const subs = await db.subscriptions.where('status').equals('active').toArray();
      const allSubs = subs;
      const events = await db.usageEvents.toArray() as UsageEvent[];
      setSubscriptions(allSubs);

      const metrics = await Promise.all(
        allSubs.map(async (sub) => {
          const userEvents = events.filter(e => e.userId === sub.userId);
          return calculateProfitMetrics(sub.userId, sub.tierId, userEvents, sub.currentPeriodStart);
        })
      );
      setAllMetrics(metrics);

      const snap = takeMarginSnapshot(metrics, events);
      setSnapshot(snap);

      const byTier = computeMarginByTier(metrics);
      setMarginByTier(byTier);

      const cacheReadEvents = events.filter(e => e.cacheReadTokens > 0);
      const cacheSavingsCents = cacheReadEvents.reduce((s, e) => {
        const readCost = (e.cacheReadTokens / 1_000_000) * 30;
        const writeCost = (e.cacheWriteTokens / 1_000_000) * 375;
        return s + readCost + writeCost;
      }, 0) / 100;
      setCacheSavings(cacheSavingsCents);

      const overageInvoices = await db.invoices.where('status').equals('paid').toArray();
      const overageRev = overageInvoices.reduce((s, inv) => s + (inv.overageAmountCents ?? 0), 0);
      setTotalOverageRevenue(overageRev);

      const risks = await Promise.all(
        allSubs.slice(0, 50).map(async sub => {
          const assessment = await assessChurnRisk(sub.userId, sub.tierId, 30);
          return { userId: sub.userId, riskLevel: assessment.riskLevel, tier: sub.tierId };
        })
      );
      setChurnRisks(risks.filter(r => r.riskLevel === 'high' || r.riskLevel === 'medium').slice(0, 10));

      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Loading admin dashboard...</div>;
  }

  const activeUsers = subscriptions.filter(s => s.status === 'active').length;
  const totalEvents = snapshot ? Object.values(snapshot.providerBreakdown).reduce((s, p) => s + p.requestCount, 0) : 0;
  const liveBurnRate = snapshot && snapshot.activeUsers > 0
    ? `$${centsToDollars(snapshot.totalProviderSpendCents / Math.max(1, snapshot.activeUsers))}/user`
    : '$0';

  return (
    <div style={{ fontFamily: "'SF Pro Display', -apple-system, sans-serif" }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.9)', margin: '0 0 16px' }}>Billing Admin</h2>

      {snapshot && (
        <>
          {/* Core Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginBottom: 20 }}>
            <StatCard label="Live Burn Rate" value={liveBurnRate} color="#fbbf24" />
            <StatCard label="Monthly Liability" value={`$${centsToDollars(snapshot.totalProviderSpendCents)}`} color={snapshot.totalProviderSpendCents > snapshot.totalRevenueCents ? '#ef4444' : '#34d399'} />
            <StatCard label="Total Revenue" value={`$${centsToDollars(snapshot.totalRevenueCents)}`} />
            <StatCard label="Gross Profit" value={`$${centsToDollars(snapshot.totalGrossProfitCents)}`} color={snapshot.totalGrossProfitCents > 0 ? '#34d399' : '#ef4444'} />
            <StatCard label="Margin" value={`${snapshot.overallMarginPct}%`} color={snapshot.overallMarginPct > 30 ? '#34d399' : '#fbbf24'} />
            <StatCard label="Active Users" value={String(activeUsers)} />
            <StatCard label="Total Requests" value={formatShort(totalEvents)} />
            <StatCard label="Cache Savings" value={`$${centsToDollars(Math.round(cacheSavings * 100))}`} color="#34d399" />
            <StatCard label="Overage Revenue" value={`$${centsToDollars(totalOverageRevenue)}`} color="#a78bfa" />
          </div>

          {/* Provider Spend */}
          <GlassPanel style={{ padding: '16px 20px', marginBottom: 16 }}>
            <h3 style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', margin: '0 0 10px' }}>Provider Spend by Model</h3>
            {Object.entries(snapshot.providerBreakdown).length === 0 ? (
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>No provider data</p>
            ) : (
              Object.entries(snapshot.providerBreakdown).map(([provider, data]) => (
                <div key={provider} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 11 }}>
                  <span style={{ color: 'rgba(255,255,255,0.6)', textTransform: 'capitalize' }}>{provider}</span>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>{data.requestCount} req</span>
                    <span style={{ color: data.spendCents > 10000 ? '#ef4444' : 'rgba(255,255,255,0.5)' }}>
                      ${centsToDollars(data.spendCents)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </GlassPanel>

          {/* Margin Heatmap */}
          <GlassPanel style={{ padding: '16px 20px', marginBottom: 16 }}>
            <h3 style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', margin: '0 0 10px' }}>Margin Heatmap</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
              {Object.entries(marginByTier).map(([tier, margin]) => (
                <div key={tier} style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: margin > 50 ? 'rgba(52,211,153,0.10)' : margin > 20 ? 'rgba(251,191,36,0.10)' : 'rgba(239,68,68,0.10)',
                  border: `1px solid ${margin > 50 ? 'rgba(52,211,153,0.15)' : margin > 20 ? 'rgba(251,191,36,0.15)' : 'rgba(239,68,68,0.15)'}`,
                }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2, textTransform: 'capitalize' }}>{tier}</div>
                  <div style={{
                    fontSize: 16, fontWeight: 700,
                    color: margin > 50 ? '#34d399' : margin > 20 ? '#fbbf24' : '#ef4444',
                  }}>
                    {margin.toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>

          {/* Tier Breakdown */}
          <GlassPanel style={{ padding: '16px 20px', marginBottom: 16 }}>
            <h3 style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', margin: '0 0 8px' }}>Tier Breakdown</h3>
            {Object.entries(snapshot.tierBreakdown).map(([tier, data]) => (
              <div key={tier} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 11 }}>
                <span style={{ color: 'rgba(255,255,255,0.6)', textTransform: 'capitalize' }}>{tier}</span>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {data.userCount} users · ${centsToDollars(data.revenueCents)} rev · ${centsToDollars(data.spendCents)} spend
                </span>
              </div>
            ))}
          </GlassPanel>

          {/* Top High-Cost Users */}
          <GlassPanel style={{ padding: '16px 20px', marginBottom: 16 }}>
            <h3 style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', margin: '0 0 8px' }}>Top High-Cost Users</h3>
            {snapshot.topBurnUsers.length === 0 ? (
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>No data</p>
            ) : (
              snapshot.topBurnUsers.slice(0, 10).map((u, i) => (
                <div key={u.userId} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 11 }}>
                  <span style={{ color: 'rgba(255,255,255,0.6)' }}>#{i + 1} {u.userId.slice(0, 20)}</span>
                  <span style={{ color: u.spendCents > 10000 ? '#ef4444' : 'rgba(255,255,255,0.5)' }}>
                    ${centsToDollars(u.spendCents)}
                    
                  </span>
                </div>
              ))
            )}
          </GlassPanel>

          {/* Low-Margin Users */}
          <GlassPanel style={{ padding: '16px 20px', marginBottom: 16 }}>
            <h3 style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', margin: '0 0 8px' }}>Low-Margin Users</h3>
            {allMetrics.filter(m => m.grossMarginPct < 20).length === 0 ? (
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>No low-margin users</p>
            ) : (
              allMetrics
                .filter(m => m.grossMarginPct < 20)
                .sort((a, b) => a.grossMarginPct - b.grossMarginPct)
                .slice(0, 10)
                .map(m => (
                  <div key={m.userId} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 11 }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>{m.userId.slice(0, 20)}</span>
                    <span style={{ color: '#ef4444' }}>
                      {m.grossMarginPct.toFixed(0)}% margin · ${centsToDollars(m.providerSpendCents)} spend
                    </span>
                  </div>
                ))
            )}
          </GlassPanel>

          {/* Churn Risk */}
          <GlassPanel style={{ padding: '16px 20px', marginBottom: 16 }}>
            <h3 style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', margin: '0 0 8px' }}>Subscription Churn Risk</h3>
            {churnRisks.length === 0 ? (
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>No high-risk users detected</p>
            ) : (
              churnRisks.map((r, i) => (
                <div key={r.userId} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 11 }}>
                  <span style={{ color: 'rgba(255,255,255,0.6)' }}>#{i + 1} {r.userId.slice(0, 20)}</span>
                  <span style={{ color: r.riskLevel === 'high' ? '#ef4444' : '#fbbf24' }}>
                    {r.riskLevel} risk · {r.tier}
                  </span>
                </div>
              ))
            )}
          </GlassPanel>

          {/* Trial Conversion */}
          <GlassPanel style={{ padding: '16px 20px', marginBottom: 16 }}>
            <h3 style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', margin: '0 0 8px' }}>Trial Conversion Metrics</h3>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
              Trial conversion tracking available after enabling trial flows in Stripe sandbox.
            </div>
          </GlassPanel>

          {/* Provider Outage Banner Placeholder */}
          <GlassPanel style={{ padding: '12px 16px', border: '1px solid rgba(251,191,36,0.15)', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#fbbf24', fontSize: 14 }}>⚠</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                Provider status banner placeholder. Will display active provider outages here.
              </span>
            </div>
          </GlassPanel>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12,
      padding: 14,
    }}>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 3, letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: color ?? 'rgba(255,255,255,0.85)' }}>{value}</div>
    </div>
  );
}

function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

function formatShort(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}
