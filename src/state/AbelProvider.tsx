import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { AbelState } from '../types/abel';
import { abelReducer, type AbelAction } from './abelStore';
import { SEED_STATE } from '../data/seed';

const STORAGE_KEY = 'abel_v3';

function loadState(): AbelState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AbelState;
  } catch {
    // ignore
  }
  return SEED_STATE;
}

function saveState(state: AbelState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface AbelContextValue {
  state: AbelState;
  dispatch: React.Dispatch<AbelAction>;
}

const AbelContext = createContext<AbelContextValue | null>(null);

export function AbelProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(abelReducer, undefined, loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  return (
    <AbelContext.Provider value={{ state, dispatch }}>
      {children}
    </AbelContext.Provider>
  );
}

export function useAbel(): AbelContextValue {
  const ctx = useContext(AbelContext);
  if (!ctx) throw new Error('useAbel must be used within AbelProvider');
  return ctx;
}
