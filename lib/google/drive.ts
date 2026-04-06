import { google } from "googleapis";

import { getDriveAuth } from "@/lib/google/auth";
import { logWarn } from "@/lib/utils/logging";

const expectedWorkspaceFolders = [
  "brain_dumps",
  "daily_briefs",
  "company_notes",
  "prep_notes",
  "story_drafts",
  "backups"
] as const;

export interface DriveWorkspaceStatus {
  configured: boolean;
  accessible: boolean;
  label: string;
  message: string;
  detail: string;
  folderName?: string;
  missingFolders: string[];
}

async function getDriveClient() {
  const auth = getDriveAuth();
  return google.drive({ version: "v3", auth });
}

export async function getDriveWorkspaceStatus(): Promise<DriveWorkspaceStatus> {
  const folderId = process.env.GOOGLE_DRIVE_PROJECT_FOLDER_ID;

  if (!folderId) {
    return {
      configured: false,
      accessible: false,
      label: "Drive unlinked",
      message: "Working-memory Drive folder is not configured.",
      detail: "Set GOOGLE_DRIVE_PROJECT_FOLDER_ID to the shared InterviewMissionControl project folder.",
      missingFolders: [...expectedWorkspaceFolders]
    };
  }

  try {
    const drive = await getDriveClient();
    const folder = await drive.files.get({
      fileId: folderId,
      fields: "id,name,mimeType"
    });

    const list = await drive.files.list({
      q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: "files(id,name)"
    });

    const childNames = new Set((list.data.files ?? []).map((file) => file.name || ""));
    const missingFolders = expectedWorkspaceFolders.filter((name) => !childNames.has(name));

    return {
      configured: true,
      accessible: true,
      label: missingFolders.length === 0 ? "Drive linked" : "Drive partial",
      message:
        missingFolders.length === 0
          ? "Working-memory Drive folder is available."
          : "Working-memory Drive folder is linked but missing some expected subfolders.",
      detail:
        missingFolders.length === 0
          ? "ChatGPT can use the Drive workspace for raw context while the dashboard renders from Sheets."
          : `Missing subfolders: ${missingFolders.join(", ")}`,
      folderName: folder.data.name || "InterviewMissionControl",
      missingFolders
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Drive workspace error";
    return {
      configured: true,
      accessible: false,
      label: "Drive blocked",
      message: "Drive workspace could not be read with the current service account.",
      detail: message,
      missingFolders: [...expectedWorkspaceFolders]
    };
  }
}

export async function ensureDriveWorkspaceStructure(): Promise<DriveWorkspaceStatus> {
  const folderId = process.env.GOOGLE_DRIVE_PROJECT_FOLDER_ID;
  if (!folderId) {
    return getDriveWorkspaceStatus();
  }

  const drive = await getDriveClient();
  const status = await getDriveWorkspaceStatus();

  if (!status.accessible) {
    return status;
  }

  for (const folderName of status.missingFolders) {
    try {
      await drive.files.create({
        requestBody: {
          name: folderName,
          mimeType: "application/vnd.google-apps.folder",
          parents: [folderId]
        },
        fields: "id,name"
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown folder creation failure";
      logWarn("Failed to create Drive workspace subfolder", {
        folderName,
        message
      });
    }
  }

  return getDriveWorkspaceStatus();
}
