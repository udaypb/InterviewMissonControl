import type {
  BattlePlanItem,
  CompanyIntelCard,
  ConfigStatus,
  DashboardPayload,
  DashboardSummaryRow,
  InterviewCalendarItem,
  PriorityItem,
  ProgressMetric,
  SkillMapItem,
  StorageSnapshot,
  SummaryStat,
  TaskRow
} from "@/lib/datastore/types";
import { compareIsoDates, formatDateLabel, formatDateTimeLabel, humanNowLine, relativeUrgency } from "@/lib/utils/date";
import { clampPercent, compactText } from "@/lib/utils/formatting";

function makeStableId(...parts: string[]) {
  return parts
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

function getPriorityRank(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized === "highest") {
    return 5;
  }
  if (normalized === "very high") {
    return 4;
  }
  if (normalized === "high") {
    return 3;
  }
  if (normalized === "medium") {
    return 2;
  }
  if (normalized === "low") {
    return 1;
  }
  return 0;
}

function getFallbackTargetPercent(progressPercent: number) {
  if (progressPercent >= 85) {
    return 95;
  }
  if (progressPercent >= 70) {
    return 90;
  }
  return 85;
}

function getInterviewCalendar(snapshot: StorageSnapshot): InterviewCalendarItem[] {
  return [...snapshot.interviews]
    .sort((left, right) => compareIsoDates(left.date, right.date))
    .map((row) => ({
      company: row.company,
      roundType: row.round_type,
      dateLabel: formatDateLabel(row.date),
      timeLabel: row.start_time ? `${row.start_time}${row.end_time ? ` - ${row.end_time}` : ""}` : "Time TBD",
      status: row.status,
      interviewer: row.interviewer,
      meetingLink: row.meeting_link
    }));
}

function scoreTask(task: TaskRow) {
  const dueTime = new Date(task.due_date).getTime();
  const dueDays = Number.isNaN(dueTime) ? 7 : Math.ceil((dueTime - Date.now()) / 86_400_000);
  const priorityWeight = getPriorityRank(task.priority) * 12 || 12;
  const statusPenalty = task.status.toLowerCase() === "done" ? -100 : 0;
  return priorityWeight + Math.max(0, 10 - dueDays) * 4 + statusPenalty;
}

function getPriorities(snapshot: StorageSnapshot): PriorityItem[] {
  return snapshot.tasks
    .filter((task) => task.status.toLowerCase() !== "done")
    .map((task, index) => ({
      id: task.task_id || makeStableId(task.task, task.company, String(index + 1)),
      label: task.task,
      company: task.company || "General",
      score: scoreTask(task),
      reason: compactText(task.notes, `${task.category} preparation`),
      dueLabel: task.due_date ? formatDateLabel(task.due_date) : "Unscheduled"
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 6);
}

function getBattlePlan(snapshot: StorageSnapshot): BattlePlanItem[] {
  const taskMap = new Map(snapshot.tasks.map((task) => [task.task_id, task]));
  const prioritizedPlan = snapshot.dailyPlan
    .map((row, index) => {
      const task = taskMap.get(row.task_id);
      return {
        id: row.task_id || makeStableId(row.slot, row.focus_area, String(index + 1)),
        slot: row.slot || relativeUrgency(row.date),
        title: task?.task || row.focus_area,
        company: task?.company || "General",
        urgency: row.priority || task?.priority || "derived",
        notes: row.notes || task?.notes || row.focus_area
      };
    })
    .slice(0, 4);

  if (prioritizedPlan.length > 0) {
    return prioritizedPlan;
  }

  return getPriorities(snapshot).slice(0, 4).map((item) => ({
    id: item.id,
    slot: relativeUrgency(item.dueLabel),
    title: item.label,
    company: item.company,
    urgency: "derived",
    notes: item.reason
  }));
}

function getCompanyIntel(snapshot: StorageSnapshot): CompanyIntelCard[] {
  const roundsByCompany = new Map<string, string[]>();
  for (const round of snapshot.rounds) {
    const list = roundsByCompany.get(round.company) ?? [];
    list.push(`${round.round_name} · ${formatDateTimeLabel(round.date, round.time)} · ${round.status}`);
    roundsByCompany.set(round.company, list);
  }

  const gapsByCompany = new Map<string, string[]>();
  for (const gap of snapshot.skillGaps) {
    const list = gapsByCompany.get(gap.company) ?? [];
    list.push(`${gap.skill}: ${compactText(gap.notes, `gap score ${gap.gap_score}`)}`);
    gapsByCompany.set(gap.company, list);
  }

  const notesByCompany = new Map(snapshot.recruiterNotes.map((note) => [note.company, note]));

  return snapshot.companies.map((company) => {
    const recruiterNote = notesByCompany.get(company.company);
    const interviewEvents = snapshot.interviews
      .filter((row) => row.company === company.company)
      .map((row) => `${row.round_type} · ${formatDateTimeLabel(row.date, row.start_time)} · ${row.status}`);

    return {
      company: company.company,
      sponsorship: compactText(company.h1b_sponsorship, "Not yet logged"),
      interviewProcess: roundsByCompany.get(company.company) ||
        (interviewEvents.length > 0 ? interviewEvents : [company.status ? `${company.status} stage` : "No rounds logged yet."]),
      focusAreas:
        gapsByCompany.get(company.company) ??
        [compactText(company.notes, "No specific focus area logged yet.")],
      tip: recruiterNote?.notes || compactText(company.next_step, "Keep this pipeline warm."),
      yourAngle: compactText(company.notes, "Frame the strongest operator story for this company."),
      compensation: compactText(company.salary_band, "Comp not logged"),
      targetLevel: compactText(company.target_level, "Level not logged"),
      nextStep: compactText(company.next_step, recruiterNote?.next_step || "Next step not logged"),
      recruiter: compactText(company.recruiter, recruiterNote?.recruiter_name || "Recruiter not logged"),
      status: compactText(company.status, company.priority || "Tracking")
    };
  });
}

function getSkillMap(snapshot: StorageSnapshot): SkillMapItem[] {
  const weakestForSkill = new Map(snapshot.skillGaps.map((gap) => [gap.skill, gap.company]));

  return snapshot.skills.map((skill) => ({
    skill: skill.skill,
    category: compactText(skill.category, "General"),
    progressPercent: clampPercent(skill.progress_percent),
    targetPercent: clampPercent(skill.target_percent) || getFallbackTargetPercent(clampPercent(skill.progress_percent)),
    weakestForCompany: weakestForSkill.get(skill.skill)
  }));
}

function getWeeklyProgress(snapshot: StorageSnapshot): ProgressMetric[] {
  const skills = getSkillMap(snapshot);
  const completedTasks = snapshot.tasks.filter((task) => task.status.toLowerCase() === "done").length;
  const storyStrength = snapshot.behavioralStories.length
    ? snapshot.behavioralStories.reduce((sum, story) => sum + clampPercent(story.strength_score), 0) / snapshot.behavioralStories.length
    : 0;

  return [
    {
      label: "Core Skill Readiness",
      percent: Math.round(skills.reduce((sum, skill) => sum + skill.progressPercent, 0) / Math.max(1, skills.length)),
      detail: `${skills.length} tracked skills`
    },
    {
      label: "Weekly Task Execution",
      percent: Math.round((completedTasks / Math.max(1, snapshot.tasks.length)) * 100),
      detail: `${completedTasks}/${snapshot.tasks.length} tasks completed`
    },
    {
      label: "Behavioral Story Strength",
      percent: Math.round(storyStrength),
      detail: `${snapshot.behavioralStories.length} stories in rotation`
    }
  ];
}

function getTopStats(snapshot: StorageSnapshot, priorities: PriorityItem[]): SummaryStat[] {
  const nextInterview = [...snapshot.interviews].sort((left, right) => compareIsoDates(left.date, right.date))[0];
  const weekCount = snapshot.interviews.filter((row) => {
    const diff = new Date(row.date).getTime() - Date.now();
    return diff >= 0 && diff <= 7 * 86_400_000;
  }).length;
  const urgentInterview = [...snapshot.interviews].sort(
    (left, right) => getPriorityRank(right.priority) - getPriorityRank(left.priority)
  )[0];

  return [
    {
      label: "Next Interview",
      value: nextInterview ? `${nextInterview.company} · ${nextInterview.round_type}` : "No interview set",
      detail: nextInterview ? formatDateTimeLabel(nextInterview.date, nextInterview.start_time) : "Run a sync to pull calendar events"
    },
    {
      label: "This Week",
      value: weekCount > 0 ? `${weekCount} interviews scheduled` : "No interviews scheduled",
      detail: `${snapshot.interviews.length} total interview events on the board`
    },
    {
      label: "Urgent Item",
      value: priorities[0]?.label || urgentInterview?.company || "Queue stable",
      detail:
        priorities[0]?.reason ||
        (urgentInterview
          ? compactText(urgentInterview.notes, `${urgentInterview.round_type} is highest priority`)
          : "No immediate blocker")
    }
  ];
}

function getMentorFocus(snapshot: StorageSnapshot, priorities: PriorityItem[], skillMap: SkillMapItem[]) {
  const weakest = [...skillMap].sort((left, right) => left.progressPercent - right.progressPercent)[0];
  const topCompany = [...snapshot.companies].sort((left, right) =>
    getPriorityRank(right.priority) - getPriorityRank(left.priority)
  )[0];

  return [
    {
      variant: "purple" as const,
      title: "Principal Insight",
      body: priorities[0]
        ? `Move ${priorities[0].label} first. It is creating the strongest readiness delta for ${priorities[0].company}.`
        : "Queue is calm. Use the slack to sharpen one story and one systems example."
    },
    {
      variant: "green" as const,
      title: "Sponsorship Strategy",
      body: topCompany
        ? `${topCompany.company} remains the highest leverage lane. Keep ${compactText(topCompany.h1b_sponsorship, "sponsorship context TBD").toLowerCase()} context explicit and stay close to ${compactText(topCompany.next_step, "the next step")}.`
        : "No company priorities are loaded yet."
    },
    {
      variant: "yellow" as const,
      title: "Positioning Angle",
      body: weakest
        ? `${weakest.skill} is the softest signal. Raise it toward ${weakest.targetPercent}% before compensation and level conversations tighten.`
        : "Skill map is empty. Seed progress to unlock positioning guidance."
    }
  ];
}

function getResources(snapshot: StorageSnapshot) {
  return snapshot.companies.slice(0, 3).map((company) => ({
    title: company.company,
    subtitle: company.recruiter || company.status || "No recruiter",
    body: compactText(company.notes, company.next_step)
  }));
}

function getSummaryRowMap(rows: DashboardSummaryRow[]) {
  return new Map(rows.map((row) => [row.key, row.value]));
}

export function assembleDashboardPayload(
  snapshot: StorageSnapshot,
  configStatus?: ConfigStatus
): DashboardPayload {
  const priorities = getPriorities(snapshot);
  const battlePlan = getBattlePlan(snapshot);
  const skillMap = getSkillMap(snapshot);
  const weeklyProgress = getWeeklyProgress(snapshot);
  const summaryMap = getSummaryRowMap(snapshot.summaryRows);

  return {
    generatedAt: new Date().toISOString(),
    lastSyncedAt: summaryMap.get("last_sync_at") || snapshot.syncLog[0]?.timestamp || "Never",
    lastSyncStatus: summaryMap.get("last_sync_status") || "ready",
    syncMessage: summaryMap.get("sync_message") || summaryMap.get("battle_plan_headline") || "System ready for sync.",
    activePipelines: new Set(snapshot.interviews.map((row) => row.company)).size,
    topStats: getTopStats(snapshot, priorities),
    battlePlan,
    mentorFocus: getMentorFocus(snapshot, priorities, skillMap),
    companyIntel: getCompanyIntel(snapshot),
    weeklyProgress,
    priorities,
    interviewCalendar: getInterviewCalendar(snapshot),
    skillMap,
    codingTracker: snapshot.tasks.filter((task) =>
      ["coding", "technical", "algorithm"].some((keyword) =>
        task.category.toLowerCase().includes(keyword)
      )
    ),
    resources: getResources(snapshot),
    weakestArea:
      summaryMap.get("weakest_area") ||
      summaryMap.get("weakest_skill") ||
      [...skillMap].sort((left, right) => left.progressPercent - right.progressPercent)[0]?.skill ||
      "Unknown",
    configStatus: configStatus ?? {
      healthy: true,
      label: "Config healthy",
      message: humanNowLine(),
      detail: "API routes are ready."
    }
  };
}

export function buildSummaryRows(payload: DashboardPayload): DashboardSummaryRow[] {
  const timestamp = payload.generatedAt;
  return [
    {
      key: "last_sync_at",
      value: payload.lastSyncedAt,
      last_updated: timestamp
    },
    {
      key: "last_sync_status",
      value: payload.lastSyncStatus,
      last_updated: timestamp
    },
    {
      key: "sync_message",
      value: payload.syncMessage,
      last_updated: timestamp
    },
    {
      key: "next_interview",
      value: payload.topStats[0]?.value || "No interview set",
      last_updated: timestamp
    },
    {
      key: "active_pipelines",
      value: String(payload.activePipelines),
      last_updated: timestamp
    },
    {
      key: "top_priority",
      value: payload.priorities[0]?.label || "Queue stable",
      last_updated: timestamp
    },
    {
      key: "top_priority_1",
      value: payload.priorities[0]?.label || "Queue stable",
      last_updated: timestamp
    },
    {
      key: "top_priority_2",
      value: payload.priorities[1]?.label || "No second priority",
      last_updated: timestamp
    },
    {
      key: "top_priority_3",
      value: payload.priorities[2]?.label || "No third priority",
      last_updated: timestamp
    },
    {
      key: "weakest_skill",
      value: payload.weakestArea,
      last_updated: timestamp
    },
    {
      key: "weakest_area",
      value: payload.weakestArea,
      last_updated: timestamp
    },
    {
      key: "config_health",
      value: payload.configStatus.label,
      last_updated: timestamp
    },
    {
      key: "battle_plan_headline",
      value: payload.battlePlan[0]?.title || "No battle plan item",
      last_updated: timestamp
    }
  ];
}
