import { prisma } from "@/lib/db/prisma";
import { verifyEmailSchema } from "@/lib/auth/schemas";
import { consumeEmailToken } from "@/lib/auth/email-tokens";
import { handleRouteError, jsonError } from "@/lib/http/errors";
import { readJson } from "@/lib/http/request";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const input = verifyEmailSchema.parse(body);
    const token = await consumeEmailToken(input.token, "EMAIL_VERIFICATION");

    if (!token) {
      return jsonError("This verification link is invalid or has expired", 400);
    }

    await prisma.user.update({
      where: { id: token.userId },
      data: { emailVerifiedAt: new Date() },
    });

    return Response.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
