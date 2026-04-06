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
  TaskRow,
  InterviewRow,
  DailyPlanRow
} from "@/lib/datastore/types";
import { compareIsoDates, formatDateLabel, formatDateTimeLabel, getTodayIsoDate, humanNowLine, relativeUrgency } from "@/lib/utils/date";
import { clampPercent, compactText, formatCountLabel } from "@/lib/utils/formatting";

function getPriorityRank(priority: string) {
  switch (priority.trim().toLowerCase()) {
    case "highest":
      return 4;
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
    default:
      return 0;
  }
}

function isCompletedStatus(status: string) {
  return ["done", "completed", "complete"].includes(status.trim().toLowerCase());
}

function isInterviewTerminalStatus(status: string) {
  return ["completed", "complete", "cancelled", "canceled", "ghosted", "rejected", "declined"].includes(
    status.trim().toLowerCase()
  );
}

function isTodayOrFuture(date: string) {
  return Boolean(date) && date >= getTodayIsoDate();
}

function isPastDate(date: string) {
  return Boolean(date) && date < getTodayIsoDate();
}

function getUpcomingInterviews(interviews: InterviewRow[]) {
  return interviews
    .filter((row) => isTodayOrFuture(row.date) && !isInterviewTerminalStatus(row.status))
    .sort((left, right) => compareIsoDates(left.date, right.date));
}

function getOpenDailyPlanRows(rows: DailyPlanRow[]) {
  return rows
    .filter((row) => !row.date || isTodayOrFuture(row.date))
    .sort((left, right) => compareIsoDates(left.date || getTodayIsoDate(), right.date || getTodayIsoDate()));
}

function getInterviewDisplayStatus(row: InterviewRow) {
  if (isPastDate(row.date) && !isInterviewTerminalStatus(row.status)) {
    return "past";
  }

  return row.status;
}

function getInterviewCalendar(snapshot: StorageSnapshot): InterviewCalendarItem[] {
  return [...snapshot.interviews]
    .sort((left, right) => {
      const leftUpcoming = isTodayOrFuture(left.date) && !isInterviewTerminalStatus(left.status) ? 0 : 1;
      const rightUpcoming = isTodayOrFuture(right.date) && !isInterviewTerminalStatus(right.status) ? 0 : 1;

      if (leftUpcoming !== rightUpcoming) {
        return leftUpcoming - rightUpcoming;
      }

      return compareIsoDates(left.date, right.date);
    })
    .map((row) => ({
      company: row.company,
      roundType: row.round_type,
      dateLabel: formatDateLabel(row.date),
      timeLabel: row.start_time ? `${row.start_time}${row.end_time ? ` - ${row.end_time}` : ""}` : "TBD",
      status: getInterviewDisplayStatus(row),
      interviewer: row.interviewer,
      meetingLink: row.meeting_link
    }));
}

function scoreTask(task: TaskRow) {
  const dueDate = new Date(task.due_date);
  const dueDays = Number.isNaN(dueDate.getTime())
    ? Number.POSITIVE_INFINITY
    : Math.ceil((dueDate.getTime() - Date.now()) / 86_400_000);
  const priorityWeight = getPriorityRank(task.priority) * 14;
  const statusPenalty = isCompletedStatus(task.status) ? -100 : 0;
  return priorityWeight + Math.max(0, 10 - dueDays) * 4 + statusPenalty;
}

function getPriorities(snapshot: StorageSnapshot): PriorityItem[] {
  return snapshot.tasks
    .filter((task) => !isCompletedStatus(task.status))
    .map((task) => ({
      id: task.task_id,
      label: task.task,
      company: compactText(task.company, "General"),
      score: scoreTask(task),
      reason: compactText(task.notes, `${task.category} preparation`),
      dueDate: task.due_date,
      dueLabel: task.due_date ? formatDateLabel(task.due_date) : "No due date"
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 6);
}

function getBattlePlan(snapshot: StorageSnapshot): BattlePlanItem[] {
  const taskMap = new Map(snapshot.tasks.map((task) => [task.task_id, task]));
  const prioritizedPlan = getOpenDailyPlanRows(snapshot.dailyPlan)
    .map((row) => {
      const task = taskMap.get(row.task_id);
      return {
        id: row.task_id,
        slot: row.slot,
        title: task?.task || row.focus_area,
        company: task?.company || "General",
        urgency: row.priority,
        notes: row.notes || task?.notes || row.focus_area
      };
    })
    .slice(0, 4);

  if (prioritizedPlan.length > 0) {
    return prioritizedPlan;
  }

  return getPriorities(snapshot).slice(0, 4).map((item) => ({
    id: item.id,
    slot: item.dueDate ? relativeUrgency(item.dueDate) : "Soon",
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
    const status = compactText(company.status, "Unknown");
    return {
      company: company.company,
      sponsorship: compactText(company.h1b_sponsorship, "Unknown"),
      interviewProcess: roundsByCompany.get(company.company) ?? [`Current stage: ${status}`],
      focusAreas: gapsByCompany.get(company.company) ?? [compactText(company.notes, "No specific focus area yet.")],
      tip: recruiterNote?.notes || compactText(company.next_step, compactText(company.notes, "Keep this pipeline warm.")),
      yourAngle: compactText(company.notes, "Frame the strongest operator story for this company."),
      compensation: compactText(company.salary_band, "Not tracked"),
      targetLevel: compactText(company.target_level, "Not set"),
      nextStep: compactText(company.next_step, status),
      recruiter: compactText(company.recruiter, "Not assigned"),
      status
    };
  });
}

function getSkillMap(snapshot: StorageSnapshot): SkillMapItem[] {
  const weakestForSkill = new Map(snapshot.skillGaps.map((gap) => [gap.skill, gap.company]));

  return snapshot.skills.map((skill) => ({
    skill: skill.skill,
    category: skill.category,
    progressPercent: clampPercent(skill.progress_percent),
    targetPercent: clampPercent(skill.target_percent),
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
  const upcomingInterviews = getUpcomingInterviews(snapshot.interviews);
  const nextInterview = upcomingInterviews[0];
  const weekCount = upcomingInterviews.filter((row) => {
    const diff = new Date(row.date).getTime() - new Date(getTodayIsoDate()).getTime();
    return diff >= 0 && diff <= 7 * 86_400_000;
  }).length;

  return [
    {
      label: "Next Interview",
      value: nextInterview ? `${nextInterview.company} · ${nextInterview.round_type}` : "No interview set",
      detail: nextInterview ? formatDateTimeLabel(nextInterview.date, nextInterview.start_time) : "Add rows in the interviews sheet to populate this board"
    },
    {
      label: "This Week",
      value: formatCountLabel(weekCount, "loop"),
      detail: `${upcomingInterviews.length} upcoming interview events on the board`
    },
    {
      label: "Urgent Item",
      value: priorities[0]?.label || "Queue stable",
      detail: priorities[0]?.reason || "No immediate blocker"
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
        ? `${topCompany.company} remains the highest leverage lane. Keep ${compactText(topCompany.h1b_sponsorship, "unknown").toLowerCase()} sponsorship context explicit and stay close to ${compactText(topCompany.next_step, topCompany.status || "the current stage")}.`
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
    subtitle: compactText(company.recruiter, compactText(company.status, "No recruiter")),
    body: compactText(company.notes, compactText(company.next_step, "No notes yet"))
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
    weakestArea: skillMap.sort((left, right) => left.progressPercent - right.progressPercent)[0]?.skill || "Unknown",
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
