'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AppearancePreference,
  AppearanceResolved,
  applyAppearance,
  prefersDarkScheme,
  readStoredAppearance,
  resolveAppearance,
  storeAppearance,
} from '@/lib/connect-appearance';

export interface ConnectAppearance {
  preference: AppearancePreference;
  resolved: AppearanceResolved;
  setPreference: (next: AppearancePreference) => void;
  /** False until the stored choice has been read, so nothing renders a wrong state. */
  ready: boolean;
}

/**
 * Visitor-side appearance for the public profile. Independent of the app
 * theme used by the admin and merchant dashboard, and stored per device
 * rather than per business.
 */
export function useConnectAppearance(): ConnectAppearance {
  const [preference, setPreferenceState] = useState<AppearancePreference>('system');
  const [systemDark, setSystemDark] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readStoredAppearance();
    setPreferenceState(stored);
    setSystemDark(prefersDarkScheme());
    setReady(true);
  }, []);

  /* Follow the OS while the visitor has not overridden it. */
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    query.addEventListener('change', onChange);
    setSystemDark(query.matches);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const resolved = resolveAppearance(preference, systemDark);

  /* One place writes the attribute, so React state and the DOM can never drift. */
  useEffect(() => {
    if (!ready) return;
    applyAppearance(resolved);
  }, [ready, resolved]);

  const setPreference = useCallback((next: AppearancePreference) => {
    setPreferenceState(next);
    storeAppearance(next);
  }, []);

  return { preference, resolved, setPreference, ready };
}
