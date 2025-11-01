import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get token from request cookies or headers
  const token = request.cookies.get('authToken')?.value;

  // Check if user is accessing admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // If no token, redirect to login
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // If user is on login page and has token, redirect to admin
  if (request.nextUrl.pathname === '/login' && token) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/login'],
};
