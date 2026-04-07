import { google, sheets_v4 } from "googleapis";

import { sheetDefinitions, spreadsheetTitle } from "@/config/sheets";
import type { DashboardSummaryRow, SheetName, SkillRow, SyncLogRow } from "@/lib/datastore/types";
import { getSheetsAuth } from "@/lib/google/auth";
import { logInfo, logWarn } from "@/lib/utils/logging";

const STRUCTURE_CACHE_TTL_MS = 5 * 60_000;

declare global {
  var __missionControlSheetsStructureCheckedAt__: number | undefined;
}

function toA1Range(sheetName: string) {
  return `${sheetName}!A:Z`;
}

function rowToArray<T extends Record<string, string>>(
  row: T,
  headers: readonly string[]
) {
  return headers.map((header) => row[header] ?? "");
}

function rowsToObjects(
  values: string[][],
  headers: readonly string[]
): Record<string, string>[] {
  return values
    .filter((row) => row.some((cell) => cell !== ""))
    .map((row) =>
      headers.reduce<Record<string, string>>((accumulator, header, index) => {
        accumulator[header] = row[index] ?? "";
        return accumulator;
      }, {})
    );
}

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function slugify(value: string, fallback: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || fallback;
}

function inferSkillCategory(skill: string) {
  const normalized = skill.toLowerCase();
  if (normalized.includes("coding") || normalized.includes("algorithm")) {
    return "Coding";
  }
  if (normalized.includes("system")) {
    return "System Design";
  }
  if (normalized.includes("ai") || normalized.includes("agent")) {
    return "AI";
  }
  if (normalized.includes("behavior")) {
    return "Behavioral";
  }

  return "Core";
}

function normalizePercentLikeValue(value: string) {
  const normalized = value.trim().toLowerCase();

  switch (normalized) {
    case "high":
    case "strong":
      return "85";
    case "medium":
    case "ready":
      return "65";
    case "low":
    case "weak":
      return "35";
    default:
      return value;
  }
}

function clampPercentLikeCheckbox(value: string) {
  const normalized = value.trim().toLowerCase();

  if (["100", "true", "yes", "1", "checked", "done"].includes(normalized)) {
    return "TRUE";
  }

  return "FALSE";
}

const readHeaderAliases: Partial<Record<SheetName, Record<string, string[]>>> = {
  interviews: {
    date: ["date", "event_date"],
    round_type: ["event_type", "round_type", "round", "stage"],
    status: ["status"],
    start_time: ["start_time", "time", "start"],
    end_time: ["end_time", "end"],
    interviewer: ["interviewer", "recruiter_name", "recruiter"],
    meeting_link: ["meeting_link", "link", "meeting_url"],
    notes: ["notes", "next_step"]
  },
  rounds: {
    round_name: ["round_name", "round_type", "round", "stage", "event_type", "status"],
    date: ["date", "event_date"],
    time: ["time", "event_time", "start_time", "start"],
    status: ["status", "stage"],
    priority: ["priority"],
    next_step: ["next_step"],
    interviewer: ["interviewer", "recruiter_name", "recruiter"],
    format: ["format", "mode"],
    is_latest_for_company: ["is_latest_for_company"],
    is_next_upcoming: ["is_next_upcoming"]
  },
  tasks: {
    task_id: ["task_id", "id"],
    task: ["task", "focus_area"],
    company: ["company"],
    category: ["category"],
    priority: ["priority"],
    status: ["status"],
    due_date: ["due_date", "deadline"],
    estimated_minutes: ["estimated_minutes", "estimate_minutes", "estimate"],
    notes: ["notes"],
    last_updated: ["last_updated", "updated_at"]
  },
  daily_plan: {
    task_id: ["task_id", "task"],
    slot: ["slot"],
    focus_area: ["focus_area", "focus", "task"],
    notes: ["notes", "task"]
  },
  companies: {
    priority: ["priority"],
    h1b_sponsorship: ["h1b_sponsorship", "sponsorship", "visa_support", "visa"],
    salary_band: ["salary_band", "compensation"],
    target_level: ["target_level", "level"],
    recruiter: ["recruiter", "recruiter_name"],
    next_step: ["next_step", "stage"],
    status: ["status", "stage"]
  },
  recruiter_notes: {
    recruiter_name: ["recruiter_name", "recruiter"],
    last_contact_date: ["last_contact_date", "date"],
    next_step: ["next_step", "stage"]
  },
  resources: {
    resource_id: ["resource_id", "id"],
    title: ["title", "name", "resource"],
    category: ["category", "type"],
    company: ["company"],
    url: ["url", "link"],
    status: ["status"],
    purpose: ["purpose", "description"],
    notes: ["notes", "usage_notes"]
  },
  skills: {
    skill_id: ["skill_id", "id"],
    skill: ["skill", "name"],
    level: ["level", "row_level"],
    domain: ["domain", "category", "top_level_domain", "pillar"],
    subcategory: ["subcategory", "group", "sub_category"],
    topic: ["topic", "skill", "item"],
    progress_percent: ["progress_percent", "progress", "checked_value", "completion", "0"],
    is_checked: ["is_checked", "checked", "done", "complete", "completed", "progress", "0"],
    notes: ["notes", "risk"],
    category: ["skill_category", "focus_area"],
    parent_skill: ["parent_skill", "parent", "parent_id"],
    item_type: ["item_type", "row_type", "type"],
    target_percent: ["target_percent", "target"],
    last_updated: ["last_updated", "updated_at"],
    sort_order: ["sort_order", "order", "position"]
  },
  behavioral_bank: {
    story_id: ["story_id", "story_id_", "storyid", "story_id_number"],
    title: ["title"],
    primary_theme: ["primary_theme", "theme"],
    secondary_themes: ["secondary_themes", "secondary_theme", "secondary"],
    companies: ["companies", "company_fit", "company"],
    status: ["status"],
    use_for: ["use_for", "use_case", "use_cases"],
    story: ["story", "body", "narrative"],
    company_calibration: ["company_calibration", "calibration"],
    notes: ["notes"]
  },
  behavioral_stories: {
    story_id: ["story_id"],
    title: ["title"],
    theme: ["theme", "primary_theme"],
    company_fit: ["company_fit", "companies", "company"],
    strength_score: ["strength_score", "score"],
    resume_anchor: ["resume_anchor"],
    use_for: ["use_for", "use_case", "use_cases"],
    situation: ["situation"],
    task: ["task"],
    action: ["action"],
    result: ["result"],
    reflection: ["reflection"],
    delivery_notes: ["delivery_notes"],
    notes: ["notes", "delivery_notes", "reflection"]
  },
  dashboard_summary: {
    key: ["key"],
    value: ["value"],
    last_updated: ["last_updated", "updated_at"]
  },
  sync_log: {
    timestamp: ["timestamp", "time"],
    sync_type: ["sync_type", "type"]
  }
};

function getCanonicalValue(
  normalizedRow: Record<string, string>,
  sheetName: SheetName,
  canonicalHeader: string
) {
  const aliases = readHeaderAliases[sheetName]?.[canonicalHeader] ?? [canonicalHeader];

  for (const alias of aliases) {
    const value = normalizedRow[normalizeHeader(alias)];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return "";
}

function canonicalizeRow(
  sheetName: SheetName,
  sourceRow: Record<string, string>,
  rowIndex: number
) {
  const normalizedRow = Object.entries(sourceRow).reduce<Record<string, string>>((accumulator, [key, value]) => {
    accumulator[normalizeHeader(key)] = value ?? "";
    return accumulator;
  }, {});

  const canonicalRow = sheetDefinitions[sheetName].reduce<Record<string, string>>((accumulator, header) => {
    accumulator[header] = getCanonicalValue(normalizedRow, sheetName, header);
    return accumulator;
  }, {});

  if (sheetName === "interviews" && !canonicalRow.event_id) {
    canonicalRow.event_id = slugify(
      `${canonicalRow.company}-${canonicalRow.date}-${canonicalRow.round_type}`,
      `interview-${rowIndex + 1}`
    );
    canonicalRow.calendar_source = canonicalRow.calendar_source || "sheet";
    canonicalRow.status = canonicalRow.status || "tracked";
  }

  if (sheetName === "tasks") {
    canonicalRow.task_id = canonicalRow.task_id || `task-${slugify(canonicalRow.task, String(rowIndex + 1))}`;
    canonicalRow.source = canonicalRow.source || "sheet";
  }

  if (sheetName === "resources") {
    canonicalRow.resource_id = canonicalRow.resource_id || `resource-${slugify(canonicalRow.title, String(rowIndex + 1))}`;
    canonicalRow.status = canonicalRow.status || "active";
    canonicalRow.notes = canonicalRow.notes || canonicalRow.purpose;
  }

  if (sheetName === "companies") {
    canonicalRow.next_step = canonicalRow.next_step || canonicalRow.status;
    canonicalRow.status = canonicalRow.status || canonicalRow.priority;
  }

  if (sheetName === "skills") {
    const rawLevel = canonicalRow.level.trim().toUpperCase();
    const normalizedType = canonicalRow.item_type.trim().toLowerCase();
    const explicitType =
      normalizedType === "domain" || normalizedType === "group" || normalizedType === "item"
        ? normalizedType
        : normalizedType === "child" || normalizedType === "subskill" || normalizedType === "checklist"
          ? "item"
          : "";

    if (rawLevel === "CATEGORY") {
      canonicalRow.skill = canonicalRow.category || canonicalRow.domain || canonicalRow.skill || `Skill ${rowIndex + 1}`;
      canonicalRow.domain = canonicalRow.category || canonicalRow.domain || canonicalRow.skill;
      canonicalRow.subcategory = "";
      canonicalRow.topic = "";
      canonicalRow.parent_skill = "";
      canonicalRow.item_type = explicitType || "domain";
    } else if (rawLevel === "SUBCATEGORY") {
      canonicalRow.skill = canonicalRow.subcategory || canonicalRow.skill || `Skill ${rowIndex + 1}`;
      canonicalRow.domain = canonicalRow.category || canonicalRow.domain || inferSkillCategory(canonicalRow.skill);
      canonicalRow.parent_skill = canonicalRow.category || canonicalRow.parent_skill;
      canonicalRow.topic = "";
      canonicalRow.item_type = explicitType || "group";
    } else if (rawLevel === "TOPIC") {
      canonicalRow.skill = canonicalRow.topic || canonicalRow.skill || `Skill ${rowIndex + 1}`;
      canonicalRow.domain = canonicalRow.category || canonicalRow.domain || inferSkillCategory(canonicalRow.skill);
      canonicalRow.parent_skill = canonicalRow.subcategory || canonicalRow.category || canonicalRow.parent_skill;
      canonicalRow.item_type = explicitType || "item";
    } else {
      canonicalRow.skill = canonicalRow.skill || canonicalRow.topic || canonicalRow.subcategory || canonicalRow.domain || canonicalRow.category || `Skill ${rowIndex + 1}`;
      canonicalRow.category = canonicalRow.category || inferSkillCategory(canonicalRow.skill);
      canonicalRow.domain =
        canonicalRow.domain ||
        (!canonicalRow.parent_skill && explicitType !== "item" ? canonicalRow.skill : canonicalRow.category || inferSkillCategory(canonicalRow.skill));
      canonicalRow.item_type =
        explicitType ||
        (canonicalRow.parent_skill
          ? "item"
          : canonicalRow.domain && normalizeHeader(canonicalRow.domain) !== normalizeHeader(canonicalRow.skill)
            ? "item"
            : "domain");
      canonicalRow.level =
        canonicalRow.level ||
        (canonicalRow.item_type === "domain" ? "CATEGORY" : canonicalRow.item_type === "group" ? "SUBCATEGORY" : "TOPIC");
    }

    canonicalRow.category = canonicalRow.category || canonicalRow.domain || inferSkillCategory(canonicalRow.skill);
    canonicalRow.is_checked = canonicalRow.is_checked || "";
    const normalizedCheck = canonicalRow.is_checked.trim().toLowerCase();
    if (["true", "yes", "1", "y", "checked", "done"].includes(normalizedCheck)) {
      canonicalRow.progress_percent = "100";
    }
    if (["false", "no", "0", "n", "unchecked", ""].includes(normalizedCheck) && !canonicalRow.progress_percent) {
      canonicalRow.progress_percent = "0";
    }
    canonicalRow.progress_percent = normalizePercentLikeValue(
      canonicalRow.progress_percent || (canonicalRow.is_checked ? "100" : "0")
    );
    canonicalRow.target_percent = normalizePercentLikeValue(canonicalRow.target_percent || "100");
    canonicalRow.skill_id =
      canonicalRow.skill_id ||
      slugify(
        `${canonicalRow.domain}-${canonicalRow.parent_skill}-${canonicalRow.skill}`,
        `skill-${rowIndex + 1}`
      );
    canonicalRow.sort_order = canonicalRow.sort_order || String(rowIndex + 1);
    if (!canonicalRow.is_checked && canonicalRow.item_type === "item") {
      canonicalRow.is_checked = clampPercentLikeCheckbox(canonicalRow.progress_percent);
    }
  }

  if (sheetName === "behavioral_bank") {
    canonicalRow.story_id = canonicalRow.story_id || `story-${rowIndex + 1}`;
    canonicalRow.status = canonicalRow.status || "Ready";
    canonicalRow.story = canonicalRow.story || canonicalRow.notes;
  }

  return canonicalRow;
}

async function getSheetsClient() {
  const auth = getSheetsAuth();
  return google.sheets({ version: "v4", auth });
}

async function getCurrentSheetHeaders(sheetName: SheetName) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error("Missing GOOGLE_SHEETS_SPREADSHEET_ID");
  }

  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!1:1`
  });

  return ((response.data.values?.[0] ?? []) as string[]).filter((header) => header.trim().length > 0);
}

function getCanonicalHeaderForActualHeader(sheetName: SheetName, actualHeader: string) {
  const normalizedActualHeader = normalizeHeader(actualHeader);
  const aliases = readHeaderAliases[sheetName] ?? {};

  for (const [canonicalHeader, candidates] of Object.entries(aliases)) {
    const allCandidates = [canonicalHeader, ...candidates];
    if (allCandidates.some((candidate) => normalizeHeader(candidate) === normalizedActualHeader)) {
      return canonicalHeader;
    }
  }

  return normalizedActualHeader;
}

function rowToSheetHeaderArray(
  sheetName: SheetName,
  row: Record<string, string>,
  actualHeaders: readonly string[]
) {
  return actualHeaders.map((actualHeader) => {
    const canonicalHeader = getCanonicalHeaderForActualHeader(sheetName, actualHeader);
    return row[canonicalHeader] ?? row[actualHeader] ?? "";
  });
}

function getStructureCacheTimestamp() {
  return globalThis.__missionControlSheetsStructureCheckedAt__ ?? 0;
}

function markStructureCacheFresh() {
  globalThis.__missionControlSheetsStructureCheckedAt__ = Date.now();
}

export async function getSpreadsheetMetadata() {
  const env = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!env) {
    throw new Error("Missing GOOGLE_SHEETS_SPREADSHEET_ID");
  }

  const sheets = await getSheetsClient();
  return sheets.spreadsheets.get({
    spreadsheetId: env,
    includeGridData: false
  });
}

export async function ensureSpreadsheetStructure() {
  if (Date.now() - getStructureCacheTimestamp() < STRUCTURE_CACHE_TTL_MS) {
    return {
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "",
      spreadsheetTitle
    };
  }

  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error("Missing GOOGLE_SHEETS_SPREADSHEET_ID");
  }

  const sheets = await getSheetsClient();
  const metadata = await getSpreadsheetMetadata();
  const existingNames = new Set(
    metadata.data.sheets?.map((sheet) => sheet.properties?.title).filter(Boolean) as string[]
  );

  const requests: sheets_v4.Schema$Request[] = [];

  for (const [sheetName] of Object.entries(sheetDefinitions)) {
    if (!existingNames.has(sheetName)) {
      requests.push({
        addSheet: {
          properties: {
            title: sheetName
          }
        }
      });
    }
  }

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests }
    });
    logInfo("Added missing spreadsheet tabs", { spreadsheetId, requests: requests.length });
  }

  for (const [sheetName, headers] of Object.entries(sheetDefinitions) as Array<
    [SheetName, readonly string[]]
  >) {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!1:2`
    });

    const currentHeaders = (response.data.values?.[0] ?? []) as string[];
    const hasExpectedHeaders =
      currentHeaders.length === headers.length &&
      headers.every((header, index) => currentHeaders[index] === header);

    if (currentHeaders.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!1:1`,
        valueInputOption: "RAW",
        requestBody: {
          values: [[...headers]]
        }
      });
      logInfo("Initialized empty sheet headers", { sheetName });
    } else if (!hasExpectedHeaders) {
      logWarn("Preserving existing sheet headers", {
        sheetName,
        currentHeaders: currentHeaders.join(",")
      });
    }
  }

  markStructureCacheFresh();

  return {
    spreadsheetId,
    spreadsheetTitle
  };
}

function parseSheetValues(
  sheetName: SheetName,
  values: string[][]
) {
  const actualHeaders = (values[0] ?? []) as string[];
  if (actualHeaders.length === 0) {
    return [];
  }

  const dataRows = values.slice(1);
  const rows = rowsToObjects(dataRows, actualHeaders);
  return rows.map((row, index) => canonicalizeRow(sheetName, row, index));
}

export async function readSheet(sheetName: SheetName): Promise<Record<string, string>[]> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error("Missing GOOGLE_SHEETS_SPREADSHEET_ID");
  }

  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: toA1Range(sheetName)
  });
  const values = (response.data.values ?? []) as string[][];
  return parseSheetValues(sheetName, values);
}

export async function readSheets(sheetNames: SheetName[]) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error("Missing GOOGLE_SHEETS_SPREADSHEET_ID");
  }

  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: sheetNames.map((sheetName) => toA1Range(sheetName))
  });

  const valueRanges = response.data.valueRanges ?? [];
  const parsedEntries = sheetNames.map((sheetName, index) => [
    sheetName,
    parseSheetValues(sheetName, (valueRanges[index]?.values ?? []) as string[][])
  ]);

  return Object.fromEntries(parsedEntries) as Record<SheetName, Record<string, string>[]>;
}

export async function writeSheet<T extends object>(
  sheetName: SheetName,
  rows: T[]
) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error("Missing GOOGLE_SHEETS_SPREADSHEET_ID");
  }

  const headers = sheetDefinitions[sheetName];
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: toA1Range(sheetName),
    valueInputOption: "RAW",
    requestBody: {
      values: [[...headers], ...rows.map((row) => rowToArray(row as Record<string, string>, headers))]
    }
  });
}

async function writeRowsPreservingHeaders<T extends object>(
  sheetName: SheetName,
  rows: T[]
) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error("Missing GOOGLE_SHEETS_SPREADSHEET_ID");
  }

  const headers = await getCurrentSheetHeaders(sheetName);
  const effectiveHeaders = headers.length > 0 ? headers : [...sheetDefinitions[sheetName]];
  const sheets = await getSheetsClient();

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: toA1Range(sheetName),
    valueInputOption: "RAW",
    requestBody: {
      values: [[...effectiveHeaders], ...rows.map((row) => rowToSheetHeaderArray(sheetName, row as Record<string, string>, effectiveHeaders))]
    }
  });
}

export async function appendSyncLogRow(row: SyncLogRow) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error("Missing GOOGLE_SHEETS_SPREADSHEET_ID");
  }

  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "sync_log!A:D",
    valueInputOption: "RAW",
    requestBody: {
      values: [
        [
          row.timestamp,
          row.sync_type,
          row.status,
          row.details
        ]
      ]
    }
  });
}

export async function writeDashboardSummaryRows(rows: DashboardSummaryRow[]) {
  await writeRowsPreservingHeaders("dashboard_summary", rows);
}

export async function writeSkillsRows(rows: SkillRow[]) {
  await writeRowsPreservingHeaders("skills", rows);
}
