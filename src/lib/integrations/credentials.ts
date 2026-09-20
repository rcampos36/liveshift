import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { IntegrationCredentialError } from "@/lib/integrations/errors";
import { getIntegrationSecret } from "@/lib/env";

const VERSION = 1;

function encryptionKey() {
  return createHash("sha256").update(getIntegrationSecret()).digest();
}

export function encryptCredentials(credentials: Record<string, string>) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(credentials), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from([VERSION]), iv, tag, encrypted]).toString("base64");
}

export function decryptCredentials(payload: string): Record<string, string> {
  try {
    const buffer = Buffer.from(payload, "base64");
    if (buffer.length < 30 || buffer[0] !== VERSION) {
      throw new IntegrationCredentialError("Stored credentials are unreadable");
    }

    const iv = buffer.subarray(1, 13);
    const tag = buffer.subarray(13, 29);
    const data = buffer.subarray(29);
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
    decipher.setAuthTag(tag);
    const json = Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
    const parsed = JSON.parse(json) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
    );
  } catch (error) {
    if (error instanceof IntegrationCredentialError) {
      throw error;
    }
    throw new IntegrationCredentialError("Stored credentials are unreadable");
  }
}

export function mergeCredentials(
  existing: Record<string, string>,
  incoming: Record<string, string | null | undefined>,
) {
  const next = { ...existing };
  for (const [key, value] of Object.entries(incoming)) {
    const trimmed = value?.trim() ?? "";
    if (!trimmed) {
      delete next[key];
      continue;
    }
    next[key] = trimmed;
  }
  return next;
}

export function credentialFieldNames(credentials: Record<string, string>) {
  return Object.keys(credentials).sort();
}
