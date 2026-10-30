import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { apiStatusFor, areaForPath, decideAccess, pageRedirectFor } from './lib/access';
import { loadAccessContext } from './lib/authz-edge';
import { hardenCookie } from './lib/supabase/cookie-options';

/**
 * Refreshes the Supabase session cookie and turns away anyone who may not be
 * in /admin or /dashboard. Every layout and route handler checks again on its
 * own; this is the first gate, not the only one.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(toSet) {
          for (const { name, value } of toSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of toSet) {
            response.cookies.set(name, value, hardenCookie(options));
          }
        },
      },
    }
  );

  const pathname = request.nextUrl.pathname;
  const area = areaForPath(pathname);
  if (!area) {
    await supabase.auth.getUser();
    return response;
  }

  const ctx = await loadAccessContext(supabase);
  const decision = decideAccess(area, ctx);
  if (decision === 'allow') return response;

  const withCookies = (res: NextResponse) => {
    for (const cookie of response.cookies.getAll()) res.cookies.set(cookie);
    return res;
  };

  if (pathname.startsWith('/api/')) {
    const status = apiStatusFor(decision);
    return withCookies(
      NextResponse.json({ error: status === 401 ? 'Unauthorized.' : 'Forbidden.' }, { status })
    );
  }

  const target = pageRedirectFor(area, decision);
  if (target) return withCookies(NextResponse.redirect(new URL(target, request.url)));
  // Someone signed in with the wrong role: the admin area does not exist for them.
  return withCookies(NextResponse.rewrite(new URL('/_not-found', request.url), { status: 404 }));
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/api/admin/:path*',
    '/api/reseller/:path*',
    '/login',
    '/auth/:path*',
  ],
};
