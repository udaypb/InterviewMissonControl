import type { BehavioralSkillSignal, BehavioralStoryCard, TaskRow } from "@/lib/datastore/types";
import { formatDateLabel } from "@/lib/utils/date";
import { compactText } from "@/lib/utils/formatting";

function isBehavioralTask(task: TaskRow) {
  const normalized = `${task.category} ${task.task}`.toLowerCase();
  return ["behavioral", "story", "communication", "recruiter follow-up", "availability"].some((keyword) =>
    normalized.includes(keyword)
  );
}

function getStatusTone(status: string) {
  switch (status.trim().toLowerCase()) {
    case "strong":
      return "border-[#6b9274]/35 bg-[#132017] text-[#c2d7c6]";
    case "ready":
      return "border-[#6d87b7]/35 bg-[#121a27] text-[#c5d6f5]";
    case "medium":
      return "border-[#b88c54]/35 bg-[#241b11] text-[#e3c79f]";
    default:
      return "border-border/70 bg-black/10 text-muted";
  }
}

function getRiskTone(risk: string) {
  const normalized = risk.toLowerCase();
  if (normalized.includes("high")) {
    return "border-[#d67658]/35 bg-[#291713] text-[#f1b29f]";
  }
  if (normalized.includes("medium")) {
    return "border-[#b88c54]/35 bg-[#241b11] text-[#e3c79f]";
  }
  return "border-[#6b9274]/35 bg-[#132017] text-[#c2d7c6]";
}

function getStoryStatusScore(status: string) {
  switch (status.trim().toLowerCase()) {
    case "strong":
      return 90;
    case "ready":
      return 75;
    case "medium":
      return 55;
    default:
      return 40;
  }
}

function getExperienceStatus(stories: BehavioralStoryCard[], signals: BehavioralSkillSignal[]) {
  const storyScore = stories.length > 0
    ? stories.reduce((sum, story) => sum + getStoryStatusScore(story.status), 0) / stories.length
    : 0;
  const signalScore = signals.length > 0
    ? signals.reduce((sum, signal) => sum + signal.percent, 0) / signals.length
    : storyScore;
  const overallScore = Math.round((storyScore + signalScore) / 2);

  if (overallScore >= 80) {
    return {
      label: "Strong",
      detail: `${overallScore}% readiness across stories and delivery signals`,
      tone: "border-[#6b9274]/35 bg-[#132017] text-[#c2d7c6]"
    };
  }

  if (overallScore >= 65) {
    return {
      label: "Building",
      detail: `${overallScore}% readiness with a solid base`,
      tone: "border-[#6d87b7]/35 bg-[#121a27] text-[#c5d6f5]"
    };
  }

  return {
    label: "Needs Reps",
    detail: `${overallScore}% readiness and still fragile under pressure`,
    tone: "border-[#d67658]/35 bg-[#291713] text-[#f1b29f]"
  };
}

export function BehavioralBankPanel({
  stories,
  tasks,
  signals
}: {
  stories: BehavioralStoryCard[];
  tasks: TaskRow[];
  signals: BehavioralSkillSignal[];
}) {
  const behavioralTasks = tasks.filter(isBehavioralTask).slice(0, 8);
  const readyStories = stories.filter((story) => ["ready", "strong"].includes(story.status.toLowerCase())).length;
  const topRisk = signals[0];
  const experienceStatus = getExperienceStatus(stories, signals);

  return (
    <section className="panel p-6 md:p-7">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-muted">Behavioral Interview Prep</p>
          <h2 className="mt-2 text-[1.85rem] font-semibold tracking-[-0.045em]">Story bank, delivery risks, and next reps</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            This section is driven by the `behavioral_bank`, `tasks`, and `skills` tabs so your behavioral prep stays operational instead of scattered.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[22px] border border-[#6d87b7]/30 bg-[#121a27] px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Total Stories</p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-text">{stories.length}</p>
            <p className="mt-1 text-sm text-muted">{readyStories} ready or strong</p>
          </div>
          <div className={`rounded-[22px] border px-4 py-4 ${experienceStatus.tone}`}>
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Current Experience Status</p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-text">{experienceStatus.label}</p>
            <p className="mt-1 text-sm text-muted">{experienceStatus.detail}</p>
          </div>
          <div className="rounded-[22px] border border-[#b88c54]/30 bg-[#21170f] px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Next Reps</p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-text">{behavioralTasks.length}</p>
            <p className="mt-1 text-sm text-muted">{topRisk ? `${topRisk.skill} · ${topRisk.risk}` : "No behavioral risk tracked yet"}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          {stories.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-black/10 p-5">
              <p className="text-sm text-text">No behavioral stories loaded.</p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Add rows in `behavioral_bank` to track story quality, coverage, and company calibration.
              </p>
            </div>
          ) : null}

          {stories.map((story) => (
            <article key={story.storyId} className="rounded-[28px] border border-border/80 bg-[linear-gradient(180deg,rgba(17,17,17,0.82),rgba(10,10,10,0.94))] p-5 shadow-[0_14px_26px_rgba(0,0,0,0.18)]">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-muted">{story.storyId}</p>
                  <h3 className="mt-2 text-xl font-medium text-text">{story.title}</h3>
                  <p className="mt-2 text-sm text-muted">{story.primaryTheme}</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${getStatusTone(story.status)}`}>
                  {story.status}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {story.secondaryThemes.map((theme) => (
                  <span key={`${story.storyId}-${theme}`} className="rounded-full border border-border/70 bg-black/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted">
                    {theme}
                  </span>
                ))}
                {story.companies.map((company) => (
                  <span key={`${story.storyId}-${company}`} className="rounded-full border border-[#6d87b7]/30 bg-[#121a27] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[#c5d6f5]">
                    {company}
                  </span>
                ))}
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-[22px] border border-border/70 bg-black/10 p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Use For</p>
                  <p className="mt-3 text-sm leading-6 text-text">{story.useCases.length > 0 ? story.useCases.join(" · ") : "General behavioral coverage"}</p>
                </div>
                <div className="rounded-[22px] border border-border/70 bg-black/10 p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Company Calibration</p>
                  <p className="mt-3 text-sm leading-6 text-text">{compactText(story.companyCalibration, "No company-specific calibration logged.")}</p>
                </div>
              </div>

              <p className="mt-4 text-sm leading-7 text-muted">{compactText(story.story, story.notes || "No behavioral narrative logged.")}</p>
              {story.notes ? <p className="mt-4 text-sm leading-6 text-[#d8c4a7]">{story.notes}</p> : null}
            </article>
          ))}
        </div>

        <div className="space-y-5">
          <section className="rounded-[28px] border border-border/80 bg-black/10 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-muted">Behavioral Tasks</p>
            <div className="mt-4 space-y-3">
              {behavioralTasks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-black/10 p-4 text-sm text-muted">
                  No behavioral tasks detected. Tag tasks with `behavioral`, `story`, or communication-oriented labels.
                </div>
              ) : null}
              {behavioralTasks.map((task) => (
                <article key={task.task_id} className="rounded-[22px] border border-border/70 bg-black/10 p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h4 className="text-base font-medium text-text">{task.task}</h4>
                      <p className="mt-1 text-sm text-muted">{compactText(task.company, "General")} · {compactText(task.status, "Pending")}</p>
                    </div>
                    <span className="rounded-full border border-[#b88c54]/35 bg-[#241b11] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[#e3c79f]">
                      {task.due_date ? `Due ${formatDateLabel(task.due_date)}` : "No due date"}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted">{compactText(task.notes, "No task notes logged.")}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-border/80 bg-black/10 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-muted">Behavioral Signals</p>
            <div className="mt-4 space-y-3">
              {signals.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-black/10 p-4 text-sm text-muted">
                  No behavioral skills tracked. Add rows like storytelling clarity, impact articulation, and structured delivery in `skills`.
                </div>
              ) : null}
              {signals.map((signal) => (
                <article key={signal.skill} className="rounded-[22px] border border-border/70 bg-black/10 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-base font-medium text-text">{signal.skill}</h4>
                      <p className="mt-1 text-sm text-muted">{signal.level} current readiness</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${getRiskTone(signal.risk)}`}>
                      {signal.risk}
                    </span>
                  </div>
                  <div className="mt-4 h-3 rounded-full bg-[color:var(--track)]">
                    <div className="h-3 rounded-full bg-[#d8d0c4]" style={{ width: `${signal.percent}%` }} />
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
