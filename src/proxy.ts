import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE } from "@/lib/auth/types";
import { verifyAccessToken } from "@/lib/auth/jwt";

export async function proxy(request: NextRequest) {
  const accessToken = request.cookies.get(AUTH_COOKIE.access)?.value;
  const refreshToken = request.cookies.get(AUTH_COOKIE.refresh)?.value;

  if (accessToken && (await verifyAccessToken(accessToken))) {
    return NextResponse.next();
  }

  if (refreshToken) {
    const refreshUrl = new URL("/api/auth/refresh", request.url);
    refreshUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(refreshUrl);
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/((?!auth/|cron/).*)"],
};
