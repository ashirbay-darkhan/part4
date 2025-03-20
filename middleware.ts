import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Paths that don't require authentication
const publicPaths = [
  '/login', 
  '/register', 
  '/forgot-password', 
  '/reset-password',
  '/book',
];

// Middleware function to check authentication
export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const pathname = request.nextUrl.pathname;
  
  console.log('Auth middleware running for path:', pathname);
  console.log('Auth token:', token ? 'Present' : 'Not present');
  
  // If not authenticated and accessing protected route, redirect to login
  if (!token && !publicPaths.some(path => pathname.startsWith(path)) && 
      !pathname.startsWith('/booking') && // Public booking pages remain accessible
      !pathname.startsWith('/form') && // Public form pages remain accessible
      !pathname.startsWith('/api/booking-forms') && // Public booking API remains accessible
      !pathname.startsWith('/_next') && // Next.js internal routes
      !pathname.startsWith('/favicon.ico') // Favicon
     ) {
    console.log('Redirecting to login from:', pathname);
    const url = new URL('/login', request.url);
    return NextResponse.redirect(url);
  }
  
  // If authenticated and accessing auth routes, redirect to dashboard
  if (token && publicPaths.some(path => pathname.startsWith(path))) {
    console.log('Redirecting to dashboard from:', pathname);
    const url = new URL('/dashboard', request.url);
    return NextResponse.redirect(url);
  }
  
  return NextResponse.next();
}

// Paths to run the middleware on
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};