import { NextResponse } from "next/server";

import { getDataStore } from "@/lib/datastore/sheetsDataStore";
import { hasRequiredGoogleConfig } from "@/lib/utils/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasRequiredGoogleConfig()) {
    return NextResponse.json({
      companies: [],
      recruiterNotes: []
    });
  }

  try {
    const payload = await getDataStore().getCompanies();
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({
      companies: [],
      recruiterNotes: []
    });
  }
}
