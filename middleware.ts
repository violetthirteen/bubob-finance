import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // yang boleh diakses tanpa login
  const publicPaths = ['/login']
  const isPublic = publicPaths.includes(pathname) || pathname.startsWith('/_next') || pathname.startsWith('/favicon')

  // supabase session disimpan di localStorage, jadi middleware ga bisa baca.
  // solusi simpel untuk sekarang: kita protect via client-side check di layout dashboard (step C3).
  // middleware ini kita pakai cuma buat rapihin akses route public nanti.
  if (isPublic) return NextResponse.next()

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
