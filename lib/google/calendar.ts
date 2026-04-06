import { google } from "googleapis";
import type { calendar_v3 } from "googleapis";

import { getCalendarAuth } from "@/lib/google/auth";
import { getRollingWindow } from "@/lib/utils/date";
import { getValidatedEnv } from "@/lib/utils/validation";

export async function listCalendarEvents() {
  const env = getValidatedEnv();
  if (env.GOOGLE_CALENDAR_ID === "primary" && !env.GOOGLE_CALENDAR_IMPERSONATE_USER) {
    throw new Error(
      "GOOGLE_CALENDAR_ID=primary requires GOOGLE_CALENDAR_IMPERSONATE_USER for a user's primary calendar."
    );
  }

  const auth = getCalendarAuth();
  const calendar = google.calendar({ version: "v3", auth });
  const window = getRollingWindow();

  const response = await calendar.events.list({
    calendarId: env.GOOGLE_CALENDAR_ID,
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 50,
    timeMin: window.timeMin,
    timeMax: window.timeMax
  } as calendar_v3.Params$Resource$Events$List);

  return response.data.items ?? [];
}
