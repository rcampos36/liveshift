import { ZodError } from "zod";
import { AuthorizationError } from "@/lib/authorization/guards";
import { ProviderError } from "@/lib/integrations/errors";

export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export function handleRouteError(error: unknown) {
  if (error instanceof AuthorizationError) {
    return jsonError(error.message, error.status);
  }

  if (error instanceof ZodError) {
    return jsonError(error.issues[0]?.message ?? "Invalid request", 400);
  }

  if (error instanceof ProviderError) {
    return jsonError(error.message, error.status);
  }

  console.error(error);

  const databaseUrl = process.env.DATABASE_URL ?? "";
  if (databaseUrl.includes("placeholder") || databaseUrl.includes("USER:PASSWORD")) {
    return jsonError(
      "DATABASE_URL is still a placeholder. Add your Neon pooled connection string to .env.",
      503,
    );
  }

  const message = error instanceof Error ? error.message : "";
  if (
    message.includes("Can't reach database") ||
    message.includes("ECONNREFUSED") ||
    message.includes("ENOTFOUND") ||
    message.includes("denied access on the database")
  ) {
    return jsonError(
      "Could not connect to the database. Restart `npm run dev` after changing DATABASE_URL.",
      503,
    );
  }

  if (process.env.NODE_ENV !== "production" && message) {
    return jsonError(message, 500);
  }

  return jsonError("Something went wrong", 500);
}
