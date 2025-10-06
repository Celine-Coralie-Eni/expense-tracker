import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  console.log('🔍 Middleware called for:', pathname)
  
  // Check if the route should be protected
  if (pathname.startsWith('/dashboard')) {
    console.log('🔍 Checking dashboard access...')
    
    // Check for Better Auth session cookie
    const sessionToken = request.cookies.get('better-auth.session_token')?.value
    
    console.log('🔍 Session token:', sessionToken ? 'FOUND' : 'NOT FOUND')

    if (sessionToken) {
      console.log('✅ Session token found, allowing access')
      return NextResponse.next()
    }

    console.log('❌ No session token, redirecting to login')
    // No session found, redirect to login
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*']
}
