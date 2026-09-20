import { AUTH_COOKIE } from "@/lib/auth/types";

const ACCESS_MAX_AGE = 60 * 15;
const REFRESH_MAX_AGE = 60 * 60 * 24 * 7;

type CookieStore = {
  set: (
    name: string,
    value: string,
    options: {
      httpOnly: boolean;
      sameSite: "lax";
      secure: boolean;
      path: string;
      maxAge: number;
    },
  ) => void;
};

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export function setAuthCookies(
  store: CookieStore,
  tokens: { accessToken: string; refreshToken: string },
) {
  store.set(AUTH_COOKIE.access, tokens.accessToken, cookieOptions(ACCESS_MAX_AGE));
  store.set(AUTH_COOKIE.refresh, tokens.refreshToken, cookieOptions(REFRESH_MAX_AGE));
}

export function clearAuthCookies(store: CookieStore) {
  store.set(AUTH_COOKIE.access, "", cookieOptions(0));
  store.set(AUTH_COOKIE.refresh, "", cookieOptions(0));
}

export function applyAuthCookies(
  headers: Headers,
  tokens: { accessToken: string; refreshToken: string },
) {
  const access = serializeCookie(AUTH_COOKIE.access, tokens.accessToken, ACCESS_MAX_AGE);
  const refresh = serializeCookie(AUTH_COOKIE.refresh, tokens.refreshToken, REFRESH_MAX_AGE);
  headers.append("Set-Cookie", access);
  headers.append("Set-Cookie", refresh);
}

export function applyClearedAuthCookies(headers: Headers) {
  headers.append("Set-Cookie", serializeCookie(AUTH_COOKIE.access, "", 0));
  headers.append("Set-Cookie", serializeCookie(AUTH_COOKIE.refresh, "", 0));
}

function serializeCookie(name: string, value: string, maxAge: number) {
  const parts = [
    `${name}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];

  if (process.env.NODE_ENV === "production") {
    parts.push("Secure");
  }

  return parts.join("; ");
}
