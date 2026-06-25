import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "mutatech_session";

const PUBLIC_PATHS = ["/login", "/api/verify-totp", "/signer"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const session = request.cookies.get(COOKIE_NAME)?.value;
  const expected = process.env.ACCESS_TOKEN;

  if (!expected || session !== expected) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
