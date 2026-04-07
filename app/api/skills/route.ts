import { NextResponse } from "next/server";

import { getDataStore } from "@/lib/datastore/sheetsDataStore";
import { hasRequiredGoogleConfig } from "@/lib/utils/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasRequiredGoogleConfig()) {
    return NextResponse.json({
      skills: [],
      skillDomains: [],
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
      skillDomains: [],
      skillGaps: [],
      weakestArea: "Unknown"
    });
  }
}

export async function POST(request: Request) {
  if (!hasRequiredGoogleConfig()) {
    return NextResponse.json({ error: "Google Sheets configuration is missing." }, { status: 500 });
  }

  try {
    const body = (await request.json()) as { skillId?: string; checked?: boolean };

    if (!body.skillId || typeof body.checked !== "boolean") {
      return NextResponse.json({ error: "skillId and checked are required." }, { status: 400 });
    }

    const result = await getDataStore().updateSkillCheck(body.skillId, body.checked);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update skill progress." },
      { status: 500 }
    );
  }
}
