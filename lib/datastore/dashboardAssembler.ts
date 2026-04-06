import type {
  BattlePlanItem,
  CompanyIntelCard,
  ConfigStatus,
  DashboardPayload,
  DashboardSummaryRow,
  InterviewBoardCard,
  InterviewCalendarItem,
  PastItem,
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
      date: row.date,
      dateLabel: formatDateLabel(row.date),
      timeLabel: row.start_time ? `${row.start_time}${row.end_time ? ` - ${row.end_time}` : ""}` : "TBD",
      status: getInterviewDisplayStatus(row),
      interviewer: row.interviewer,
      meetingLink: row.meeting_link
    }));
}

function isClosedPipelineStatus(status: string) {
  return ["ghosted", "rejected", "declined", "closed", "complete", "completed"].includes(status.trim().toLowerCase());
}

function getInterviewLane(
  nextEvent: InterviewRow | undefined,
  latestEvent: InterviewRow | undefined,
  companyStatus: string
): InterviewBoardCard["lane"] {
  if (nextEvent) {
    const daysUntil = Math.ceil(
      (new Date(nextEvent.date).getTime() - new Date(getTodayIsoDate()).getTime()) / 86_400_000
    );

    if (daysUntil <= 1) {
      return "needs_action";
    }

    return "upcoming";
  }

  if (isClosedPipelineStatus(companyStatus) || (latestEvent && isInterviewTerminalStatus(latestEvent.status))) {
    return "closed";
  }

  return "watching";
}

function getLaneLabel(lane: InterviewBoardCard["lane"]) {
  switch (lane) {
    case "needs_action":
      return "Needs Action";
    case "upcoming":
      return "Upcoming";
    case "watching":
      return "Watching";
    case "closed":
      return "Closed";
  }
}

function getInterviewBoard(snapshot: StorageSnapshot): InterviewBoardCard[] {
  const companiesByName = new Map(snapshot.companies.map((company) => [company.company, company]));
  const interviewsByCompany = new Map<string, InterviewRow[]>();

  for (const interview of snapshot.interviews) {
    const list = interviewsByCompany.get(interview.company) ?? [];
    list.push(interview);
    interviewsByCompany.set(interview.company, list);
  }

  return [...interviewsByCompany.entries()]
    .map(([company, interviews]) => {
      const ordered = [...interviews].sort((left, right) => compareIsoDates(left.date, right.date));
      const past = ordered.filter((row) => isPastDate(row.date));
      const upcoming = ordered.filter((row) => isTodayOrFuture(row.date) && !isInterviewTerminalStatus(row.status));
      const latestEvent = ordered[ordered.length - 1];
      const lastEvent = past[past.length - 1] || latestEvent;
      const nextEvent = upcoming[0];
      const companyRow = companiesByName.get(company);
      const lane = getInterviewLane(nextEvent, latestEvent, companyRow?.status || latestEvent?.status || "");
      const headline = nextEvent
        ? `${nextEvent.round_type} next`
        : lastEvent
          ? `${lastEvent.round_type} was last touch`
          : compactText(companyRow?.status || "", "Pipeline tracked");

      return {
        company,
        lane,
        laneLabel: getLaneLabel(lane),
        headline,
        status: compactText(companyRow?.status || nextEvent?.status || latestEvent?.status || "", "tracked"),
        eventCount: ordered.length,
        lastEventDate: lastEvent?.date || "",
        lastEventDateLabel: lastEvent ? formatDateTimeLabel(lastEvent.date, lastEvent.start_time) : "No past event",
        lastEventLabel: lastEvent ? compactText(lastEvent.round_type, "Past event") : "No past event",
        nextEventDate: nextEvent?.date || "",
        nextEventDateLabel: nextEvent ? formatDateTimeLabel(nextEvent.date, nextEvent.start_time) : "No next date",
        nextEventLabel: nextEvent ? compactText(nextEvent.round_type, "Upcoming") : compactText(companyRow?.next_step || "", "No next date"),
        interviewer: compactText(nextEvent?.interviewer || latestEvent?.interviewer || "", "Interviewer TBD"),
        meetingLink: nextEvent?.meeting_link || latestEvent?.meeting_link || "",
        notes: compactText(nextEvent?.notes || latestEvent?.notes || companyRow?.notes || "", "No notes logged")
      };
    })
    .sort((left, right) => {
      const laneOrder = ["needs_action", "upcoming", "watching", "closed"];
      const leftLane = laneOrder.indexOf(left.lane);
      const rightLane = laneOrder.indexOf(right.lane);

      if (leftLane !== rightLane) {
        return leftLane - rightLane;
      }

      const leftDate = left.nextEventDate || left.lastEventDate;
      const rightDate = right.nextEventDate || right.lastEventDate;
      return compareIsoDates(leftDate || "9999-12-31", rightDate || "9999-12-31");
    });
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

function compareTaskTiming(left: TaskRow, right: TaskRow) {
  const leftDone = isCompletedStatus(left.status) ? 1 : 0;
  const rightDone = isCompletedStatus(right.status) ? 1 : 0;

  if (leftDone !== rightDone) {
    return leftDone - rightDone;
  }

  const leftDue = left.due_date || "9999-12-31";
  const rightDue = right.due_date || "9999-12-31";
  const dueDiff = compareIsoDates(leftDue, rightDue);

  if (dueDiff !== 0) {
    return dueDiff;
  }

  return getPriorityRank(right.priority) - getPriorityRank(left.priority);
}

function getTodoItems(snapshot: StorageSnapshot) {
  return [...snapshot.tasks].sort(compareTaskTiming);
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

function getPastItems(snapshot: StorageSnapshot): PastItem[] {
  const pastInterviews: PastItem[] = snapshot.interviews
    .filter((row) => isPastDate(row.date))
    .map((row) => ({
      id: `interview-${row.event_id || `${row.company}-${row.date}-${row.round_type}`}`,
      kind: "interview",
      title: `${row.company} · ${row.round_type}`,
      company: row.company,
      date: row.date,
      dateLabel: formatDateTimeLabel(row.date, row.start_time),
      detail: compactText(row.notes, row.interviewer || "Past interview"),
      status: getInterviewDisplayStatus(row)
    }));

  const pastRounds: PastItem[] = snapshot.rounds
    .filter((row) => isPastDate(row.date))
    .map((row, index) => ({
      id: `round-${row.company}-${row.date}-${row.round_name}-${index}`,
      kind: "round",
      title: `${row.company} · ${row.round_name}`,
      company: row.company,
      date: row.date,
      dateLabel: formatDateTimeLabel(row.date, row.time),
      detail: compactText(row.notes, row.interviewer || "Past round"),
      status: row.status
    }));

  const pastTasks: PastItem[] = snapshot.tasks
    .filter((task) => isPastDate(task.due_date))
    .map((task) => ({
      id: `task-${task.task_id}`,
      kind: "task",
      title: task.task,
      company: compactText(task.company, "General"),
      date: task.due_date,
      dateLabel: formatDateLabel(task.due_date),
      detail: compactText(task.notes, `${task.category} task`),
      status: task.status
    }));

  const taskMap = new Map(snapshot.tasks.map((task) => [task.task_id, task]));
  const pastPlans: PastItem[] = snapshot.dailyPlan
    .filter((row) => isPastDate(row.date))
    .map((row, index) => {
      const task = taskMap.get(row.task_id);
      return {
        id: `plan-${row.task_id || index}-${row.date}`,
        kind: "plan",
        title: task?.task || compactText(row.focus_area, "Daily plan item"),
        company: compactText(task?.company || "", "General"),
        date: row.date,
        dateLabel: formatDateLabel(row.date),
        detail: compactText(row.notes, row.slot || "Past daily plan slot"),
        status: row.priority
      };
    });

  return [...pastInterviews, ...pastRounds, ...pastTasks, ...pastPlans]
    .sort((left, right) => compareIsoDates(right.date, left.date));
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
    interviewBoard: getInterviewBoard(snapshot),
    todoItems: getTodoItems(snapshot),
    skillMap,
    codingTracker: snapshot.tasks.filter((task) =>
      ["coding", "technical", "algorithm"].some((keyword) =>
        task.category.toLowerCase().includes(keyword)
      )
    ),
    resources: getResources(snapshot),
    pastItems: getPastItems(snapshot),
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
