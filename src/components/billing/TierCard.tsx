import type { TierDefinition, TierId } from '../../billing/types';
import { getFeatureAccess } from '../../billing/tiers';

interface TierCardProps {
  tier: TierDefinition;
  currentTierId: TierId | null;
  onSelect: (tierId: TierId, period: 'monthly' | 'yearly') => void;
  recommended?: boolean;
}

const BEST_FOR: Record<TierId, string> = {
  free: 'Exploration & self-hosting',
  starter: 'Personal knowledge work',
  pro: 'Power users & deep research',
  power: 'Teams & heavy usage',
};

const USAGE_DESCRIPTIONS: Record<TierId, string> = {
  free: '~50 thoughtful conversations / mo',
  starter: '~500 conversations with memory',
  pro: '~2,500 deep research conversations',
  power: '~12,500 conversations + multi-agent',
};

const TIER_GLYPH: Record<TierId, string> = {
  free: '◈',
  starter: '◇',
  pro: '⬡',
  power: '◉',
};

function isRecommended(tierId: TierId): boolean {
  return tierId === 'pro';
}

export function TierCard({ tier, currentTierId, onSelect }: TierCardProps) {
  const isCurrent = currentTierId === tier.id;
  const features = getFeatureAccess(tier.id);
  const rec = isRecommended(tier.id);
  const isFree = tier.price.monthly === 0;

  const monthlyDollars = (tier.price.monthly / 100).toFixed(0);
  const yearlyDollars = (tier.price.yearly / 100).toFixed(0);

  return (
    <div
      className="tier-card"
      data-current={isCurrent}
      data-recommended={rec}
      style={{
        background: isCurrent
          ? 'linear-gradient(135deg, rgba(139,92,246,0.10), rgba(34,211,238,0.06))'
          : 'rgba(255,255,255,0.028)',
        border: isCurrent
          ? '1px solid rgba(139,92,246,0.25)'
          : rec && !isCurrent
            ? '1px solid rgba(34,211,238,0.2)'
            : '1px solid rgba(255,255,255,0.065)',
        borderRadius: 16,
        padding: '28px 24px',
        position: 'relative',
        transition: 'all 0.3s ease',
        cursor: isCurrent ? 'default' : 'pointer',
        fontFamily: "'SF Pro Display', -apple-system, sans-serif",
        backdropFilter: 'blur(4px)',
        overflow: 'hidden',
      }}
      onClick={() => !isCurrent && onSelect(tier.id, tier.price.monthly > 0 ? 'monthly' : 'monthly')}
    >
      {rec && !isCurrent && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: 3,
          background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.5), transparent)',
        }} />
      )}

      {isCurrent && (
        <div style={{
          position: 'absolute', top: 12, right: 14,
          fontSize: 9, fontWeight: 700,
          color: '#a78bfa',
          background: 'rgba(139,92,246,0.15)',
          padding: '2px 10px',
          borderRadius: 4,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>
          Current
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <span style={{
          fontSize: 18,
          color: rec ? '#22d3ee' : 'rgba(255,255,255,0.6)',
        }}>
          {TIER_GLYPH[tier.id]}
        </span>
        <h3 style={{
          margin: 0,
          fontSize: 17,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.92)',
          letterSpacing: '-0.01em',
        }}>
          {tier.name}
        </h3>
      </div>

      {!isFree && (
        <div style={{ margin: '10px 0 2px' }}>
          <span style={{
            fontSize: 30,
            fontWeight: 700,
            color: '#fff',
            fontFeatureSettings: "'tnum'",
          }}>
            ${monthlyDollars}
          </span>
          <span style={{
            fontSize: 13,
            fontWeight: 400,
            color: 'rgba(255,255,255,0.35)',
            marginLeft: 4,
          }}>/mo</span>
        </div>
      )}

      {isFree && (
        <div style={{
          margin: '10px 0 2px',
          fontSize: 22,
          fontWeight: 700,
          color: 'rgba(255,255,255,0.7)',
        }}>
          Free
        </div>
      )}

      {!isFree && (
        <div style={{
          fontSize: 11,
          color: 'rgba(255,255,255,0.3)',
          marginBottom: 6,
        }}>
          ${yearlyDollars}/yr &middot; monthly recurring
        </div>
      )}

      <div style={{
        fontSize: 11,
        color: 'rgba(255,255,255,0.45)',
        margin: '6px 0 12px',
        lineHeight: 1.5,
        fontStyle: 'italic',
      }}>
        {BEST_FOR[tier.id]}
      </div>

      <div style={{
        fontSize: 12,
        color: 'rgba(255,255,255,0.55)',
        marginBottom: 6,
        lineHeight: 1.6,
      }}>
        {USAGE_DESCRIPTIONS[tier.id]}
      </div>

      <div style={{ margin: '14px 0' }}>
        {Object.entries(features)
          .filter(([, v]) => v)
          .slice(0, 5)
          .map(([key]) => (
            <div key={key} style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.55)',
              padding: '3px 0',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <span style={{ color: 'rgba(34,211,238,0.5)', fontSize: 9 }}>◆</span>
              {featureLabel(key)}
            </div>
          ))}
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onSelect(tier.id, 'monthly'); }}
        disabled={isCurrent}
        style={{
          width: '100%',
          padding: '10px 0',
          border: isCurrent
            ? '1px solid rgba(255,255,255,0.08)'
            : rec
              ? '1px solid rgba(34,211,238,0.3)'
              : '1px solid rgba(139,92,246,0.25)',
          borderRadius: 8,
          background: isCurrent
            ? 'transparent'
            : rec
              ? 'rgba(34,211,238,0.10)'
              : 'rgba(139,92,246,0.10)',
          color: isCurrent
            ? 'rgba(255,255,255,0.3)'
            : rec
              ? '#22d3ee'
              : '#a78bfa',
          fontSize: 12,
          fontWeight: 600,
          cursor: isCurrent ? 'default' : 'pointer',
          letterSpacing: '0.03em',
          transition: 'all 0.2s ease',
        }}>
        {isCurrent ? 'Active Plan' : isFree ? 'Activate Free' : 'Subscribe'}
      </button>
    </div>
  );
}

function featureLabel(key: string): string {
  const labels: Record<string, string> = {
    'basic-chat': 'AI Chat',
    'basic-graph': 'Knowledge Graph',
    'basic-memory': 'Memory System',
    'basic-quests': 'Quests & Journeys',
    'focus-sessions': 'Focus Sessions',
    'skill-web': 'Skill Web',
    'data-export': 'Data Export',
    'advanced-graph': 'Advanced Graph',
    'ai-assist-deep': 'Deep AI Assistance',
    'long-term-memory': 'Long-term Memory',
    'advanced-reasoning': 'Advanced Reasoning',
    'multi-agent': 'Multi-Agent Orchestration',
    'export-systems': 'Export Systems',
    'api-access': 'API Access',
  };
  return labels[key] ?? key.replace(/-/g, ' ');
}
