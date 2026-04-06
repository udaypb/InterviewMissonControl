import { google } from "googleapis";

import { getValidatedEnv } from "@/lib/utils/validation";

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";

function formatPrivateKey(privateKey: string) {
  let normalized = privateKey.trim();

  // Vercel env vars are often pasted with wrapping quotes.
  if (
    (normalized.startsWith("\"") && normalized.endsWith("\"")) ||
    (normalized.startsWith("'") && normalized.endsWith("'"))
  ) {
    normalized = normalized.slice(1, -1);
  }

  normalized = normalized
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n");

  // Support base64-encoded PEM payloads as a fallback.
  if (!normalized.includes("BEGIN") && /^[A-Za-z0-9+/=\s]+$/.test(normalized)) {
    try {
      const decoded = Buffer.from(normalized, "base64").toString("utf8").trim();
      if (decoded.includes("BEGIN")) {
        normalized = decoded;
      }
    } catch {
      // Keep the original value when base64 decoding is not applicable.
    }
  }

  return normalized;
}

export function createGoogleJwt(
  scopes: string[],
  subject?: string
) {
  const env = getValidatedEnv();

  return new google.auth.JWT({
    email: env.GOOGLE_CLIENT_EMAIL,
    key: formatPrivateKey(env.GOOGLE_PRIVATE_KEY),
    scopes,
    subject
  });
}

export function getSheetsAuth() {
  return createGoogleJwt([SHEETS_SCOPE]);
}

export function getDriveAuth() {
  return createGoogleJwt([DRIVE_SCOPE]);
}
