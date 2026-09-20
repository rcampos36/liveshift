import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { startDemoSession } from "@/lib/auth/demo";
import { setAuthCookies } from "@/lib/auth/cookies";
import { handleRouteError } from "@/lib/http/errors";
import { getUserAgent } from "@/lib/http/request";

export async function GET(request: Request) {
  try {
    const demo = await startDemoSession(getUserAgent(request));
    if (!demo) {
      return NextResponse.redirect(new URL("/login?demo=unavailable", request.url));
    }

    const cookieStore = await cookies();
    setAuthCookies(cookieStore, demo.session);
    return NextResponse.redirect(new URL(demo.path, request.url));
  } catch (error) {
    return handleRouteError(error);
  }
}
