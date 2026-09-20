import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { loginSchema } from "@/lib/auth/schemas";
import { verifyPassword } from "@/lib/auth/password";
import { createUserSession, toPublicUser } from "@/lib/auth/session";
import { setAuthCookies } from "@/lib/auth/cookies";
import { handleRouteError, jsonError } from "@/lib/http/errors";
import { getUserAgent, readJson } from "@/lib/http/request";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const input = loginSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      return jsonError("Invalid email or password", 401);
    }

    const session = await createUserSession(user.id, getUserAgent(request));
    const cookieStore = await cookies();
    setAuthCookies(cookieStore, session);

    return Response.json({ user: toPublicUser(session.user) });
  } catch (error) {
    return handleRouteError(error);
  }
}
