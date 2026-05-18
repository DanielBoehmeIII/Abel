import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { AbelState } from '../types/abel';
import { abelReducer, type AbelAction } from './abelStore';
import { SEED_STATE } from '../data/seed';
import { db } from '../db/db';
import { userService, DEMO_USER_ID } from '../db/services/userService';
import { seedDatabaseFromState } from '../db/seed';

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

// Initialise IndexedDB on first run by seeding from the current localStorage state.
// Subsequent runs skip seeding — DB is the source of truth for DB-backed features.
// Future AI memory sync will hydrate additional data from the DB into app state.
async function initDatabase(state: AbelState): Promise<void> {
  try {
    const existing = await userService.get(DEMO_USER_ID);
    if (!existing) {
      await seedDatabaseFromState(state);
    }
  } catch (err) {
    console.warn('[Abel DB] init failed (non-fatal):', err);
  }
}

// Export db for dev tooling / future admin views
export { db };

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

  // One-time DB bootstrap — seeds IndexedDB from localStorage state on first run
  useEffect(() => {
    initDatabase(state);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
