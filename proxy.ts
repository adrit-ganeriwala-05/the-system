import { NextResponse, type NextRequest } from "next/server";

// First gate only. Database sessions can't be validated at the edge (no Prisma), so this
// checks for the presence of a session cookie and nothing more — a cookie that is expired,
// revoked, or forged still gets past here. Every protected page and server action must
// independently call requireUser() (lib/session.ts), which does the real database check.
// See CVE-2025-29927: middleware-only auth in Next.js has been bypassable via spoofed
// headers, so middleware is treated as a redirect convenience, never as the security
// boundary.
const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

const PUBLIC_PATHS = ["/signin", "/api/auth"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // "/" serves the public landing page to signed-out visitors and the dashboard to
  // signed-in ones, so it must not be redirected away here.
  if (pathname === "/" || PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const hasSessionCookie = SESSION_COOKIES.some((name) => request.cookies.has(name));
  if (!hasSessionCookie) {
    const signInUrl = new URL("/signin", request.url);
    if (pathname !== "/") signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
