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
