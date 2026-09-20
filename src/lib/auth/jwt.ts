import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { getAuthSecret } from "@/lib/env";
import type { AccessTokenPayload } from "@/lib/auth/types";

const ACCESS_TOKEN_TTL = "15m";

function getSecretKey() {
  return new TextEncoder().encode(getAuthSecret());
}

export async function signAccessToken(payload: AccessTokenPayload) {
  return new SignJWT({
    email: payload.email,
    platformRole: payload.platformRole,
    sid: payload.sid,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(getSecretKey());
}

export async function verifyAccessToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());

    if (!payload.sub || typeof payload.email !== "string" || typeof payload.sid !== "string") {
      return null;
    }

    return {
      sub: payload.sub,
      email: payload.email,
      platformRole: (payload.platformRole as AccessTokenPayload["platformRole"]) ?? null,
      sid: payload.sid,
    } satisfies AccessTokenPayload;
  } catch {
    return null;
  }
}
