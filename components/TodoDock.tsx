"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import type { DashboardPayload, TaskRow, TaskUpdateResult } from "@/lib/datastore/types";
import { formatDateLabel, getTodayIsoDate } from "@/lib/utils/date";
import { compactText, titleCase } from "@/lib/utils/formatting";

type TodoTab = "Today" | "Overdue" | "Upcoming" | "Done";

const todoTabs: TodoTab[] = ["Today", "Overdue", "Upcoming", "Done"];

function normalizeStatus(status: string) {
  return status.trim().toLowerCase();
}

function isSheetDone(task: TaskRow) {
  return ["done", "completed", "complete"].includes(normalizeStatus(task.status));
}

function getTaskBucket(task: TaskRow): TodoTab {
  const today = getTodayIsoDate();

  if (isSheetDone(task)) {
    return "Done";
  }

  if (task.due_date && task.due_date < today) {
    return "Overdue";
  }

  if (task.due_date === today) {
    return "Today";
  }

  return "Upcoming";
}

function getPriorityTone(priority: string) {
  switch (priority.trim().toLowerCase()) {
    case "highest":
      return "border-[#f08b6d]/40 bg-[#2a1714] text-[#f3b59e]";
    case "high":
      return "border-[#d2a062]/35 bg-[#231b12] text-[#e4c08e]";
    case "medium":
      return "border-[#6d87b7]/35 bg-[#121a27] text-[#b5c8ed]";
    default:
      return "border-border/70 bg-black/10 text-muted";
  }
}

function getDueTone(task: TaskRow) {
  const bucket = getTaskBucket(task);

  switch (bucket) {
    case "Overdue":
      return "border-[#f08b6d]/35 bg-[#2a1714] text-[#f3b59e]";
    case "Today":
      return "border-[#e0c17f]/35 bg-[#241d12] text-[#ecd7aa]";
    case "Done":
      return "border-[#688f72]/35 bg-[#142017] text-[#b7d2be]";
    default:
      return "border-[#6d87b7]/30 bg-[#121a27] text-[#b5c8ed]";
  }
}

export function TodoDock({
  tasks,
  compact = false,
  onDashboardUpdate
}: {
  tasks: TaskRow[];
  compact?: boolean;
  onDashboardUpdate?: (dashboard: DashboardPayload) => void;
}) {
  const [activeTab, setActiveTab] = useState<TodoTab>("Today");
  const [activeCategory, setActiveCategory] = useState("All");
  const [localTasks, setLocalTasks] = useState(tasks);
  const [pendingTaskId, setPendingTaskId] = useState("");
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const categories = useMemo(() => {
    const values = new Set(
      localTasks
        .map((task) => compactText(task.category, "General"))
        .filter(Boolean)
    );

    return ["All", ...[...values].sort((left, right) => left.localeCompare(right))];
  }, [localTasks]);

  const counts = useMemo(
    () =>
      todoTabs.reduce<Record<TodoTab, number>>((accumulator, tab) => {
        accumulator[tab] = localTasks.filter((task) => getTaskBucket(task) === tab).length;
        return accumulator;
      }, { Today: 0, Overdue: 0, Upcoming: 0, Done: 0 }),
    [localTasks]
  );

  useEffect(() => {
    if (activeTab !== "Today" || counts.Today > 0) {
      return;
    }

    if (counts.Overdue > 0) {
      setActiveTab("Overdue");
      return;
    }

    if (counts.Upcoming > 0) {
      setActiveTab("Upcoming");
      return;
    }

    if (counts.Done > 0) {
      setActiveTab("Done");
    }
  }, [activeTab, counts]);

  const filteredTasks = useMemo(() => {
    const nextTasks = localTasks.filter((task) => {
      const bucket = getTaskBucket(task);
      if (bucket !== activeTab) {
        return false;
      }

      if (activeCategory === "All") {
        return true;
      }

      return compactText(task.category, "General") === activeCategory;
    });

      return compact ? nextTasks.slice(0, 6) : nextTasks;
  }, [activeCategory, activeTab, compact, localTasks]);

  const hiddenCount = compact
    ? Math.max(
        0,
        localTasks.filter((task) => {
          const bucket = getTaskBucket(task);
          if (bucket !== activeTab) {
            return false;
          }

          if (activeCategory === "All") {
            return true;
          }

          return compactText(task.category, "General") === activeCategory;
        }).length - filteredTasks.length
      )
    : 0;

  async function toggleTask(task: TaskRow, checked: boolean) {
    setPendingTaskId(task.task_id);
    setError("");
    const previousTasks = localTasks;
    const optimisticTasks = localTasks.map((currentTask) =>
      currentTask.task_id === task.task_id
        ? {
            ...currentTask,
            status: checked ? "Done" : "Todo",
            last_updated: new Date().toISOString()
          }
        : currentTask
    );
    setLocalTasks(optimisticTasks);

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ taskId: task.task_id, checked })
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || "Failed to update task.");
      }

      const result = (await response.json()) as TaskUpdateResult;
      startTransition(() => {
        setLocalTasks(result.dashboard.todoItems);
        onDashboardUpdate?.(result.dashboard);
      });
    } catch (nextError) {
      setLocalTasks(previousTasks);
      setError(nextError instanceof Error ? nextError.message : "Failed to update task.");
    } finally {
      setPendingTaskId("");
    }
  }

  return (
    <section className="panel p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-muted">Todo Box</p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em]">Daily execution queue from the tasks sheet</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Check items off here and the `tasks` sheet updates immediately. Due dates drive the board.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {todoTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                activeTab === tab
                  ? "border-[#6f8dbe]/40 bg-[#141c29] text-[#dbe6ff]"
                  : "border-border/80 bg-black/10 text-muted hover:border-[#5b5b5b] hover:text-text"
              }`}
            >
              {tab}
              <span className="ml-2 text-xs opacity-80">{counts[tab]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            className={`rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.18em] transition ${
              activeCategory === category
                ? "border-[#b9925f]/40 bg-[#22190f] text-[#e6c89c]"
                : "border-border/80 bg-black/10 text-muted hover:border-[#5c5c5c] hover:text-text"
            }`}
          >
            {titleCase(category)}
          </button>
        ))}
      </div>

      {error ? (
        <div className="mt-4 rounded-[20px] border border-[#a35f53]/40 bg-[#241513] px-4 py-3 text-sm text-[#efb7a9]">
          {error}
        </div>
      ) : null}

      <div className="mt-5 space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-border bg-black/10 p-5">
            <p className="text-sm text-text">No tasks in this bucket.</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Tasks from the `tasks` tab will appear here once they match the selected due-date bucket and category.
            </p>
          </div>
        ) : null}

        {filteredTasks.map((task) => {
          const checked = isSheetDone(task);

          return (
            <article
              key={task.task_id}
              className={`rounded-[26px] border p-4 transition ${
                checked
                  ? "border-[#56715d]/35 bg-[linear-gradient(180deg,rgba(20,32,23,0.92),rgba(15,19,16,0.98))]"
                  : "border-border/80 bg-[linear-gradient(180deg,rgba(17,17,17,0.82),rgba(10,10,10,0.94))]"
              }`}
            >
              <div className="flex gap-4">
                <button
                  type="button"
                  aria-label={checked ? `Uncheck ${task.task}` : `Check ${task.task}`}
                  disabled={pendingTaskId === task.task_id}
                  onClick={() => void toggleTask(task, !checked)}
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition ${
                    checked
                      ? "border-[#88c098] bg-[#2d5135] text-white"
                      : "border-border/80 bg-black/20 text-transparent hover:border-[#6a8d73]"
                  }`}
                >
                  ✓
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className={`text-base font-medium ${checked ? "text-text/75 line-through" : "text-text"}`}>
                        {task.task}
                      </h3>
                      <p className="mt-1 text-sm text-muted">
                        {compactText(task.company, "General")} · {compactText(task.status, "Queued")}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${getDueTone(task)}`}>
                        {task.due_date ? `Due ${formatDateLabel(task.due_date)}` : "No due date"}
                      </span>
                      <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${getPriorityTone(task.priority)}`}>
                        {compactText(task.priority, "Normal")}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-border/70 bg-black/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted">
                      {titleCase(compactText(task.category, "General"))}
                    </span>
                    {task.estimated_minutes ? (
                      <span className="rounded-full border border-border/70 bg-black/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted">
                        {task.estimated_minutes} min
                      </span>
                    ) : null}
                    {pendingTaskId === task.task_id ? (
                      <span className="rounded-full border border-[#6d87b7]/30 bg-[#121a27] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[#b5c8ed]">
                        Saving
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-4 text-sm leading-6 text-muted">{compactText(task.notes, "No notes on this task.")}</p>
                </div>
              </div>
            </article>
          );
        })}

        {hiddenCount > 0 ? (
          <div className="rounded-2xl border border-border/70 bg-black/10 px-4 py-3 text-sm text-muted">
            +{hiddenCount} more tasks in this bucket. Open the dedicated Todo tab to see the full list.
          </div>
        ) : null}
      </div>
    </section>
  );
}
