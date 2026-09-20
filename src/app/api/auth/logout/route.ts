import { cookies } from "next/headers";
import { AUTH_COOKIE } from "@/lib/auth/types";
import { clearAuthCookies } from "@/lib/auth/cookies";
import { destroyUserSession } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/http/errors";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get(AUTH_COOKIE.refresh)?.value;

    await destroyUserSession(refreshToken);
    clearAuthCookies(cookieStore);

    return Response.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
