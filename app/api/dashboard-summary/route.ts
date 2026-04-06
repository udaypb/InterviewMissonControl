import { NextResponse } from "next/server";

import { buildFallbackDashboardPayload, getDataStore } from "@/lib/datastore/sheetsDataStore";
import { hasRequiredGoogleConfig } from "@/lib/utils/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasRequiredGoogleConfig()) {
    return NextResponse.json(
      buildFallbackDashboardPayload("Missing Google configuration. Set the required environment variables and redeploy.")
    );
  }

  try {
    const store = getDataStore();
    const payload = await store.getDashboardSummary();
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown dashboard summary failure";
    return NextResponse.json(buildFallbackDashboardPayload(message));
  }
}
