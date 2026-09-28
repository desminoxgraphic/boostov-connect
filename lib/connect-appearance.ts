export const CONNECT_APPEARANCE_KEY = 'boostov:connect-appearance';
export const CONNECT_APPEARANCE_ATTR = 'data-appearance';

export type AppearancePreference = 'light' | 'dark' | 'system';
export type AppearanceResolved = 'light' | 'dark';

export function isAppearancePreference(value: unknown): value is AppearancePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function readStoredAppearance(): AppearancePreference {
  try {
    const stored = window.localStorage.getItem(CONNECT_APPEARANCE_KEY);
    return isAppearancePreference(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

export function storeAppearance(preference: AppearancePreference): void {
  try {
    window.localStorage.setItem(CONNECT_APPEARANCE_KEY, preference);
  } catch {
    /* private mode: the choice simply does not persist */
  }
}

export function prefersDarkScheme(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
}

export function resolveAppearance(
  preference: AppearancePreference,
  systemDark: boolean
): AppearanceResolved {
  if (preference === 'system') return systemDark ? 'dark' : 'light';
  return preference;
}

/**
 * Writes the resolved mode onto <html>. `.connect-scope` in globals.css reads
 * this attribute, which is what lets a visitor flip the profile between light
 * and dark without touching the app theme on the same page.
 */
export function applyAppearance(resolved: AppearanceResolved): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute(CONNECT_APPEARANCE_ATTR, resolved);
}

/**
 * Runs before first paint on the public profile so the card never flashes the
 * wrong mode. Kept in sync with the helpers above.
 */
export const APPEARANCE_INIT_SCRIPT = `(function(){try{var k=${JSON.stringify(
  CONNECT_APPEARANCE_KEY
)};var a=${JSON.stringify(CONNECT_APPEARANCE_ATTR)};var p=null;try{p=window.localStorage.getItem(k)}catch(e){}
if(p!=='light'&&p!=='dark'&&p!=='system')p='system';
var d=p==='dark'||(p==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
document.documentElement.setAttribute(a,d?'dark':'light')}catch(e){}})();`;
