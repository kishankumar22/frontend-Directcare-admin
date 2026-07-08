import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Returns true only if the JWT is present AND not expired.
function isTokenValid(token?: string): boolean {
  if (!token) return false;
  try {
    const part = token.split('.')[1];
    if (!part) return false;
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    const exp = typeof payload.exp === 'number' ? payload.exp : 0;
    // Valid only while the token has not expired (with a tiny 5s skew).
    return exp > 0 && Date.now() < (exp * 1000) - 5000;
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get('authToken')?.value;
  const valid = isTokenValid(token);
  const { pathname } = request.nextUrl;

  // Admin routes require a valid (non-expired) token.
  if (pathname.startsWith('/admin')) {
    if (!valid) {
      const res = NextResponse.redirect(new URL('/login', request.url));
      // IMPORTANT: clear the stale/expired cookie so we don't bounce back to /admin (redirect loop).
      res.cookies.delete('authToken');
      return res;
    }
  }

  // On the login page: only send to admin when the token is actually valid.
  // An expired token here gets cleared so the user can log in again.
  if (pathname === '/login') {
    if (valid) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    if (token) {
      const res = NextResponse.next();
      res.cookies.delete('authToken');
      return res;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/login'],
};
