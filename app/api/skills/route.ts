import { NextResponse } from "next/server";

import { getDataStore } from "@/lib/datastore/sheetsDataStore";
import { hasRequiredGoogleConfig } from "@/lib/utils/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasRequiredGoogleConfig()) {
    return NextResponse.json({
      skills: [],
      skillGaps: [],
      weakestArea: "Unknown"
    });
  }

  try {
    const payload = await getDataStore().getSkills();
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({
      skills: [],
      skillGaps: [],
      weakestArea: "Unknown"
    });
  }
}
