import { google, sheets_v4 } from "googleapis";

import { sheetDefinitions, sheetSamples, spreadsheetTitle } from "@/config/sheets";
import type { DashboardSummaryRow, SheetName, SyncLogRow } from "@/lib/datastore/types";
import { getSheetsAuth } from "@/lib/google/auth";
import { logInfo, logWarn } from "@/lib/utils/logging";

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

async function getSheetsClient() {
  const auth = getSheetsAuth();
  return google.sheets({ version: "v4", auth });
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

    if (!hasExpectedHeaders) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!1:1`,
        valueInputOption: "RAW",
        requestBody: {
          values: [[...headers]]
        }
      });
      logWarn("Normalized sheet headers", { sheetName });
    }

    const hasDataRows = (response.data.values?.length ?? 0) > 1;
    if (!hasDataRows) {
      const sampleRows = sheetSamples[sheetName];
      if (sampleRows.length > 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: toA1Range(sheetName),
          valueInputOption: "RAW",
          requestBody: {
            values: [[...headers], ...sampleRows.map((row) => rowToArray(row as unknown as Record<string, string>, headers))]
          }
        });
      }
    }
  }

  return {
    spreadsheetId,
    spreadsheetTitle
  };
}

export async function readSheet(sheetName: SheetName): Promise<Record<string, string>[]> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error("Missing GOOGLE_SHEETS_SPREADSHEET_ID");
  }

  await ensureSpreadsheetStructure();
  const sheets = await getSheetsClient();
  const headers = sheetDefinitions[sheetName];
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: toA1Range(sheetName)
  });
  const values = (response.data.values ?? []) as string[][];
  const dataRows = values.slice(1);
  return rowsToObjects(dataRows, headers);
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
  await writeSheet("dashboard_summary", rows);
}
