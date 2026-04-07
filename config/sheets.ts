import type { BehavioralBankRow, BehavioralStoryRow, CompanyRow, DashboardSummaryRow, DailyPlanRow, InterviewRow, RecruiterNoteRow, ResourceRow, RoundRow, SheetName, SkillGapRow, SkillRow, SyncLogRow, TaskRow } from "@/lib/datastore/types";

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
    "priority",
    "next_step",
    "interviewer",
    "format",
    "notes",
    "is_latest_for_company",
    "is_next_upcoming"
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
  resources: [
    "resource_id",
    "title",
    "category",
    "company",
    "url",
    "status",
    "purpose",
    "notes"
  ],
  skills: [
    "skill_id",
    "skill",
    "level",
    "category",
    "domain",
    "subcategory",
    "topic",
    "parent_skill",
    "item_type",
    "is_checked",
    "progress_percent",
    "target_percent",
    "notes",
    "last_updated",
    "sort_order"
  ],
  skill_gaps: [
    "company",
    "skill",
    "gap_score",
    "notes"
  ],
  behavioral_bank: [
    "story_id",
    "title",
    "primary_theme",
    "secondary_themes",
    "companies",
    "status",
    "use_for",
    "story",
    "company_calibration",
    "notes"
  ],
  behavioral_stories: [
    "story_id",
    "title",
    "theme",
    "company_fit",
    "strength_score",
    "resume_anchor",
    "use_for",
    "situation",
    "task",
    "action",
    "result",
    "reflection",
    "delivery_notes",
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
  resources: ResourceRow[];
  skills: SkillRow[];
  skill_gaps: SkillGapRow[];
  behavioral_bank: BehavioralBankRow[];
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
      priority: "high",
      next_step: "Prepare examples and system tradeoffs",
      interviewer: "Jordan Lee",
      format: "virtual",
      notes: "Practice payments edge cases.",
      is_latest_for_company: "false",
      is_next_upcoming: "true"
    },
    {
      company: "Anthropic",
      round_name: "Hiring Manager",
      date: "2026-04-11",
      time: "02:00 PM",
      status: "scheduled",
      priority: "medium",
      next_step: "Expect product intuition prompts",
      interviewer: "Riley Chen",
      format: "virtual",
      notes: "Expect product intuition prompts.",
      is_latest_for_company: "false",
      is_next_upcoming: "true"
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
  resources: [
    {
      resource_id: "resource-1",
      title: "Stripe Incident Stories",
      category: "Behavioral",
      company: "Stripe",
      url: "https://example.com/stripe-stories",
      status: "active",
      purpose: "Reliability, incident response, and judgment prep",
      notes: "Use for reliability, incident response, and judgment prep."
    },
    {
      resource_id: "resource-2",
      title: "Anthropic Product Notes",
      category: "Company Research",
      company: "Anthropic",
      url: "https://example.com/anthropic-notes",
      status: "active",
      purpose: "Company and product prep",
      notes: "Review before product and AI safety conversations."
    }
  ],
  skills: [
    {
      skill_id: "skill-distributed-systems",
      skill: "Distributed Systems",
      level: "CATEGORY",
      category: "Technical",
      domain: "Distributed Systems",
      subcategory: "",
      topic: "",
      parent_skill: "",
      item_type: "domain",
      is_checked: "",
      progress_percent: "74",
      target_percent: "90",
      notes: "Medium risk",
      last_updated: today,
      sort_order: "1"
    },
    {
      skill_id: "skill-behavioral-storytelling",
      skill: "Behavioral Storytelling",
      level: "CATEGORY",
      category: "Communication",
      domain: "Behavioral Storytelling",
      subcategory: "",
      topic: "",
      parent_skill: "",
      item_type: "domain",
      is_checked: "",
      progress_percent: "68",
      target_percent: "88",
      notes: "High risk under pressure",
      last_updated: today,
      sort_order: "2"
    },
    {
      skill_id: "skill-product-strategy",
      skill: "Product Strategy",
      level: "CATEGORY",
      category: "Product",
      domain: "Product Strategy",
      subcategory: "",
      topic: "",
      parent_skill: "",
      item_type: "domain",
      is_checked: "",
      progress_percent: "61",
      target_percent: "82",
      notes: "Medium risk",
      last_updated: today,
      sort_order: "3"
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
  behavioral_bank: [
    {
      story_id: "S1",
      title: "$10M Revenue Loss",
      primary_theme: "Ownership",
      secondary_themes: "Failure, Testing, Systems",
      companies: "Microsoft, Meta, Netflix, Google",
      status: "Ready",
      use_for: "Failure, Mistake, Ownership",
      story: "At Amazon Ads, I rolled out an experiment path in a high-scale auction system and missed a critical cross-component integration test. The bug made it to production and contributed to a significant revenue impact. I led the root cause analysis, tightened experiment-path coverage, improved rollout gates, and added stronger monitoring so this class of failure would be caught earlier.",
      company_calibration: "Microsoft: humility and learning. Meta: scale and response speed. Netflix: judgment and redesign. Google: testing rigor.",
      notes: "Anchor on ownership and how my operating model changed after the incident."
    },
    {
      story_id: "S2",
      title: "Multi-Signal Auction Framework",
      primary_theme: "Design",
      secondary_themes: "Concurrency, Ambiguity, Scale",
      companies: "Microsoft, Meta, Netflix, Google",
      status: "Ready",
      use_for: "Complex system, Ambiguity, Design decisions",
      story: "In the ads auction system, multiple real-time signals arrived at different times with different latency profiles. I reframed the problem into a first-class signal framework with clear timeout budgets, precedence rules, and deterministic orchestration so new signals could be added without rewriting core auction logic.",
      company_calibration: "Meta: scalability and performance. Netflix: clean abstractions. Microsoft: collaboration. Google: tradeoff reasoning.",
      notes: "Use this for system design and structured problem solving."
    },
    {
      story_id: "S3",
      title: "AWS ECS Ramp-Up",
      primary_theme: "Learning",
      secondary_themes: "Execution, Pressure, Ambiguity",
      companies: "Microsoft, Meta, Google, Netflix",
      status: "Ready",
      use_for: "Learning quickly, New domain, Pressure",
      story: "I moved from a Google Cloud/Firebase background into AWS ECS and had to deliver a proof of concept in three weeks at roughly 10K TPS. I focused on first principles around scaling, networking, and deployments, then used CDK and targeted observability to get productive quickly instead of trying to memorize the entire platform.",
      company_calibration: "Microsoft: growth mindset. Meta: execution speed. Google: learning method. Netflix: ownership under ambiguity.",
      notes: "Good story for fast ramp-up and practical learning."
    },
    {
      story_id: "S4",
      title: "Observability System",
      primary_theme: "Debugging",
      secondary_themes: "Productivity, Reliability",
      companies: "All",
      status: "Ready",
      use_for: "Debugging, Team productivity, Reliability",
      story: "I realized our debugging pain in a distributed system was really a visibility problem. I built a waterfall-style dashboard that made request flow and downstream timing understandable across services, which reduced time-to-resolution and gave the team a shared debugging language.",
      company_calibration: "Broadly useful for operational excellence and team leverage.",
      notes: "Key line: debugging was not the problem; visibility was."
    },
    {
      story_id: "S5",
      title: "Latency Optimization",
      primary_theme: "Performance",
      secondary_themes: "Reliability, Customer Impact",
      companies: "All",
      status: "Medium",
      use_for: "Performance, Customer impact, Reliability",
      story: "Focus on identifying the true bottleneck, protecting the critical path with timeouts and safeguards, and improving latency without sacrificing correctness.",
      company_calibration: "Best when the interviewer wants quantitative performance thinking.",
      notes: "Needs a tighter before/after metric."
    },
    {
      story_id: "S6",
      title: "AGI Orchestrator Work",
      primary_theme: "Innovation",
      secondary_themes: "AI, Scale, Systems",
      companies: "Meta, Netflix",
      status: "Strong",
      use_for: "Innovation, AI work, Forward-looking thinking",
      story: "I worked on agent orchestration for Nova, focusing on how tools, agents, and context should be coordinated robustly at scale. The interesting challenge was not only model invocation, but designing orchestration that could stay coherent as usage scaled toward millions of users.",
      company_calibration: "Use selectively as the strongest AI differentiator.",
      notes: "Resume spike. Use when the role values AI systems thinking."
    },
    {
      story_id: "S7",
      title: "Conflict and Communication Growth",
      primary_theme: "Communication",
      secondary_themes: "Conflict, Growth",
      companies: "Microsoft",
      status: "Medium",
      use_for: "Disagreement, Team dynamics, Growth",
      story: "My natural style is to think deeply before speaking, which sometimes meant I entered important conversations later than I should have. I learned to surface concerns earlier, even before my thinking was perfectly complete, so the team could benefit from my analysis without paying a coordination cost.",
      company_calibration: "Best for self-awareness and growth questions.",
      notes: "Keep this candid and specific."
    },
    {
      story_id: "S8",
      title: "Proactive System Improvement",
      primary_theme: "Leadership",
      secondary_themes: "Initiative, Systems",
      companies: "All",
      status: "Medium",
      use_for: "Initiative, Leadership without authority, Systems improvement",
      story: "I proactively improved the surrounding engineering system instead of only solving the immediate task, especially around observability, logging, and infra quality. That created leverage for the team and reduced repeated friction over time.",
      company_calibration: "Use when asked about initiative and raising the engineering bar.",
      notes: "Tie to a concrete improvement rather than speaking abstractly."
    }
  ],
  behavioral_stories: [
    {
      story_id: "STORY-001",
      title: "Recovered a failing launch",
      theme: "ownership",
      company_fit: "Stripe",
      strength_score: "82",
      resume_anchor: "Amazon Ads",
      use_for: "ownership, failure",
      situation: "Critical launch went sideways under production pressure.",
      task: "Contain impact and restore confidence quickly.",
      action: "Coordinated response, tightened the rollout path, and aligned teams around the fix.",
      result: "Stabilized the launch and created a better path for future rollouts.",
      reflection: "The lesson was to contain fast, communicate clearly, and fix the system, not just the incident.",
      delivery_notes: "Keep the arc crisp and grounded.",
      notes: "Good for urgency and customer trust."
    },
    {
      story_id: "STORY-002",
      title: "Shifted roadmap after new signal",
      theme: "judgment",
      company_fit: "Anthropic",
      strength_score: "76",
      resume_anchor: "Product strategy work",
      use_for: "judgment, prioritization",
      situation: "A new signal invalidated the prior roadmap assumptions.",
      task: "Re-evaluate the plan without thrashing the team.",
      action: "Reframed the problem, aligned stakeholders, and updated the plan around the new constraint.",
      result: "Preserved delivery momentum while moving the team toward the better decision.",
      reflection: "Judgment is often about changing direction early enough, not defending the old plan.",
      delivery_notes: "Emphasize why the decision changed.",
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
