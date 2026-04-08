import { NextResponse } from "next/server";

import { getKnowledgeGraph } from "@/lib/google/knowledgeGraph";
import { hasRequiredGoogleConfig } from "@/lib/utils/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasRequiredGoogleConfig()) {
    return NextResponse.json({
      available: false,
      title: "Knowledge Graph",
      lastUpdated: "",
      nodes: [],
      links: [],
      domains: [],
      message: "Google configuration is missing."
    });
  }

  try {
    return NextResponse.json(await getKnowledgeGraph());
  } catch (error) {
    return NextResponse.json({
      available: false,
      title: "Knowledge Graph",
      lastUpdated: "",
      nodes: [],
      links: [],
      domains: [],
      message: error instanceof Error ? error.message : "Failed to load the knowledge graph document."
    });
  }
}
