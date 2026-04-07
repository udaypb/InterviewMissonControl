import { z } from "zod";

import type {
  BehavioralBankRow,
  BehavioralStoryRow,
  CompanyRow,
  DashboardSummaryRow,
  DailyPlanRow,
  InterviewRow,
  RecruiterNoteRow,
  ResourceRow,
  RoundRow,
  SkillGapRow,
  SkillRow,
  SyncLogRow,
  TaskRow
} from "@/lib/datastore/types";

const stringField = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : ""),
  z.string()
);

const requiredEnvString = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : ""),
  z.string().min(1)
);

export const envSchema = z.object({
  GOOGLE_CLIENT_EMAIL: requiredEnvString,
  GOOGLE_PRIVATE_KEY: requiredEnvString,
  GOOGLE_SHEETS_SPREADSHEET_ID: requiredEnvString,
  GOOGLE_DRIVE_PROJECT_FOLDER_ID: stringField.optional(),
  NEXT_PUBLIC_APP_NAME: stringField.optional()
});

export const interviewRowSchema = z.object({
  company: stringField,
  role: stringField,
  event_id: stringField,
  calendar_source: stringField,
  date: stringField,
  start_time: stringField,
  end_time: stringField,
  round_type: stringField,
  status: stringField,
  interviewer: stringField,
  meeting_link: stringField,
  notes: stringField,
  last_synced_at: stringField
}) as z.ZodType<InterviewRow>;

export const roundRowSchema = z.object({
  company: stringField,
  round_name: stringField,
  date: stringField,
  time: stringField,
  status: stringField,
  priority: stringField,
  next_step: stringField,
  interviewer: stringField,
  format: stringField,
  notes: stringField,
  is_latest_for_company: stringField,
  is_next_upcoming: stringField
}) as z.ZodType<RoundRow>;

export const taskRowSchema = z.object({
  task_id: stringField,
  task: stringField,
  company: stringField,
  category: stringField,
  priority: stringField,
  status: stringField,
  due_date: stringField,
  estimated_minutes: stringField,
  source: stringField,
  notes: stringField,
  last_updated: stringField
}) as z.ZodType<TaskRow>;

export const dailyPlanRowSchema = z.object({
  date: stringField,
  slot: stringField,
  task_id: stringField,
  focus_area: stringField,
  priority: stringField,
  notes: stringField
}) as z.ZodType<DailyPlanRow>;

export const companyRowSchema = z.object({
  company: stringField,
  h1b_sponsorship: stringField,
  salary_band: stringField,
  target_level: stringField,
  priority: stringField,
  recruiter: stringField,
  next_step: stringField,
  status: stringField,
  notes: stringField
}) as z.ZodType<CompanyRow>;

export const recruiterNoteRowSchema = z.object({
  company: stringField,
  recruiter_name: stringField,
  last_contact_date: stringField,
  next_step: stringField,
  notes: stringField
}) as z.ZodType<RecruiterNoteRow>;

export const resourceRowSchema = z.object({
  resource_id: stringField,
  title: stringField,
  category: stringField,
  company: stringField,
  url: stringField,
  status: stringField,
  notes: stringField
}) as z.ZodType<ResourceRow>;

export const skillRowSchema = z.object({
  skill: stringField,
  category: stringField,
  progress_percent: stringField,
  target_percent: stringField,
  notes: stringField,
  last_updated: stringField
}) as z.ZodType<SkillRow>;

export const skillGapRowSchema = z.object({
  company: stringField,
  skill: stringField,
  gap_score: stringField,
  notes: stringField
}) as z.ZodType<SkillGapRow>;

export const behavioralBankRowSchema = z.object({
  story_id: stringField,
  title: stringField,
  primary_theme: stringField,
  secondary_themes: stringField,
  companies: stringField,
  status: stringField,
  use_for: stringField,
  story: stringField,
  company_calibration: stringField,
  notes: stringField
}) as z.ZodType<BehavioralBankRow>;

export const behavioralStoryRowSchema = z.object({
  story_id: stringField,
  title: stringField,
  theme: stringField,
  company_fit: stringField,
  strength_score: stringField,
  resume_anchor: stringField,
  use_for: stringField,
  situation: stringField,
  task: stringField,
  action: stringField,
  result: stringField,
  reflection: stringField,
  delivery_notes: stringField,
  notes: stringField
}) as z.ZodType<BehavioralStoryRow>;

export const dashboardSummaryRowSchema = z.object({
  key: stringField,
  value: stringField,
  last_updated: stringField
}) as z.ZodType<DashboardSummaryRow>;

export const syncLogRowSchema = z.object({
  timestamp: stringField,
  sync_type: stringField,
  status: stringField,
  details: stringField
}) as z.ZodType<SyncLogRow>;

export function parseRows<T>(
  rows: Record<string, string>[],
  schema: z.ZodType<T>
): T[] {
  const result: T[] = [];

  for (const row of rows) {
    const parsed = schema.safeParse(row);
    if (parsed.success) {
      result.push(parsed.data);
    }
  }

  return result;
}

export function getValidatedEnv() {
  return envSchema.parse(process.env);
}

export function hasRequiredGoogleConfig() {
  return envSchema.safeParse(process.env).success;
}

export function getConfigurationHealth() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    return {
      healthy: false,
      label: "Config missing",
      message: "Google credentials are incomplete.",
      detail: "Set GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, and GOOGLE_SHEETS_SPREADSHEET_ID."
    };
  }

  return {
    healthy: true,
    label: "Config healthy",
    message: "Google Sheets configuration looks valid.",
    detail: "API routes can read Sheets and build the dashboard from spreadsheet data."
  };
}

export function isInterviewLikeEvent(text: string): boolean {
  const normalized = text.toLowerCase();
  return [
    "interview",
    "onsite",
    "screen",
    "recruiter",
    "technical",
    "behavioral",
    "hiring manager",
    "loop",
    "assessment"
  ].some((keyword) => normalized.includes(keyword));
}
