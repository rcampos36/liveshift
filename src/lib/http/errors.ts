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
  if (!databaseUrl) {
    return jsonError(
      "DATABASE_URL is missing. Add the Neon pooled URL in Vercel, then redeploy.",
      503,
    );
  }
  if (databaseUrl.includes("placeholder") || databaseUrl.includes("USER:PASSWORD")) {
    return jsonError(
      "DATABASE_URL is still a placeholder. Add your Neon pooled connection string.",
      503,
    );
  }
  if (process.env.NODE_ENV === "production" && databaseUrl.includes("localhost")) {
    return jsonError(
      "DATABASE_URL is still localhost. Add the Neon pooled URL in Vercel, then redeploy.",
      503,
    );
  }

  const message = error instanceof Error ? error.message : "";
  if (message.includes("Missing required environment variable")) {
    return jsonError(`${message}. Add it in Vercel → Settings → Environment Variables, then redeploy.`, 503);
  }
  if (
    message.includes("Can't reach database") ||
    message.includes("ECONNREFUSED") ||
    message.includes("ENOTFOUND") ||
    message.includes("denied access on the database") ||
    message.includes("WebSocket") ||
    message.includes("fetch failed")
  ) {
    return jsonError(
      "Could not connect to the database. Check DATABASE_URL (Neon pooled) and redeploy.",
      503,
    );
  }
  if (
    message.includes("does not exist") ||
    message.includes("P2021") ||
    message.includes("P1001")
  ) {
    return jsonError(
      "The database has no LiveShift tables yet. Set DATABASE_URL and DATABASE_URL_UNPOOLED, then redeploy so migrations can run.",
      503,
    );
  }

  if (process.env.NODE_ENV !== "production" && message) {
    return jsonError(message, 500);
  }

  return jsonError("Something went wrong", 500);
}
