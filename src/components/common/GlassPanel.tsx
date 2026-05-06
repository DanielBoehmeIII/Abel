import React from 'react';

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'raised' | 'inset';
  glow?: 'purple' | 'cyan' | 'gold' | 'none';
  radius?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const glowClass = { purple: 'glow-purple', cyan: 'glow-cyan', gold: 'glow-gold', none: '' };
const radClass  = { sm: 'var(--radius)', md: 'var(--radius-lg)', lg: 'var(--radius-xl)' };

export default function GlassPanel({
  variant = 'default', glow = 'none', radius = 'md',
  style, className = '', children, ...rest
}: Props) {
  return (
    <div
      className={`${variant === 'raised' ? 'glass-2' : 'glass'} ${glowClass[glow]} ${className}`}
      style={{ borderRadius: radClass[radius], ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}
