import { NextResponse } from "next/server";

import { getDataStore } from "@/lib/datastore/sheetsDataStore";
import { hasRequiredGoogleConfig } from "@/lib/utils/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasRequiredGoogleConfig()) {
    return NextResponse.json({
      tasks: [],
      dailyPlan: [],
      priorities: []
    });
  }

  try {
    const payload = await getDataStore().getTasks();
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({
      tasks: [],
      dailyPlan: [],
      priorities: []
    });
  }
}

export async function POST(request: Request) {
  if (!hasRequiredGoogleConfig()) {
    return NextResponse.json({ error: "Google Sheets configuration is missing." }, { status: 500 });
  }

  try {
    const body = (await request.json()) as { taskId?: string; checked?: boolean };

    if (!body.taskId || typeof body.checked !== "boolean") {
      return NextResponse.json({ error: "taskId and checked are required." }, { status: 400 });
    }

    const result = await getDataStore().updateTaskStatus(body.taskId, body.checked);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update task." },
      { status: 500 }
    );
  }
}
