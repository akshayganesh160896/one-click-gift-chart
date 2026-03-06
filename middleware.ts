import { NextRequest, NextResponse } from 'next/server';
import { APP_ACCESS_COOKIE } from '@/lib/passcode';

const PROTECTED_PREFIXES = ['/dashboard', '/charts', '/api/charts'];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (!isProtected) {
    return NextResponse.next();
  }

  const hasAccess = request.cookies.get(APP_ACCESS_COOKIE)?.value === 'ok';
  if (hasAccess) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Passcode required' }, { status: 401 });
  }

  const redirectUrl = new URL('/unlock', request.url);
  redirectUrl.searchParams.set('next', `${pathname}${search}`);
  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: ['/dashboard/:path*', '/charts/:path*', '/api/charts/:path*']
};
