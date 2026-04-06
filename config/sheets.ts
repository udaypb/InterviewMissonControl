import type { CompanyRow, DashboardSummaryRow, DailyPlanRow, InterviewRow, RecruiterNoteRow, RoundRow, SheetName, SkillGapRow, SkillRow, SyncLogRow, TaskRow, BehavioralStoryRow } from "@/lib/datastore/types";

export const spreadsheetTitle = "Interview Mission Control";

export const sheetDefinitions = {
  interviews: [
    "company",
    "role",
    "event_id",
    "calendar_source",
    "date",
    "start_time",
    "end_time",
    "round_type",
    "status",
    "interviewer",
    "meeting_link",
    "notes",
    "last_synced_at"
  ],
  rounds: [
    "company",
    "round_name",
    "date",
    "time",
    "status",
    "interviewer",
    "format",
    "notes"
  ],
  tasks: [
    "task_id",
    "task",
    "company",
    "category",
    "priority",
    "status",
    "due_date",
    "estimated_minutes",
    "source",
    "notes",
    "last_updated"
  ],
  daily_plan: [
    "date",
    "slot",
    "task_id",
    "focus_area",
    "priority",
    "notes"
  ],
  companies: [
    "company",
    "h1b_sponsorship",
    "salary_band",
    "target_level",
    "priority",
    "recruiter",
    "next_step",
    "status",
    "notes"
  ],
  recruiter_notes: [
    "company",
    "recruiter_name",
    "last_contact_date",
    "next_step",
    "notes"
  ],
  skills: [
    "skill",
    "category",
    "progress_percent",
    "target_percent",
    "last_updated"
  ],
  skill_gaps: [
    "company",
    "skill",
    "gap_score",
    "notes"
  ],
  behavioral_stories: [
    "story_id",
    "title",
    "theme",
    "company_fit",
    "strength_score",
    "notes"
  ],
  dashboard_summary: [
    "key",
    "value",
    "last_updated"
  ],
  sync_log: [
    "timestamp",
    "sync_type",
    "status",
    "details"
  ]
} as const satisfies Record<SheetName, readonly string[]>;

const today = "2026-04-05";

export const sheetSamples: {
  interviews: InterviewRow[];
  rounds: RoundRow[];
  tasks: TaskRow[];
  daily_plan: DailyPlanRow[];
  companies: CompanyRow[];
  recruiter_notes: RecruiterNoteRow[];
  skills: SkillRow[];
  skill_gaps: SkillGapRow[];
  behavioral_stories: BehavioralStoryRow[];
  dashboard_summary: DashboardSummaryRow[];
  sync_log: SyncLogRow[];
} = {
  interviews: [
    {
      company: "Stripe",
      role: "Senior Software Engineer",
      event_id: "sample-stripe-phone-screen",
      calendar_source: "bootstrap",
      date: "2026-04-09",
      start_time: "10:00 AM",
      end_time: "11:00 AM",
      round_type: "Phone Screen",
      status: "scheduled",
      interviewer: "Jordan Lee",
      meeting_link: "https://meet.google.com/example-stripe",
      notes: "Anchor on platform reliability wins.",
      last_synced_at: today
    },
    {
      company: "Anthropic",
      role: "Product Engineer",
      event_id: "sample-anthropic-hm",
      calendar_source: "bootstrap",
      date: "2026-04-12",
      start_time: "02:00 PM",
      end_time: "03:00 PM",
      round_type: "Hiring Manager",
      status: "scheduled",
      interviewer: "Riley Chen",
      meeting_link: "https://meet.google.com/example-anthropic",
      notes: "Need sharper AI safety narrative.",
      last_synced_at: today
    }
  ],
  rounds: [
    {
      company: "Stripe",
      round_name: "Technical Screen",
      date: "2026-04-08",
      time: "10:00 AM",
      status: "scheduled",
      interviewer: "Jordan Lee",
      format: "virtual",
      notes: "Practice payments edge cases."
    },
    {
      company: "Anthropic",
      round_name: "Hiring Manager",
      date: "2026-04-11",
      time: "02:00 PM",
      status: "scheduled",
      interviewer: "Riley Chen",
      format: "virtual",
      notes: "Expect product intuition prompts."
    }
  ],
  tasks: [
    {
      task_id: "TASK-001",
      task: "Rehearse payment failure story",
      company: "Stripe",
      category: "behavioral",
      priority: "high",
      status: "in_progress",
      due_date: "2026-04-06",
      estimated_minutes: "45",
      source: "manual",
      notes: "Keep structure tight.",
      last_updated: today
    },
    {
      task_id: "TASK-002",
      task: "Refresh distributed systems notes",
      company: "Stripe",
      category: "coding",
      priority: "high",
      status: "todo",
      due_date: "2026-04-07",
      estimated_minutes: "90",
      source: "manual",
      notes: "Focus on consistency tradeoffs.",
      last_updated: today
    },
    {
      task_id: "TASK-003",
      task: "Prepare AI product strategy examples",
      company: "Anthropic",
      category: "strategy",
      priority: "medium",
      status: "todo",
      due_date: "2026-04-08",
      estimated_minutes: "60",
      source: "manual",
      notes: "Tie to trust and safety.",
      last_updated: today
    }
  ],
  daily_plan: [
    {
      date: today,
      slot: "Now",
      task_id: "TASK-001",
      focus_area: "Behavioral Storycraft",
      priority: "high",
      notes: "Run the story twice without notes."
    },
    {
      date: today,
      slot: "PM",
      task_id: "TASK-002",
      focus_area: "System Design Depth",
      priority: "high",
      notes: "Review incidents and scaling tradeoffs."
    },
    {
      date: today,
      slot: "Eve",
      task_id: "TASK-003",
      focus_area: "Company Positioning",
      priority: "medium",
      notes: "Map examples to Anthropic mission."
    }
  ],
  companies: [
    {
      company: "Stripe",
      h1b_sponsorship: "Yes",
      salary_band: "$240k-$320k + equity",
      target_level: "Senior",
      priority: "high",
      recruiter: "Taylor Morgan",
      next_step: "Confirm onsite loop timeline",
      status: "active",
      notes: "Lean into platform scale, judgment, and incident response credibility."
    },
    {
      company: "Anthropic",
      h1b_sponsorship: "Case-by-case",
      salary_band: "$260k-$380k + equity",
      target_level: "Senior+",
      priority: "medium",
      recruiter: "Sam Patel",
      next_step: "Await scheduling packet",
      status: "active",
      notes: "Frame product thinking through trust, safety, and model behavior."
    }
  ],
  recruiter_notes: [
    {
      company: "Stripe",
      recruiter_name: "Taylor Morgan",
      last_contact_date: "2026-04-04",
      next_step: "Send availability tonight",
      notes: "Responsive and direct."
    },
    {
      company: "Anthropic",
      recruiter_name: "Sam Patel",
      last_contact_date: "2026-04-03",
      next_step: "Share panel topics once confirmed",
      notes: "Still waiting on the loop packet."
    }
  ],
  skills: [
    {
      skill: "Distributed Systems",
      category: "Technical",
      progress_percent: "74",
      target_percent: "90",
      last_updated: today
    },
    {
      skill: "Behavioral Storytelling",
      category: "Communication",
      progress_percent: "68",
      target_percent: "88",
      last_updated: today
    },
    {
      skill: "Product Strategy",
      category: "Product",
      progress_percent: "61",
      target_percent: "82",
      last_updated: today
    }
  ],
  skill_gaps: [
    {
      company: "Stripe",
      skill: "Distributed Systems",
      gap_score: "18",
      notes: "Need sharper examples on failure isolation."
    },
    {
      company: "Anthropic",
      skill: "Product Strategy",
      gap_score: "24",
      notes: "Need stronger product judgment with safety lens."
    }
  ],
  behavioral_stories: [
    {
      story_id: "STORY-001",
      title: "Recovered a failing launch",
      theme: "ownership",
      company_fit: "Stripe",
      strength_score: "82",
      notes: "Good for urgency and customer trust."
    },
    {
      story_id: "STORY-002",
      title: "Shifted roadmap after new signal",
      theme: "judgment",
      company_fit: "Anthropic",
      strength_score: "76",
      notes: "Needs tighter AI relevance."
    }
  ],
  dashboard_summary: [
    {
      key: "last_sync_status",
      value: "bootstrap-ready",
      last_updated: today
    },
    {
      key: "last_sync_at",
      value: today,
      last_updated: today
    }
  ],
  sync_log: [
    {
      timestamp: today,
      sync_type: "bootstrap",
      status: "seeded",
      details: "Initialized headers and sample rows."
    }
  ]
};
