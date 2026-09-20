import { prisma } from "@/lib/db/prisma";
import { resetPasswordSchema } from "@/lib/auth/schemas";
import { consumeEmailToken } from "@/lib/auth/email-tokens";
import { hashPassword } from "@/lib/auth/password";
import { handleRouteError, jsonError } from "@/lib/http/errors";
import { readJson } from "@/lib/http/request";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const input = resetPasswordSchema.parse(body);
    const token = await consumeEmailToken(input.token, "PASSWORD_RESET");

    if (!token) {
      return jsonError("This reset link is invalid or has expired", 400);
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: token.userId },
        data: { passwordHash: await hashPassword(input.password) },
      }),
      prisma.session.deleteMany({ where: { userId: token.userId } }),
    ]);

    return Response.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
