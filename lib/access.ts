/**
 * Pure access rules, shared by the middleware, every protected layout and
 * every protected API route. No I/O here, so the rules are unit tested.
 */

export type Role = 'super_admin' | 'reseller';
export type Aal = 'aal1' | 'aal2';
export type ResellerStatus = 'pending' | 'active' | 'suspended';

export interface AccessContext {
  userId: string;
  email: string;
  role: Role | null;
  /** Assurance level of the current session. */
  aal: Aal;
  /** True when the user has at least one verified TOTP factor. */
  hasTotp: boolean;
  resellerStatus: ResellerStatus | null;
}

/** admin: the super admin panel. admin-mfa: the TOTP enrol/verify screen. reseller: /dashboard. */
export type Area = 'admin' | 'admin-mfa' | 'reseller';

export type Decision =
  | 'allow'
  | 'login'
  | 'mfa'
  | 'set-password'
  | 'suspended'
  | 'forbidden';

export function decideAccess(area: Area, ctx: AccessContext | null): Decision {
  if (!ctx) return 'login';

  if (area === 'admin' || area === 'admin-mfa') {
    if (ctx.role !== 'super_admin') return 'forbidden';
    if (area === 'admin-mfa') return 'allow';
    // 2FA is optional; once the super admin turns it on, every session must pass it.
    if (ctx.hasTotp && ctx.aal !== 'aal2') return 'mfa';
    return 'allow';
  }

  if (ctx.role !== 'reseller') return 'forbidden';
  if (ctx.resellerStatus === 'suspended' || ctx.resellerStatus === null) return 'suspended';
  if (ctx.resellerStatus === 'pending') return 'set-password';
  return 'allow';
}

/** HTTP status for an API request that was not allowed. */
export function apiStatusFor(decision: Decision): number {
  if (decision === 'login') return 401;
  return 403;
}

/** Where a page request goes when it was not allowed (null = 404). */
export function pageRedirectFor(area: Area, decision: Decision): string | null {
  switch (decision) {
    case 'login':
      return area === 'reseller' ? '/login' : '/admin/login';
    case 'mfa':
      return '/admin/mfa';
    case 'set-password':
      return '/auth/set-password';
    case 'suspended':
      return '/login?suspended=1';
    default:
      return null;
  }
}

export function areaForPath(pathname: string): Area | null {
  if (pathname === '/admin/login') return null;
  if (pathname === '/admin/mfa') return 'admin-mfa';
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return 'admin';
  if (pathname.startsWith('/api/admin/')) return 'admin';
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) return 'reseller';
  if (pathname.startsWith('/api/reseller/')) return 'reseller';
  return null;
}
