import { google } from "googleapis";

import { getValidatedEnv } from "@/lib/utils/validation";

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";

function formatPrivateKey(privateKey: string) {
  return privateKey.replace(/\\n/g, "\n");
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
