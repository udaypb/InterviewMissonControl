export type SheetName =
  | "interviews"
  | "rounds"
  | "tasks"
  | "daily_plan"
  | "companies"
  | "recruiter_notes"
  | "skills"
  | "skill_gaps"
  | "behavioral_stories"
  | "dashboard_summary"
  | "sync_log";

export interface InterviewRow {
  company: string;
  role: string;
  event_id: string;
  calendar_source: string;
  date: string;
  start_time: string;
  end_time: string;
  round_type: string;
  status: string;
  interviewer: string;
  meeting_link: string;
  notes: string;
  last_synced_at: string;
}

export interface RoundRow {
  company: string;
  round_name: string;
  date: string;
  time: string;
  status: string;
  interviewer: string;
  format: string;
  notes: string;
}

export interface TaskRow {
  task_id: string;
  task: string;
  company: string;
  category: string;
  priority: string;
  status: string;
  due_date: string;
  estimated_minutes: string;
  source: string;
  notes: string;
  last_updated: string;
}

export interface DailyPlanRow {
  date: string;
  slot: string;
  task_id: string;
  focus_area: string;
  priority: string;
  notes: string;
}

export interface CompanyRow {
  company: string;
  h1b_sponsorship: string;
  salary_band: string;
  target_level: string;
  priority: string;
  recruiter: string;
  next_step: string;
  status: string;
  notes: string;
}

export interface RecruiterNoteRow {
  company: string;
  recruiter_name: string;
  last_contact_date: string;
  next_step: string;
  notes: string;
}

export interface SkillRow {
  skill: string;
  category: string;
  progress_percent: string;
  target_percent: string;
  last_updated: string;
}

export interface SkillGapRow {
  company: string;
  skill: string;
  gap_score: string;
  notes: string;
}

export interface BehavioralStoryRow {
  story_id: string;
  title: string;
  theme: string;
  company_fit: string;
  strength_score: string;
  notes: string;
}

export interface DashboardSummaryRow {
  key: string;
  value: string;
  last_updated: string;
}

export interface SyncLogRow {
  timestamp: string;
  sync_type: string;
  status: string;
  details: string;
}

export interface StorageSnapshot {
  interviews: InterviewRow[];
  rounds: RoundRow[];
  tasks: TaskRow[];
  dailyPlan: DailyPlanRow[];
  companies: CompanyRow[];
  recruiterNotes: RecruiterNoteRow[];
  skills: SkillRow[];
  skillGaps: SkillGapRow[];
  behavioralStories: BehavioralStoryRow[];
  summaryRows: DashboardSummaryRow[];
  syncLog: SyncLogRow[];
}

export interface SummaryStat {
  label: string;
  value: string;
  detail: string;
}

export interface BattlePlanItem {
  id: string;
  slot: string;
  title: string;
  company: string;
  urgency: string;
  notes: string;
}

export interface FocusCard {
  variant: "purple" | "green" | "yellow";
  title: string;
  body: string;
}

export interface CompanyIntelCard {
  company: string;
  sponsorship: string;
  interviewProcess: string[];
  focusAreas: string[];
  tip: string;
  yourAngle: string;
  compensation: string;
  targetLevel: string;
  nextStep: string;
  recruiter: string;
  status: string;
}

export interface ProgressMetric {
  label: string;
  percent: number;
  detail: string;
}

export interface PriorityItem {
  id: string;
  label: string;
  company: string;
  score: number;
  reason: string;
  dueLabel: string;
}

export interface InterviewCalendarItem {
  company: string;
  roundType: string;
  dateLabel: string;
  timeLabel: string;
  status: string;
  interviewer: string;
  meetingLink: string;
}

export interface SkillMapItem {
  skill: string;
  category: string;
  progressPercent: number;
  targetPercent: number;
  weakestForCompany?: string;
}

export interface ResourceItem {
  title: string;
  subtitle: string;
  body: string;
}

export interface ConfigStatus {
  healthy: boolean;
  label: string;
  message: string;
  detail: string;
}

export interface DashboardPayload {
  generatedAt: string;
  lastSyncedAt: string;
  lastSyncStatus: string;
  syncMessage: string;
  activePipelines: number;
  topStats: SummaryStat[];
  battlePlan: BattlePlanItem[];
  mentorFocus: FocusCard[];
  companyIntel: CompanyIntelCard[];
  weeklyProgress: ProgressMetric[];
  priorities: PriorityItem[];
  interviewCalendar: InterviewCalendarItem[];
  skillMap: SkillMapItem[];
  codingTracker: TaskRow[];
  resources: ResourceItem[];
  weakestArea: string;
  configStatus: ConfigStatus;
}

export interface InterviewsPayload {
  interviews: InterviewCalendarItem[];
  rounds: RoundRow[];
  lastSyncedAt: string;
}

export interface TasksPayload {
  tasks: TaskRow[];
  dailyPlan: BattlePlanItem[];
  priorities: PriorityItem[];
}

export interface CompaniesPayload {
  companies: CompanyIntelCard[];
  recruiterNotes: RecruiterNoteRow[];
}

export interface SkillsPayload {
  skills: SkillMapItem[];
  skillGaps: SkillGapRow[];
  weakestArea: string;
}

export interface SyncResult {
  status: "success" | "error";
  message: string;
  syncedCount: number;
  lastSyncedAt: string;
  dashboard: DashboardPayload;
}

export interface DataStore {
  getDashboardSummary(): Promise<DashboardPayload>;
  getInterviews(): Promise<InterviewsPayload>;
  getTasks(): Promise<TasksPayload>;
  getCompanies(): Promise<CompaniesPayload>;
  getSkills(): Promise<SkillsPayload>;
  syncFromCalendar(): Promise<SyncResult>;
}
