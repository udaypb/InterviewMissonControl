import { google, sheets_v4 } from "googleapis";

import { sheetDefinitions, sheetSamples, spreadsheetTitle } from "@/config/sheets";
import type { DashboardSummaryRow, SheetName, SyncLogRow } from "@/lib/datastore/types";
import { getSheetsAuth } from "@/lib/google/auth";
import { logInfo, logWarn } from "@/lib/utils/logging";

const sheetHeaderAliases: Partial<Record<SheetName, Partial<Record<string, string[]>>>> = {
  interviews: {
    round_type: ["round type", "stage", "type"],
    start_time: ["start time", "time"],
    end_time: ["end time"],
    event_id: ["event id", "calendar_event_id"],
    calendar_source: ["calendar source"],
    meeting_link: ["meeting link", "link"],
    last_synced_at: ["last synced at", "synced at"],
    priority: ["importance"]
  },
  tasks: {
    task_id: ["task id", "id"],
    due_date: ["due date", "date"],
    estimated_minutes: ["estimated minutes", "minutes", "duration"],
    last_updated: ["last updated"]
  },
  daily_plan: {
    task_id: ["task id"],
    focus_area: ["focus area"],
    priority: ["importance"]
  },
  companies: {
    h1b_sponsorship: ["h1b sponsorship", "sponsorship"],
    salary_band: ["salary band", "compensation"],
    target_level: ["target level", "level"],
    next_step: ["next step"],
    status: ["stage"]
  },
  recruiter_notes: {
    recruiter_name: ["recruiter", "recruiter name"],
    last_contact_date: ["last contact date"],
    next_step: ["next step"]
  },
  skills: {
    progress_percent: ["progress percent", "progress"],
    target_percent: ["target percent", "target"],
    last_updated: ["last updated"]
  },
  skill_gaps: {
    gap_score: ["gap score"]
  },
  behavioral_stories: {
    story_id: ["story id"],
    company_fit: ["company fit"],
    strength_score: ["strength score"]
  },
  dashboard_summary: {
    last_updated: ["last updated"]
  },
  sync_log: {
    sync_type: ["sync type"]
  }
};

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function toA1Range(sheetName: string) {
  return `${sheetName}!A:Z`;
}

function columnNumberToLetter(column: number) {
  let value = column;
  let letters = "";

  while (value > 0) {
    const remainder = (value - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    value = Math.floor((value - 1) / 26);
  }

  return letters || "A";
}

function rowToArray<T extends object>(row: T, headers: readonly string[]) {
  const record = row as Record<string, string>;
  return headers.map((header) => record[header] ?? "");
}

function getCanonicalHeaders(sheetName: SheetName) {
  return [...sheetDefinitions[sheetName]];
}

function getHeaderLookup(sheetName: SheetName, actualHeaders: string[]) {
  const normalizedActual = new Map(
    actualHeaders.map((header, index) => [normalizeHeader(header), index])
  );
  const aliases = sheetHeaderAliases[sheetName] ?? {};
  const lookup = new Map<string, number>();

  for (const canonicalHeader of getCanonicalHeaders(sheetName)) {
    const candidates = [canonicalHeader, ...(aliases[canonicalHeader] ?? [])];
    const matchedIndex = candidates
      .map((candidate) => normalizedActual.get(normalizeHeader(candidate)))
      .find((index): index is number => typeof index === "number");

    if (typeof matchedIndex === "number") {
      lookup.set(canonicalHeader, matchedIndex);
    }
  }

  return lookup;
}

function rowsToObjects(
  values: string[][],
  sheetName: SheetName,
  actualHeaders: string[]
): Record<string, string>[] {
  const lookup = getHeaderLookup(sheetName, actualHeaders);
  const canonicalHeaders = getCanonicalHeaders(sheetName);

  return values
    .filter((row) => row.some((cell) => cell !== ""))
    .map((row) =>
      canonicalHeaders.reduce<Record<string, string>>((accumulator, header) => {
        const index = lookup.get(header);
        accumulator[header] = typeof index === "number" ? row[index] ?? "" : "";
        return accumulator;
      }, {})
    );
}

async function getSheetsClient() {
  const auth = getSheetsAuth();
  return google.sheets({ version: "v4", auth });
}

async function getSpreadsheetId() {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error("Missing GOOGLE_SHEETS_SPREADSHEET_ID");
  }
  return spreadsheetId;
}

async function getSheetValues(sheetName: SheetName) {
  const spreadsheetId = await getSpreadsheetId();
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: toA1Range(sheetName)
  });
  return {
    spreadsheetId,
    sheets,
    values: (response.data.values ?? []) as string[][]
  };
}

export async function getSpreadsheetMetadata() {
  const spreadsheetId = await getSpreadsheetId();
  const sheets = await getSheetsClient();
  return sheets.spreadsheets.get({
    spreadsheetId,
    includeGridData: false
  });
}

export async function ensureSpreadsheetStructure() {
  const spreadsheetId = await getSpreadsheetId();
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

      if (sheetName === "dashboard_summary" && sheetSamples[sheetName].length > 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: toA1Range(sheetName),
          valueInputOption: "RAW",
          requestBody: {
            values: [
              [...headers],
              ...sheetSamples[sheetName].map((row) =>
                rowToArray(row as unknown as Record<string, string>, headers)
              )
            ]
          }
        });
      }
    } else {
      const hasCanonicalHeader = headers.some((header) =>
        currentHeaders.some((current) => normalizeHeader(current) === normalizeHeader(header))
      );

      if (!hasCanonicalHeader) {
        logWarn("Existing sheet uses custom headers; preserving as-is", { sheetName, currentHeaders });
      }
    }
  }

  return {
    spreadsheetId,
    spreadsheetTitle
  };
}

export async function readSheet(sheetName: SheetName): Promise<Record<string, string>[]> {
  await ensureSpreadsheetStructure();
  const { values } = await getSheetValues(sheetName);
  const actualHeaders = values[0] ?? [];
  const dataRows = values.slice(1);

  if (actualHeaders.length === 0) {
    return [];
  }

  return rowsToObjects(dataRows, sheetName, actualHeaders);
}

export async function writeSheet<T extends object>(sheetName: SheetName, rows: T[]) {
  const spreadsheetId = await getSpreadsheetId();
  await ensureSpreadsheetStructure();

  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!1:1`
  });

  const existingHeaders = (response.data.values?.[0] ?? []) as string[];
  const canonicalHeaders = getCanonicalHeaders(sheetName);
  const outputHeaders = existingHeaders.length
    ? [...existingHeaders, ...canonicalHeaders.filter((header) => !existingHeaders.includes(header))]
    : canonicalHeaders;
  const lastColumn = columnNumberToLetter(outputHeaders.length);

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A:${lastColumn}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[...outputHeaders], ...rows.map((row) => rowToArray(row, outputHeaders))]
    }
  });
}

export async function appendSyncLogRow(row: SyncLogRow) {
  const spreadsheetId = await getSpreadsheetId();
  await ensureSpreadsheetStructure();

  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "sync_log!1:1"
  });
  const existingHeaders = ((response.data.values?.[0] ?? []) as string[]).length
    ? ((response.data.values?.[0] ?? []) as string[])
    : [...sheetDefinitions.sync_log];
  const outputHeaders = [
    ...existingHeaders,
    ...sheetDefinitions.sync_log.filter((header) => !existingHeaders.includes(header))
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `sync_log!A:${columnNumberToLetter(outputHeaders.length)}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [rowToArray(row as unknown as Record<string, string>, outputHeaders)]
    }
  });
}

export async function writeDashboardSummaryRows(rows: DashboardSummaryRow[]) {
  await writeSheet("dashboard_summary", rows);
}
