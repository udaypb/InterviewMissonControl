import type { SkillDomain, SkillGapRow, SkillMapItem, SkillRow, SkillTreeNode } from "@/lib/datastore/types";
import { clampPercent } from "@/lib/utils/formatting";

type SkillItemType = "domain" | "group" | "item";

type NormalizedSkillNode = {
  id: string;
  label: string;
  domain: string;
  parentRef: string;
  itemType: SkillItemType;
  checked: boolean;
  progressPercent: number;
  targetPercent: number;
  notes: string;
  weakestForCompany?: string;
  sortOrder: number;
  source: SkillRow;
  children: NormalizedSkillNode[];
};

type SkillSummary = {
  progressPercent: number;
  targetPercent: number;
  completedCount: number;
  totalCount: number;
  weakestForCompany?: string;
  hasChecklist: boolean;
};

export type SkillInsights = {
  skillDomains: SkillDomain[];
  skillMap: SkillMapItem[];
  weakestArea: string;
};

function slugify(value: string, fallback: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || fallback;
}

function normalizeKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferDomainFromLabel(label: string) {
  const normalized = normalizeKey(label);

  if (normalized.includes("coding") || normalized.includes("algorithm")) {
    return "Coding";
  }

  if (normalized.includes("system")) {
    return "System Design";
  }

  if (normalized.includes("behavior")) {
    return "Behavioral";
  }

  if (normalized.includes("agent") || normalized.includes("ai") || normalized.includes("ml")) {
    return "AI";
  }

  return label.trim() || "Core";
}

function normalizeItemType(row: SkillRow) {
  const normalized = row.item_type.trim().toLowerCase();

  if (normalized === "domain" || normalized === "group" || normalized === "item") {
    return normalized;
  }

  if (["child", "subskill", "checklist", "task"].includes(normalized)) {
    return "item";
  }

  const label = row.skill.trim() || row.domain.trim() || row.category.trim();
  const domain = row.domain.trim() || row.category.trim();

  if (row.parent_skill.trim()) {
    return "item";
  }

  if (domain && normalizeKey(domain) !== normalizeKey(label)) {
    return "item";
  }

  return "domain";
}

function isTruthy(value: string) {
  return ["true", "yes", "1", "y", "checked", "done"].includes(value.trim().toLowerCase());
}

function getWeakestCompanyForSkill(
  row: SkillRow,
  gapMap: Map<string, string>
) {
  return gapMap.get(normalizeKey(row.skill)) || gapMap.get(normalizeKey(row.domain));
}

function normalizeSkillRows(skills: SkillRow[], skillGaps: SkillGapRow[]) {
  const weakestGapMap = new Map(
    skillGaps
      .filter((gap) => gap.skill.trim() && gap.company.trim())
      .map((gap) => [normalizeKey(gap.skill), gap.company])
  );

  const nodes = skills.map<NormalizedSkillNode>((row, index) => {
    const label = row.skill.trim() || row.domain.trim() || row.category.trim() || `Skill ${index + 1}`;
    const itemType = normalizeItemType(row);
    const domain = row.domain.trim() || (itemType === "domain" ? label : row.category.trim() || inferDomainFromLabel(label));
    const progressPercent = clampPercent(row.progress_percent || (isTruthy(row.is_checked) ? "100" : "0"));
    const targetPercent = clampPercent(row.target_percent || "100");

    return {
      id: row.skill_id.trim() || slugify(`${domain}-${row.parent_skill}-${label}-${index + 1}`, `skill-${index + 1}`),
      label,
      domain,
      parentRef: row.parent_skill.trim(),
      itemType,
      checked: isTruthy(row.is_checked) || progressPercent >= 100,
      progressPercent,
      targetPercent,
      notes: row.notes.trim(),
      weakestForCompany: getWeakestCompanyForSkill(row, weakestGapMap),
      sortOrder: Number.parseFloat(row.sort_order) || index + 1,
      source: row,
      children: []
    };
  });

  const byId = new Map(nodes.map((node) => [normalizeKey(node.id), node]));
  const byLabel = new Map(nodes.map((node) => [`${normalizeKey(node.domain)}::${normalizeKey(node.label)}`, node]));
  const domainNodes = new Map<string, NormalizedSkillNode>();

  for (const node of nodes) {
    if (node.itemType !== "domain") {
      continue;
    }

    domainNodes.set(normalizeKey(node.label), node);
    domainNodes.set(normalizeKey(node.domain), node);
  }

  for (const node of nodes) {
    if (domainNodes.has(normalizeKey(node.domain))) {
      continue;
    }

    const syntheticDomain: NormalizedSkillNode = {
      id: `domain-${slugify(node.domain, String(domainNodes.size + 1))}`,
      label: node.domain,
      domain: node.domain,
      parentRef: "",
      itemType: "domain",
      checked: false,
      progressPercent: 0,
      targetPercent: 100,
      notes: "",
      weakestForCompany: undefined,
      sortOrder: node.sortOrder - 0.5,
      source: {
        skill_id: "",
        skill: node.domain,
        category: node.domain,
        domain: node.domain,
        parent_skill: "",
        item_type: "domain",
        is_checked: "",
        progress_percent: "",
        target_percent: "100",
        notes: "",
        last_updated: "",
        sort_order: String(node.sortOrder - 0.5)
      },
      children: []
    };

    nodes.push(syntheticDomain);
    domainNodes.set(normalizeKey(node.domain), syntheticDomain);
    byId.set(normalizeKey(syntheticDomain.id), syntheticDomain);
    byLabel.set(`${normalizeKey(syntheticDomain.domain)}::${normalizeKey(syntheticDomain.label)}`, syntheticDomain);
  }

  const rootDomains = new Set<NormalizedSkillNode>();

  for (const node of nodes) {
    if (node.itemType === "domain") {
      rootDomains.add(node);
      continue;
    }

    let parent: NormalizedSkillNode | undefined;
    const normalizedParentRef = normalizeKey(node.parentRef);

    if (normalizedParentRef) {
      parent = byId.get(normalizedParentRef) || byLabel.get(`${normalizeKey(node.domain)}::${normalizedParentRef}`);
    }

    if (!parent) {
      parent = domainNodes.get(normalizeKey(node.domain));
    }

    if (parent) {
      parent.children.push(node);
      continue;
    }

    rootDomains.add(node);
  }

  for (const node of nodes) {
    node.children.sort((left, right) => left.sortOrder - right.sortOrder || left.label.localeCompare(right.label));
  }

  return [...rootDomains].sort(
    (left, right) => left.sortOrder - right.sortOrder || left.label.localeCompare(right.label)
  );
}

function combineWeakestCompany(values: Array<string | undefined>) {
  return values.find(Boolean);
}

function summarizeNode(node: NormalizedSkillNode): SkillSummary {
  if (node.children.length === 0) {
    if (node.itemType === "item") {
      const checked = node.checked || node.progressPercent >= 100;
      return {
        progressPercent: checked ? 100 : node.progressPercent,
        targetPercent: node.targetPercent,
        completedCount: checked ? 1 : 0,
        totalCount: 1,
        weakestForCompany: node.weakestForCompany,
        hasChecklist: true
      };
    }

    return {
      progressPercent: node.progressPercent,
      targetPercent: node.targetPercent,
      completedCount: node.progressPercent >= 100 ? 1 : 0,
      totalCount: 0,
      weakestForCompany: node.weakestForCompany,
      hasChecklist: false
    };
  }

  const childSummaries = node.children.map(summarizeNode);
  const checklistChildren = childSummaries.filter((child) => child.hasChecklist);

  if (checklistChildren.length > 0) {
    const completedCount = checklistChildren.reduce((sum, child) => sum + child.completedCount, 0);
    const totalCount = checklistChildren.reduce((sum, child) => sum + child.totalCount, 0);
    return {
      progressPercent: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
      targetPercent: 100,
      completedCount,
      totalCount,
      weakestForCompany: combineWeakestCompany([
        node.weakestForCompany,
        ...checklistChildren.map((child) => child.weakestForCompany)
      ]),
      hasChecklist: true
    };
  }

  const averageProgress =
    childSummaries.reduce((sum, child) => sum + child.progressPercent, 0) / Math.max(1, childSummaries.length);

  return {
    progressPercent: Math.round(averageProgress),
    targetPercent: Math.max(node.targetPercent, ...childSummaries.map((child) => child.targetPercent)),
    completedCount: 0,
    totalCount: 0,
    weakestForCompany: combineWeakestCompany([node.weakestForCompany, ...childSummaries.map((child) => child.weakestForCompany)]),
    hasChecklist: false
  };
}

function toTreeNode(node: NormalizedSkillNode): SkillTreeNode {
  const summary = summarizeNode(node);
  const children = node.children.map(toTreeNode);
  return {
    id: node.id,
    label: node.label,
    kind: node.itemType === "group" ? "group" : "item",
    domain: node.domain,
    checked: node.checked,
    canCheck: node.itemType === "item" && node.children.length === 0,
    progressPercent: summary.progressPercent,
    targetPercent: summary.targetPercent,
    notes: node.notes,
    weakestForCompany: summary.weakestForCompany,
    children
  };
}

export function buildSkillInsights(skills: SkillRow[], skillGaps: SkillGapRow[]): SkillInsights {
  const domainRoots = normalizeSkillRows(skills, skillGaps);
  const skillDomains = domainRoots.map<SkillDomain>((domain) => {
    const summary = summarizeNode(domain);
    return {
      id: domain.id,
      label: domain.label,
      progressPercent: summary.progressPercent,
      targetPercent: summary.targetPercent,
      completedCount: summary.completedCount,
      totalCount: summary.totalCount,
      notes: domain.notes,
      weakestForCompany: summary.weakestForCompany || domain.weakestForCompany,
      hasChecklist: summary.hasChecklist,
      children: domain.children.map(toTreeNode)
    };
  });

  const skillMap = skillDomains.map<SkillMapItem>((domain) => ({
    skill: domain.label,
    category: domain.label,
    progressPercent: domain.progressPercent,
    targetPercent: domain.targetPercent,
    weakestForCompany: domain.weakestForCompany
  }));

  return {
    skillDomains,
    skillMap,
    weakestArea: [...skillMap].sort((left, right) => left.progressPercent - right.progressPercent)[0]?.skill || "Unknown"
  };
}

function findNodeById(nodes: NormalizedSkillNode[], targetId: string): NormalizedSkillNode | undefined {
  for (const node of nodes) {
    if (normalizeKey(node.id) === normalizeKey(targetId)) {
      return node;
    }

    const childMatch = findNodeById(node.children, targetId);
    if (childMatch) {
      return childMatch;
    }
  }

  return undefined;
}

function updateProgressFromChildren(node: NormalizedSkillNode): number {
  if (node.children.length === 0) {
    return node.itemType === "item" ? (node.checked ? 100 : node.progressPercent) : node.progressPercent;
  }

  const summary = summarizeNode(node);
  return summary.progressPercent;
}

function flattenNodes(nodes: NormalizedSkillNode[]) {
  const rows: NormalizedSkillNode[] = [];

  for (const node of nodes) {
    rows.push(node);
    rows.push(...flattenNodes(node.children));
  }

  return rows;
}

export function applySkillCheck(skills: SkillRow[], skillId: string, checked: boolean) {
  const roots = normalizeSkillRows(skills, []);
  const targetNode = findNodeById(roots, skillId);

  if (!targetNode || targetNode.itemType !== "item" || targetNode.children.length > 0) {
    throw new Error("Skill checklist item not found.");
  }

  targetNode.checked = checked;
  targetNode.progressPercent = checked ? 100 : 0;

  const flattened = flattenNodes(roots);

  for (const node of flattened.reverse()) {
    node.progressPercent = updateProgressFromChildren(node);
    if (node.itemType === "item" && node.children.length === 0) {
      node.source.is_checked = node.checked ? "TRUE" : "FALSE";
    }
    node.source.progress_percent = String(node.progressPercent);
    node.source.target_percent = String(node.targetPercent || 100);
  }

  return flattened
    .sort((left, right) => left.sortOrder - right.sortOrder || left.label.localeCompare(right.label))
    .map((node) => ({
      ...node.source,
      skill_id: node.id,
      skill: node.label,
      domain: node.domain,
      item_type: node.itemType,
      is_checked: node.itemType === "item" && node.children.length === 0 ? (node.checked ? "TRUE" : "FALSE") : node.source.is_checked,
      sort_order: String(node.sortOrder)
    }));
}
