import "server-only";

import { createHash, randomBytes } from "crypto";

export function generateOpaqueToken() {
  return randomBytes(32).toString("hex");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
