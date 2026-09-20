import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE } from "@/lib/auth/types";
import { setAuthCookies, clearAuthCookies } from "@/lib/auth/cookies";
import { rotateUserSession, toPublicUser } from "@/lib/auth/session";
import { handleRouteError, jsonError } from "@/lib/http/errors";
import { getUserAgent } from "@/lib/http/request";

function safeNextPath(request: Request) {
  const next = new URL(request.url).searchParams.get("next");
  return next?.startsWith("/") ? next : "/dashboard";
}

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get(AUTH_COOKIE.refresh)?.value;
    const destination = new URL(safeNextPath(request), request.url);

    if (!refreshToken) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const session = await rotateUserSession(refreshToken, getUserAgent(request));
    if (!session) {
      clearAuthCookies(cookieStore);
      return NextResponse.redirect(new URL("/login", request.url));
    }

    setAuthCookies(cookieStore, session);
    return NextResponse.redirect(destination);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get(AUTH_COOKIE.refresh)?.value;

    if (!refreshToken) {
      return jsonError("Refresh token missing", 401);
    }

    const session = await rotateUserSession(refreshToken, getUserAgent(request));
    if (!session) {
      clearAuthCookies(cookieStore);
      return jsonError("Session expired", 401);
    }

    setAuthCookies(cookieStore, session);
    return Response.json({ user: toPublicUser(session.user) });
  } catch (error) {
    return handleRouteError(error);
  }
}
