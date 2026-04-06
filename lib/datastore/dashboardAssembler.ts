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
  RoundRow,
  SkillMapItem,
  StorageSnapshot,
  SummaryStat,
  TaskRow,
  DailyPlanRow
} from "@/lib/datastore/types";
import { compareIsoDates, formatDateLabel, formatDateTimeLabel, getTodayIsoDate, humanNowLine, relativeUrgency } from "@/lib/utils/date";
import { clampPercent, compactText, formatCountLabel } from "@/lib/utils/formatting";

type PipelineEvent = {
  company: string;
  label: string;
  date: string;
  time: string;
  status: string;
  priority: string;
  nextStep: string;
  interviewer: string;
  format: string;
  meetingLink: string;
  notes: string;
  source: "round" | "interview";
  isLatestForCompany: boolean;
  isNextUpcoming: boolean;
};

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

function isTruthyFlag(value: string) {
  return ["true", "yes", "1", "y"].includes(value.trim().toLowerCase());
}

function isTodayOrFuture(date: string) {
  return Boolean(date) && date >= getTodayIsoDate();
}

function isPastDate(date: string) {
  return Boolean(date) && date < getTodayIsoDate();
}

function getComparableEventDate(date: string) {
  return date || "9999-12-31";
}

function comparePipelineEvents(left: PipelineEvent, right: PipelineEvent) {
  return compareIsoDates(getComparableEventDate(left.date), getComparableEventDate(right.date));
}

function getRoundStatus(round: RoundRow) {
  return round.status || round.priority;
}

function getPipelineEvents(snapshot: StorageSnapshot): PipelineEvent[] {
  const seen = new Set<string>();
  const events: PipelineEvent[] = [];

  for (const round of snapshot.rounds) {
    if (!round.company.trim() || !round.date.trim()) {
      continue;
    }

    const label = compactText(round.round_name, "Round");
    const status = compactText(getRoundStatus(round), "tracked");
    const dedupeKey = `${round.company}::${round.date}::${label.toLowerCase()}::round`;

    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    events.push({
      company: round.company,
      label,
      date: round.date,
      time: round.time,
      status,
      priority: round.priority,
      nextStep: round.next_step,
      interviewer: round.interviewer,
      format: round.format,
      meetingLink: "",
      notes: round.notes,
      source: "round",
      isLatestForCompany: isTruthyFlag(round.is_latest_for_company),
      isNextUpcoming: isTruthyFlag(round.is_next_upcoming)
    });
  }

  for (const interview of snapshot.interviews) {
    if (!interview.company.trim() || !interview.date.trim()) {
      continue;
    }

    const label = compactText(interview.round_type, "Interview");
    const dedupeKey = `${interview.company}::${interview.date}::${label.toLowerCase()}::interview`;
    const roundKey = `${interview.company}::${interview.date}::${label.toLowerCase()}::round`;

    if (seen.has(dedupeKey) || seen.has(roundKey)) {
      continue;
    }

    seen.add(dedupeKey);
    events.push({
      company: interview.company,
      label,
      date: interview.date,
      time: interview.start_time,
      status: compactText(interview.status, "tracked"),
      priority: "",
      nextStep: "",
      interviewer: interview.interviewer,
      format: "",
      meetingLink: interview.meeting_link,
      notes: interview.notes,
      source: "interview",
      isLatestForCompany: false,
      isNextUpcoming: false
    });
  }

  return events.sort(comparePipelineEvents);
}

function getUpcomingEvents(events: PipelineEvent[]) {
  return events
    .filter((event) => isTodayOrFuture(event.date) && !isInterviewTerminalStatus(event.status))
    .sort(comparePipelineEvents);
}

function getOpenDailyPlanRows(rows: DailyPlanRow[]) {
  return rows
    .filter((row) => !row.date || isTodayOrFuture(row.date))
    .sort((left, right) => compareIsoDates(left.date || getTodayIsoDate(), right.date || getTodayIsoDate()));
}

function getFallbackTaskId(title: string) {
  return `task-${title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`;
}

function getEventDisplayStatus(event: PipelineEvent) {
  if (isPastDate(event.date) && !isInterviewTerminalStatus(event.status)) {
    return "past";
  }

  return event.status;
}

function getInterviewCalendar(snapshot: StorageSnapshot): InterviewCalendarItem[] {
  return getPipelineEvents(snapshot)
    .sort((left, right) => {
      const leftUpcoming = isTodayOrFuture(left.date) && !isInterviewTerminalStatus(left.status) ? 0 : 1;
      const rightUpcoming = isTodayOrFuture(right.date) && !isInterviewTerminalStatus(right.status) ? 0 : 1;

      if (leftUpcoming !== rightUpcoming) {
        return leftUpcoming - rightUpcoming;
      }

      return comparePipelineEvents(left, right);
    })
    .map((event) => ({
      company: event.company,
      roundType: event.label,
      date: event.date,
      dateLabel: formatDateLabel(event.date),
      timeLabel: event.time || "TBD",
      status: getEventDisplayStatus(event),
      interviewer: event.interviewer,
      meetingLink: event.meetingLink
    }));
}

function isClosedPipelineStatus(status: string) {
  return ["ghosted", "rejected", "declined", "closed", "complete", "completed"].includes(status.trim().toLowerCase());
}

function getInterviewLane(
  nextEvent: PipelineEvent | undefined,
  latestEvent: PipelineEvent | undefined,
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
  const eventsByCompany = new Map<string, PipelineEvent[]>();

  for (const event of getPipelineEvents(snapshot)) {
    const list = eventsByCompany.get(event.company) ?? [];
    list.push(event);
    eventsByCompany.set(event.company, list);
  }

  const companyNames = new Set<string>([
    ...snapshot.companies.map((company) => company.company),
    ...eventsByCompany.keys()
  ]);

  return [...companyNames]
    .map((company) => {
      const ordered = [...(eventsByCompany.get(company) ?? [])].sort(comparePipelineEvents);
      const past = ordered.filter((event) => isPastDate(event.date));
      const upcoming = ordered.filter((event) => isTodayOrFuture(event.date) && !isInterviewTerminalStatus(event.status));
      const latestFlagged = ordered.find((event) => event.isLatestForCompany);
      const nextFlagged = ordered.find((event) => event.isNextUpcoming);
      const latestEvent = latestFlagged || ordered[ordered.length - 1];
      const lastEvent = latestEvent && isPastDate(latestEvent.date) ? latestEvent : past[past.length - 1] || latestEvent;
      const nextEvent = nextFlagged || upcoming[0];
      const companyRow = companiesByName.get(company);
      const lane = getInterviewLane(nextEvent, latestEvent, companyRow?.status || latestEvent?.status || "");
      const headline = nextEvent
        ? compactText(nextEvent.nextStep, `${nextEvent.label} next`)
        : lastEvent
          ? `${lastEvent.label} was last touch`
          : compactText(companyRow?.status || "", "Pipeline tracked");

      return {
        company,
        lane,
        laneLabel: getLaneLabel(lane),
        headline,
        status: compactText(companyRow?.status || nextEvent?.status || latestEvent?.status || "", "tracked"),
        eventCount: ordered.length,
        lastEventDate: lastEvent?.date || "",
        lastEventDateLabel: lastEvent ? formatDateTimeLabel(lastEvent.date, lastEvent.time) : "No past event",
        lastEventLabel: lastEvent ? compactText(lastEvent.label, "Past event") : "No past event",
        nextEventDate: nextEvent?.date || "",
        nextEventDateLabel: nextEvent ? formatDateTimeLabel(nextEvent.date, nextEvent.time) : "No next date",
        nextEventLabel: nextEvent ? compactText(nextEvent.label, "Upcoming") : compactText(companyRow?.next_step || "", "No next date"),
        interviewer: compactText(nextEvent?.interviewer || latestEvent?.interviewer || "", "Interviewer TBD"),
        meetingLink: nextEvent?.meetingLink || latestEvent?.meetingLink || "",
        notes: compactText(
          nextEvent?.notes || nextEvent?.nextStep || latestEvent?.notes || latestEvent?.nextStep || companyRow?.notes || "",
          "No notes logged"
        )
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
  const taskMap = new Map(
    snapshot.tasks.flatMap((task) => [
      [task.task_id, task] as const,
      [getFallbackTaskId(task.task), task] as const
    ])
  );
  const prioritizedPlan = getOpenDailyPlanRows(snapshot.dailyPlan)
    .map((row) => {
      const task = taskMap.get(row.task_id) || taskMap.get(getFallbackTaskId(row.task_id));
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
    list.push(
      `${compactText(round.round_name, "Round")} · ${formatDateTimeLabel(round.date, round.time)} · ${compactText(getRoundStatus(round), "tracked")}${
        round.next_step ? ` · Next: ${round.next_step}` : ""
      }`
    );
    roundsByCompany.set(round.company, list);
  }

  const gapsByCompany = new Map<string, string[]>();
  for (const gap of snapshot.skillGaps) {
    const list = gapsByCompany.get(gap.company) ?? [];
    list.push(`${gap.skill}: ${compactText(gap.notes, `gap score ${gap.gap_score}`)}`);
    gapsByCompany.set(gap.company, list);
  }

  const notesByCompany = new Map(snapshot.recruiterNotes.map((note) => [note.company, note]));

  const companiesByName = new Map(snapshot.companies.map((company) => [company.company, company]));
  const companyNames = new Set<string>([
    ...snapshot.companies.map((company) => company.company),
    ...snapshot.rounds.map((round) => round.company).filter(Boolean),
    ...snapshot.interviews.map((interview) => interview.company).filter(Boolean)
  ]);

  return [...companyNames].map((companyName) => {
    const company = companiesByName.get(companyName);
    const fallbackStatus = [...snapshot.rounds]
      .filter((round) => round.company === companyName)
      .sort((left, right) => compareIsoDates(right.date, left.date))[0];
    const recruiterNote = notesByCompany.get(companyName);
    const status = compactText(company?.status || fallbackStatus?.status || fallbackStatus?.priority || "", "Unknown");
    return {
      company: companyName,
      sponsorship: compactText(company?.h1b_sponsorship || "", "Unknown"),
      interviewProcess: roundsByCompany.get(companyName) ?? [`Current stage: ${status}`],
      focusAreas: gapsByCompany.get(companyName) ?? [compactText(company?.notes || fallbackStatus?.notes || "", "No specific focus area yet.")],
      tip: recruiterNote?.notes || compactText(company?.next_step || fallbackStatus?.next_step || "", compactText(company?.notes || fallbackStatus?.notes || "", "Keep this pipeline warm.")),
      yourAngle: compactText(company?.notes || fallbackStatus?.notes || "", "Frame the strongest operator story for this company."),
      compensation: compactText(company?.salary_band || "", "Not tracked"),
      targetLevel: compactText(company?.target_level || "", "Not set"),
      nextStep: compactText(company?.next_step || fallbackStatus?.next_step || "", status),
      recruiter: compactText(company?.recruiter || "", "Not assigned"),
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
  const upcomingEvents = getUpcomingEvents(getPipelineEvents(snapshot));
  const nextInterview = upcomingEvents[0];
  const weekCount = upcomingEvents.filter((event) => {
    const diff = new Date(event.date).getTime() - new Date(getTodayIsoDate()).getTime();
    return diff >= 0 && diff <= 7 * 86_400_000;
  }).length;

  return [
    {
      label: "Next Interview",
      value: nextInterview ? `${nextInterview.company} · ${nextInterview.label}` : "No interview set",
      detail: nextInterview ? formatDateTimeLabel(nextInterview.date, nextInterview.time) : "Add rows in the rounds sheet to populate this board"
    },
    {
      label: "This Week",
      value: formatCountLabel(weekCount, "loop"),
      detail: `${upcomingEvents.length} upcoming interview events on the board`
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
  const cards = getCompanyIntel(snapshot);
  return cards.slice(0, 3).map((company) => ({
    title: company.company,
    subtitle: compactText(company.recruiter, company.status),
    body: compactText(company.tip, company.nextStep)
  }));
}

function getPastItems(snapshot: StorageSnapshot): PastItem[] {
  const pastEvents: PastItem[] = getPipelineEvents(snapshot)
    .filter((event) => isPastDate(event.date))
    .map((event, index) => ({
      id: `${event.source}-${event.company}-${event.date}-${event.label}-${index}`,
      kind: event.source === "round" ? "round" : "interview",
      title: `${event.company} · ${event.label}`,
      company: event.company,
      date: event.date,
      dateLabel: formatDateTimeLabel(event.date, event.time),
      detail: compactText(event.notes || event.nextStep, event.interviewer || "Past event"),
      status: getEventDisplayStatus(event)
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

  return [...pastEvents, ...pastTasks, ...pastPlans]
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
    activePipelines: new Set([
      ...snapshot.interviews.map((row) => row.company),
      ...snapshot.rounds.map((row) => row.company),
      ...snapshot.companies.map((row) => row.company)
    ].filter(Boolean)).size,
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
