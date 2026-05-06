import React from 'react';
import './GlowButton.css';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'purple' | 'cyan' | 'gold' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export default function GlowButton({ variant = 'ghost', size = 'md', className = '', children, ...rest }: Props) {
  return (
    <button
      className={`glow-btn glow-btn--${variant} glow-btn--${size} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
