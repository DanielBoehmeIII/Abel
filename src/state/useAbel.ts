import { createContext, useContext } from 'react';
import type { AbelState } from '../types/abel';
import type { AbelAction } from './abelStore';

export interface AbelContextValue {
  state: AbelState;
  dispatch: React.Dispatch<AbelAction>;
}

export const AbelContext = createContext<AbelContextValue | null>(null);

export function useAbel(): AbelContextValue {
  const ctx = useContext(AbelContext);
  if (!ctx) throw new Error('useAbel must be used within AbelProvider');
  return ctx;
}
