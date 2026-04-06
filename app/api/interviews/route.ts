import { NextResponse } from "next/server";

import { getDataStore } from "@/lib/datastore/sheetsDataStore";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payload = await getDataStore().getInterviews();
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown interviews failure";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
