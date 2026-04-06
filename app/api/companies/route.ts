import { NextResponse } from "next/server";

import { getDataStore } from "@/lib/datastore/sheetsDataStore";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payload = await getDataStore().getCompanies();
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown companies failure";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
