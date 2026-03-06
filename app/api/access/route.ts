import { NextResponse } from 'next/server';
import { APP_ACCESS_COOKIE, isValidAppPasscode } from '@/lib/passcode';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  if (!isValidAppPasscode(body?.passcode)) {
    return NextResponse.json({ error: 'Invalid passcode' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(APP_ACCESS_COOKIE, 'ok', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30
  });
  return response;
}
