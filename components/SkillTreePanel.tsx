"use client";

import { useEffect, useState, useTransition } from "react";

import type { DashboardPayload, SkillDomain, SkillTreeNode, SkillUpdateResult } from "@/lib/datastore/types";

interface SkillTreePanelProps {
  domains: SkillDomain[];
  weakestArea: string;
  onDashboardUpdate: (dashboard: DashboardPayload) => void;
}

function toneForPercent(percent: number) {
  if (percent >= 80) {
    return {
      shell: "border-[#5f8d6d]/35 bg-[linear-gradient(180deg,rgba(18,30,22,0.92),rgba(11,15,12,0.98))]",
      fill: "bg-[#7cc693]",
      pill: "border-[#5f8d6d]/35 bg-[#132319] text-[#bfe0c9]"
    };
  }

  if (percent >= 60) {
    return {
      shell: "border-[#7a91be]/35 bg-[linear-gradient(180deg,rgba(17,24,34,0.92),rgba(11,14,20,0.98))]",
      fill: "bg-[#8cb3ff]",
      pill: "border-[#6f8dbe]/35 bg-[#121b2a] text-[#cadbff]"
    };
  }

  return {
    shell: "border-[#b8815b]/35 bg-[linear-gradient(180deg,rgba(37,22,18,0.92),rgba(17,12,10,0.98))]",
    fill: "bg-[#f0a67d]",
    pill: "border-[#b8815b]/35 bg-[#251613] text-[#f2c4a8]"
  };
}

function clampWidth(percent: number) {
  return `${Math.max(0, Math.min(100, percent))}%`;
}

function updateNodeCheck(nodes: SkillTreeNode[], skillId: string, checked: boolean): SkillTreeNode[] {
  return nodes.map((node) => {
    if (node.id === skillId && node.canCheck) {
      return {
        ...node,
        checked,
        progressPercent: checked ? 100 : 0
      };
    }

    if (node.children.length === 0) {
      return node;
    }

    const children = updateNodeCheck(node.children, skillId, checked);
    const total = children.reduce((sum, child) => sum + countChecklistItems(child), 0);
    const complete = children.reduce((sum, child) => sum + countCompletedItems(child), 0);
    return {
      ...node,
      children,
      progressPercent: total > 0 ? Math.round((complete / total) * 100) : node.progressPercent
    };
  });
}

function countChecklistItems(node: SkillTreeNode): number {
  if (node.canCheck) {
    return 1;
  }

  return node.children.reduce((sum, child) => sum + countChecklistItems(child), 0);
}

function countCompletedItems(node: SkillTreeNode): number {
  if (node.canCheck) {
    return node.checked ? 1 : 0;
  }

  return node.children.reduce((sum, child) => sum + countCompletedItems(child), 0);
}

function updateDomainCheck(domains: SkillDomain[], skillId: string, checked: boolean): SkillDomain[] {
  return domains.map((domain) => {
    const children = updateNodeCheck(domain.children, skillId, checked);
    const totalCount = children.reduce((sum, child) => sum + countChecklistItems(child), 0);
    const completedCount = children.reduce((sum, child) => sum + countCompletedItems(child), 0);
    return {
      ...domain,
      children,
      completedCount,
      totalCount,
      progressPercent: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : domain.progressPercent
    };
  });
}

function SkillTreeNodeView({
  node,
  level,
  pendingId,
  onToggle
}: {
  node: SkillTreeNode;
  level: number;
  pendingId: string;
  onToggle: (skillId: string, checked: boolean) => void;
}) {
  const tone = toneForPercent(node.progressPercent);
  const indentClass = level === 0 ? "" : "ml-4 border-l border-border/70 pl-4";

  if (!node.canCheck) {
    return (
      <div className={indentClass}>
        <div className={`rounded-[22px] border p-4 ${tone.shell}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-text">{node.label}</p>
              {node.notes ? <p className="mt-2 text-sm leading-6 text-muted">{node.notes}</p> : null}
            </div>
            <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${tone.pill}`}>
              {node.progressPercent}%
            </span>
          </div>
          <div className="mt-4 h-2.5 rounded-full bg-black/25">
            <div className={`h-2.5 rounded-full ${tone.fill}`} style={{ width: clampWidth(node.progressPercent) }} />
          </div>
          <div className="mt-4 space-y-3">
            {node.children.map((child) => (
              <SkillTreeNodeView
                key={child.id}
                node={child}
                level={level + 1}
                pendingId={pendingId}
                onToggle={onToggle}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={indentClass}>
      <label className="flex items-start gap-3 rounded-[20px] border border-border/80 bg-black/10 px-4 py-3 transition hover:border-[#5e5e5e]">
        <input
          type="checkbox"
          checked={node.checked}
          disabled={pendingId === node.id}
          onChange={(event) => onToggle(node.id, event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-border bg-transparent"
        />
        <span className="flex-1">
          <span className="flex items-start justify-between gap-3">
            <span>
              <span className="block text-sm font-medium text-text">{node.label}</span>
              {node.notes ? <span className="mt-1 block text-sm leading-6 text-muted">{node.notes}</span> : null}
              {node.weakestForCompany ? (
                <span className="mt-2 block text-xs uppercase tracking-[0.18em] text-muted">
                  Sharpest gap for {node.weakestForCompany}
                </span>
              ) : null}
            </span>
            <span className="text-sm text-muted">{node.checked ? "Done" : "Open"}</span>
          </span>
        </span>
      </label>
    </div>
  );
}

export function SkillTreePanel({ domains, weakestArea, onDashboardUpdate }: SkillTreePanelProps) {
  const [localDomains, setLocalDomains] = useState(domains);
  const [pendingId, setPendingId] = useState("");
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  useEffect(() => {
    setLocalDomains(domains);
  }, [domains]);

  async function handleToggle(skillId: string, checked: boolean) {
    setPendingId(skillId);
    setError("");
    const optimisticDomains = updateDomainCheck(localDomains, skillId, checked);
    setLocalDomains(optimisticDomains);

    try {
      const response = await fetch("/api/skills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ skillId, checked })
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || "Failed to update skills.");
      }

      const result = (await response.json()) as SkillUpdateResult;
      startTransition(() => {
        setLocalDomains(result.dashboard.skillDomains);
        onDashboardUpdate(result.dashboard);
      });
    } catch (nextError) {
      setLocalDomains(domains);
      setError(nextError instanceof Error ? nextError.message : "Failed to update skills.");
    } finally {
      setPendingId("");
    }
  }

  return (
    <section className="panel p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-muted">Skill Map</p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em]">Domain progress with live sheet rollups</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Top-level domains roll up progress from nested checklist rows in the `skills` tab. Leaf-item checkboxes
            write back to Google Sheets and recompute domain progress.
          </p>
        </div>
        <div className="rounded-[22px] border border-border/80 bg-black/10 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Weakest Area</p>
          <p className="mt-2 text-lg font-medium text-text">{weakestArea}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {localDomains.map((domain) => {
          const tone = toneForPercent(domain.progressPercent);
          return (
            <article key={domain.id} className={`rounded-[26px] border p-5 shadow-[0_12px_28px_rgba(0,0,0,0.16)] ${tone.shell}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-text">{domain.label}</p>
                  <p className="mt-2 text-sm text-muted">
                    {domain.hasChecklist
                      ? `${domain.completedCount}/${domain.totalCount} checklist items done`
                      : "Summary-only domain row"}
                  </p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${tone.pill}`}>
                  {domain.progressPercent}%
                </span>
              </div>
              <div className="mt-4 h-3 rounded-full bg-black/25">
                <div className={`h-3 rounded-full ${tone.fill}`} style={{ width: clampWidth(domain.progressPercent) }} />
              </div>
              <p className="mt-3 text-sm leading-6 text-muted">
                {domain.weakestForCompany
                  ? `Most acute company gap: ${domain.weakestForCompany}`
                  : domain.notes || "Add child checklist rows under this domain in the skills sheet to track sub-skills cleanly."}
              </p>
            </article>
          );
        })}
      </div>

      {error ? (
        <div className="mt-5 rounded-[22px] border border-[#a35f53]/40 bg-[#241513] px-4 py-3 text-sm text-[#efb7a9]">
          {error}
        </div>
      ) : null}

      <div className="mt-6 space-y-5">
        {localDomains.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-black/10 p-5">
            <p className="text-sm text-text">No skill rows loaded yet.</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Add top-level domain rows in `skills`, then add child rows using `domain`, `parent_skill`, `item_type`,
              and optional `is_checked` columns to turn this into a nested checklist.
            </p>
          </div>
        ) : null}

        {localDomains.map((domain) => (
          <article key={domain.id} className="rounded-[28px] border border-border/80 bg-[linear-gradient(180deg,rgba(16,16,16,0.88),rgba(8,8,8,0.97))] p-5">
            <div className="flex flex-col gap-3 border-b border-border/70 pb-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Domain</p>
                <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-text">{domain.label}</h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
                  {domain.hasChecklist
                    ? `This domain rolls up from ${domain.totalCount} leaf checklist items in the sheet.`
                    : domain.notes || "This domain is still using a flat summary row. Add child rows beneath it in the sheet to unlock checklist tracking."}
                </p>
              </div>
              <div className="min-w-[220px] rounded-[22px] border border-border/80 bg-black/10 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted">Progress</span>
                  <span className="text-sm text-text">{domain.progressPercent}%</span>
                </div>
                <div className="mt-3 h-2.5 rounded-full bg-[color:var(--track)]">
                  <div className="h-2.5 rounded-full bg-[#d8d0c4]" style={{ width: clampWidth(domain.progressPercent) }} />
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {domain.children.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-border bg-black/10 p-4 text-sm leading-6 text-muted">
                  No child rows yet. Keep this as a top-level summary, or add nested checklist rows in the `skills`
                  tab with `parent_skill` pointing at {domain.label}.
                </div>
              ) : null}

              {domain.children.map((child) => (
                <SkillTreeNodeView
                  key={child.id}
                  node={child}
                  level={0}
                  pendingId={pendingId}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
