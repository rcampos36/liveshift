import "server-only";

import { prisma } from "@/lib/db/prisma";
import { generateOpaqueToken, hashToken } from "@/lib/auth/tokens";
import type { EmailTokenType } from "@/generated/prisma/client";

const TOKEN_TTL: Record<EmailTokenType, number> = {
  EMAIL_VERIFICATION: 1000 * 60 * 60 * 24,
  PASSWORD_RESET: 1000 * 60 * 60,
};

export async function issueEmailToken(userId: string, type: EmailTokenType) {
  await prisma.emailToken.updateMany({
    where: { userId, type, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = generateOpaqueToken();
  await prisma.emailToken.create({
    data: {
      userId,
      type,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + TOKEN_TTL[type]),
    },
  });

  return token;
}

export async function consumeEmailToken(token: string, type: EmailTokenType) {
  const record = await prisma.emailToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });

  if (!record || record.type !== type || record.usedAt || record.expiresAt.getTime() <= Date.now()) {
    return null;
  }

  await prisma.emailToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return record;
}
