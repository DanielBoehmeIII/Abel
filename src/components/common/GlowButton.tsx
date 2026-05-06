import React from 'react';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'purple' | 'cyan' | 'gold' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const variants: Record<string, React.CSSProperties & { '--hover-shadow'?: string }> = {
  purple: {
    background: 'var(--purple-dim)',
    border: '1px solid rgba(124,77,255,0.35)',
    color: '#b794ff',
  },
  cyan: {
    background: 'var(--cyan-dim)',
    border: '1px solid rgba(0,212,255,0.3)',
    color: 'var(--cyan)',
  },
  gold: {
    background: 'var(--gold-dim)',
    border: '1px solid rgba(245,197,24,0.3)',
    color: 'var(--gold)',
  },
  ghost: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    color: 'var(--text-2)',
  },
  danger: {
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    color: '#f87171',
  },
};

const sizes: Record<string, React.CSSProperties> = {
  sm: { padding: '6px 14px', fontSize: '0.7rem', letterSpacing: '0.1em' },
  md: { padding: '9px 20px', fontSize: '0.75rem', letterSpacing: '0.1em' },
  lg: { padding: '12px 28px', fontSize: '0.85rem', letterSpacing: '0.08em' },
};

export default function GlowButton({ variant = 'ghost', size = 'md', style, children, ...rest }: Props) {
  return (
    <button
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        borderRadius: 'var(--radius)',
        fontWeight: 600, textTransform: 'uppercase',
        transition: 'var(--transition)',
        backdropFilter: 'blur(8px)',
        cursor: 'pointer',
        ...variants[variant],
        ...sizes[size],
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
