import { docs_v1, google } from "googleapis";

import type {
  KnowledgeGraphDomainLegend,
  KnowledgeGraphLink,
  KnowledgeGraphNode,
  KnowledgeGraphPayload
} from "@/lib/datastore/types";
import { getDocsAuth } from "@/lib/google/auth";
import { getOrSetCache } from "@/lib/utils/cache";

const GRAPH_CACHE_KEY = "knowledge-graph-doc";
const GRAPH_CACHE_TTL_MS = 60_000;

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getTextFromElements(elements?: docs_v1.Schema$StructuralElement[]) {
  if (!elements) {
    return "";
  }

  const parts: string[] = [];

  for (const element of elements) {
    if (element.paragraph?.elements) {
      for (const paragraphElement of element.paragraph.elements) {
        const text = paragraphElement.textRun?.content ?? "";
        if (text) {
          parts.push(text);
        }
      }
    }

    if (element.table?.tableRows) {
      parts.push(getTextFromTable(element.table));
    }

    if (element.tableOfContents?.content) {
      parts.push(getTextFromElements(element.tableOfContents.content));
    }
  }

  return parts.join("").replace(/\s+/g, " ").trim();
}

function getTextFromTable(table: docs_v1.Schema$Table) {
  return (table.tableRows ?? [])
    .flatMap((row) => row.tableCells ?? [])
    .map((cell) => getTextFromElements(cell.content))
    .join(" ")
    .trim();
}

function getTableRows(table: docs_v1.Schema$Table) {
  return (table.tableRows ?? []).map((row) =>
    (row.tableCells ?? []).map((cell) => getTextFromElements(cell.content))
  );
}

function toNumber(value: string, fallback = 0) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNode(row: Record<string, string>): KnowledgeGraphNode {
  return {
    id: row.id || row.node_id || "",
    label: row.label || "",
    domain: row.domain || "",
    subdomain: row.subdomain || "",
    strength: toNumber(row.strength, 0),
    proficiency: row.proficiency || "",
    description: row.description || "",
    sphereSize: toNumber(row.sphere || row.sphere_size, 1.5),
    colorHex: row.color || row.color_hex || "#d8d0c4"
  };
}

function toLink(row: Record<string, string>): KnowledgeGraphLink {
  return {
    source: row.from_id || row.source || "",
    target: row.to_id || row.target || "",
    relationship: row.relationship || "",
    weight: toNumber(row.weight, 1),
    edgeType: row.edge_type || row.relationship || "related",
    justification: row.justification || ""
  };
}

function toLegend(row: Record<string, string>): KnowledgeGraphDomainLegend {
  return {
    id: row.id || "",
    domain: row.domain || "",
    colorFamily: row.color_family || "",
    positionHint: row.position_hint || "",
    notes: row.notes || ""
  };
}

async function getDocsClient() {
  const auth = getDocsAuth();
  return google.docs({ version: "v1", auth });
}

function rowsToObjects(rows: string[][]) {
  const headerRow = rows[0] ?? [];
  const headers = headerRow.map((cell) => normalizeHeader(cell));

  return rows
    .slice(1)
    .filter((row) => row.some((cell) => cell.trim().length > 0))
    .map((row) =>
      headers.reduce<Record<string, string>>((accumulator, header, index) => {
        accumulator[header] = row[index]?.trim() ?? "";
        return accumulator;
      }, {})
    );
}

function parseGraphTables(tables: string[][][]) {
  const metadata = new Map<string, string>();
  const nodes: KnowledgeGraphNode[] = [];
  const links: KnowledgeGraphLink[] = [];
  const domains: KnowledgeGraphDomainLegend[] = [];

  for (const tableRows of tables) {
    const headers = (tableRows[0] ?? []).map((cell) => normalizeHeader(cell));
    const rows = rowsToObjects(tableRows);

    if (headers.includes("key") && headers.includes("value")) {
      for (const row of rows) {
        if (row.key) {
          metadata.set(row.key, row.value || "");
        }
      }
      continue;
    }

    if (
      headers.includes("id") &&
      headers.includes("label") &&
      headers.includes("domain") &&
      headers.includes("sphere")
    ) {
      nodes.push(...rows.map(toNode).filter((node) => node.id && node.label));
      continue;
    }

    if (headers.includes("from_id") && headers.includes("to_id") && headers.includes("edge_type")) {
      links.push(...rows.map(toLink).filter((link) => link.source && link.target));
      continue;
    }

    if (headers.includes("domain") && headers.includes("color_family") && headers.includes("position_hint")) {
      domains.push(...rows.map(toLegend).filter((domain) => domain.domain));
    }
  }

  const nodeIds = new Set(nodes.map((node) => node.id));
  const filteredLinks = links.filter((link) => nodeIds.has(link.source) && nodeIds.has(link.target));

  return {
    available: nodes.length > 0,
    title: metadata.get("document_name") || "Knowledge Graph",
    lastUpdated: metadata.get("last_updated") || "",
    nodes,
    links: filteredLinks,
    domains,
    message:
      nodes.length > 0
        ? `Loaded ${nodes.length} nodes and ${filteredLinks.length} edges from Google Docs.`
        : "No graph tables found in the configured Google Doc."
  } satisfies KnowledgeGraphPayload;
}

async function readKnowledgeGraphDocument(): Promise<KnowledgeGraphPayload> {
  const documentId = process.env.GOOGLE_DOC_KNOWLEDGE_GRAPH_ID?.trim();

  if (!documentId) {
    return {
      available: false,
      title: "Knowledge Graph",
      lastUpdated: "",
      nodes: [],
      links: [],
      domains: [],
      message: "Set GOOGLE_DOC_KNOWLEDGE_GRAPH_ID to enable the knowledge graph view."
    };
  }

  const docs = await getDocsClient();
  const response = await docs.documents.get({ documentId });
  const content = response.data.body?.content ?? [];
  const tables = content
    .filter((element) => element.table)
    .map((element) => getTableRows(element.table!));

  return parseGraphTables(tables);
}

export async function getKnowledgeGraph(): Promise<KnowledgeGraphPayload> {
  return getOrSetCache(GRAPH_CACHE_KEY, GRAPH_CACHE_TTL_MS, readKnowledgeGraphDocument);
}
