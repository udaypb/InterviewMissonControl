import type { calendar_v3 } from "googleapis";

import { listCalendarEvents } from "@/lib/google/calendar";
import type { CompanyRow, InterviewRow } from "@/lib/datastore/types";
import { formatTimeLabel, isoDateFromDateTime } from "@/lib/utils/date";
import { compactText, titleCase } from "@/lib/utils/formatting";
import { isInterviewLikeEvent } from "@/lib/utils/validation";

function buildInterviewKey(row: Pick<InterviewRow, "company" | "date" | "start_time" | "round_type" | "interviewer">) {
  return [
    row.company.trim().toLowerCase(),
    row.date.trim(),
    row.start_time.trim().toLowerCase(),
    row.round_type.trim().toLowerCase(),
    row.interviewer.trim().toLowerCase()
  ].join("|");
}

function getManualNotes(existingMatches: InterviewRow[]) {
  return existingMatches
    .map((row) => row.notes.trim())
    .find((notes) => notes.length > 0) || "";
}

function getManualPriority(existingMatches: InterviewRow[], companyPriority: string) {
  return (
    existingMatches
      .map((row) => row.priority.trim())
      .find((priority) => priority.length > 0) ||
    companyPriority
  );
}

function inferCompany(summary: string, companies: CompanyRow[]): string {
  const normalized = summary.toLowerCase();
  const matchedCompany = companies.find((company) =>
    normalized.includes(company.company.toLowerCase())
  );

  if (matchedCompany) {
    return matchedCompany.company;
  }

  const cleaned = summary.split("-")[0]?.trim();
  return compactText(cleaned, "Unassigned");
}

function inferRoundType(summary: string, description: string) {
  const source = `${summary} ${description}`.toLowerCase();
  if (source.includes("behavioral")) {
    return "Behavioral";
  }
  if (source.includes("system design")) {
    return "System Design";
  }
  if (source.includes("technical")) {
    return "Technical";
  }
  if (source.includes("recruiter")) {
    return "Recruiter";
  }
  if (source.includes("assessment")) {
    return "Assessment";
  }
  if (source.includes("hiring manager")) {
    return "Hiring Manager";
  }
  return "Interview";
}

function inferStatus(event: calendar_v3.Schema$Event) {
  if (event.status === "cancelled") {
    return "cancelled";
  }

  const end = event.end?.dateTime ? new Date(event.end.dateTime) : null;
  if (end && end.getTime() < Date.now()) {
    return "completed";
  }

  return "scheduled";
}

function extractInterviewer(event: calendar_v3.Schema$Event) {
  const attendee = event.attendees?.find((candidate) => !candidate.self);
  return attendee?.displayName || attendee?.email || "";
}

function extractMeetingLink(event: calendar_v3.Schema$Event) {
  return (
    event.hangoutLink ||
    event.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === "video")?.uri ||
    ""
  );
}

function shouldSyncEvent(event: calendar_v3.Schema$Event) {
  const text = `${event.summary || ""} ${event.description || ""}`.trim();
  return text.length > 0 && isInterviewLikeEvent(text);
}

function normalizeEvent(
  event: calendar_v3.Schema$Event,
  companies: CompanyRow[],
  existingById: Map<string, InterviewRow>,
  calendarSource: string
): InterviewRow | null {
  if (!event.id || !shouldSyncEvent(event)) {
    return null;
  }

  const summary = event.summary || "Interview";
  const description = event.description || "";
  const existing = existingById.get(event.id);
  const company = inferCompany(summary, companies);
  const companyPriority =
    companies.find((candidate) => candidate.company === company)?.priority || "";
  const date = event.start?.dateTime ? isoDateFromDateTime(event.start.dateTime) : event.start?.date || "";
  const startTime = event.start?.dateTime ? formatTimeLabel(event.start.dateTime) : "";
  const endTime = event.end?.dateTime ? formatTimeLabel(event.end.dateTime) : "";

  return {
    company,
    role: existing?.role || titleCase(summary.split("-").slice(1).join(" ").trim() || "Interview Loop"),
    event_id: event.id,
    calendar_source: calendarSource,
    date,
    start_time: startTime,
    end_time: endTime,
    round_type: existing?.round_type || inferRoundType(summary, description),
    status: inferStatus(event),
    priority: existing?.priority || companyPriority,
    interviewer: extractInterviewer(event) || existing?.interviewer || "",
    meeting_link: extractMeetingLink(event) || existing?.meeting_link || "",
    notes: existing?.notes || "",
    last_synced_at: new Date().toISOString()
  };
}

export class CalendarSyncService {
  async syncInterviewEvents(
    existingInterviews: InterviewRow[],
    companies: CompanyRow[],
    calendarSource: string
  ) {
    const events = await listCalendarEvents();
    const existingById = new Map(existingInterviews.filter((row) => row.event_id).map((row) => [row.event_id, row]));
    const existingByKey = new Map(existingInterviews.map((row) => [buildInterviewKey(row), row]));
    const normalized = events
      .map((event: calendar_v3.Schema$Event) =>
        normalizeEvent(event, companies, existingById, calendarSource)
      )
      .filter((row: InterviewRow | null): row is InterviewRow => Boolean(row));

    const deduped = new Map<string, InterviewRow>();

    for (const row of normalized) {
      const key = row.event_id || buildInterviewKey(row);
      const fingerprint = buildInterviewKey(row);
      const noteCandidates = [
        existingById.get(row.event_id),
        existingByKey.get(fingerprint),
        deduped.get(key)
      ].filter((candidate): candidate is InterviewRow => Boolean(candidate));

      deduped.set(key, {
        ...existingByKey.get(fingerprint),
        ...existingById.get(row.event_id),
        ...row,
        priority: getManualPriority(noteCandidates, row.priority),
        notes: getManualNotes(noteCandidates) || row.notes
      });
    }

    return [...deduped.values()];
  }
}
