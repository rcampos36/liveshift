import "server-only";

import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { signAccessToken, verifyAccessToken } from "@/lib/auth/jwt";
import { generateOpaqueToken, hashToken } from "@/lib/auth/tokens";
import { AUTH_COOKIE, type AuthUser } from "@/lib/auth/types";

const REFRESH_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const AUTH_USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  platformRole: true,
  emailVerifiedAt: true,
  companyMemberships: {
    where: { status: "ACTIVE" as const },
    select: {
      id: true,
      companyId: true,
      role: true,
      status: true,
      company: {
        select: { id: true, name: true, slug: true },
      },
    },
  },
  locationMemberships: {
    where: { status: "ACTIVE" as const },
    select: {
      id: true,
      locationId: true,
      role: true,
      status: true,
      location: {
        select: {
          id: true,
          name: true,
          slug: true,
          companyId: true,
          company: {
            select: { id: true, name: true, slug: true },
          },
        },
      },
    },
  },
} as const;

export async function createUserSession(userId: string, userAgent?: string | null) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: AUTH_USER_SELECT,
  });

  const refreshToken = generateOpaqueToken();
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      refreshTokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      userAgent: userAgent?.slice(0, 500),
    },
  });

  const accessToken = await signAccessToken({
    sub: user.id,
    email: user.email,
    platformRole: user.platformRole,
    sid: session.id,
  });

  return { user, accessToken, refreshToken };
}

export async function rotateUserSession(refreshToken: string, userAgent?: string | null) {
  const session = await prisma.session.findUnique({
    where: { refreshTokenHash: hashToken(refreshToken) },
    include: {
      user: { select: AUTH_USER_SELECT },
    },
  });

  if (!session || session.expiresAt.getTime() <= Date.now()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    }
    return null;
  }

  const nextRefreshToken = generateOpaqueToken();
  const nextSession = await prisma.session.update({
    where: { id: session.id },
    data: {
      refreshTokenHash: hashToken(nextRefreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      userAgent: userAgent?.slice(0, 500) ?? session.userAgent,
    },
  });

  const accessToken = await signAccessToken({
    sub: session.user.id,
    email: session.user.email,
    platformRole: session.user.platformRole,
    sid: nextSession.id,
  });

  return {
    user: session.user,
    accessToken,
    refreshToken: nextRefreshToken,
  };
}

export async function destroyUserSession(refreshToken?: string, sessionId?: string) {
  if (sessionId) {
    await prisma.session.deleteMany({ where: { id: sessionId } });
    return;
  }

  if (refreshToken) {
    await prisma.session.deleteMany({
      where: { refreshTokenHash: hashToken(refreshToken) },
    });
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_COOKIE.access)?.value;

  if (!accessToken) {
    return null;
  }

  const payload = await verifyAccessToken(accessToken);
  if (!payload) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { id: payload.sid },
    select: { id: true, expiresAt: true },
  });

  if (!session || session.expiresAt.getTime() <= Date.now()) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: payload.sub },
    select: AUTH_USER_SELECT,
  });
}

export function toPublicUser(user: AuthUser) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    platformRole: user.platformRole,
    emailVerifiedAt: user.emailVerifiedAt,
    companyMemberships: user.companyMemberships,
    locationMemberships: user.locationMemberships,
  };
}
