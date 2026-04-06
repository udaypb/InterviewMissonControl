import { NextResponse } from "next/server";

import { getDataStore } from "@/lib/datastore/sheetsDataStore";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const payload = await getDataStore().syncFromCalendar();
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync failure";
    return NextResponse.json(
      {
        status: "error",
        message
      },
      { status: 200 }
    );
  }
}
