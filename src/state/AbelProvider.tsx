import React, { useReducer, useEffect, useRef } from 'react';
import type { AbelState } from '../types/abel';
import { abelReducer } from './abelStore';
import { SEED_STATE } from '../data/seed';
import { userService, DEMO_USER_ID } from '../db/services/userService';
import { graphService } from '../db/services/graphService';
import { seedDatabaseFromState } from '../db/seed';
import { AbelContext } from './useAbel';

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

export function AbelProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(abelReducer, undefined, loadState);
  const isFirstRender = useRef(true);

  useEffect(() => {
    saveState(state);
  }, [state]);

  // One-time DB bootstrap — seeds IndexedDB from localStorage state on first run
  useEffect(() => {
    initDatabase(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync graph changes to IndexedDB whenever state.graph changes.
  // Skip the initial render — the seed already wrote the initial graph.
  // Future: AI memory sync (graph_refresh jobs) reads from this table.
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    graphService.syncFromState(
      DEMO_USER_ID,
      state.graph.nodes,
      state.graph.edges,
    ).catch(err => console.warn('[Abel DB] graph sync failed (non-fatal):', err));
  }, [state.graph]);

  return (
    <AbelContext.Provider value={{ state, dispatch }}>
      {children}
    </AbelContext.Provider>
  );
}
