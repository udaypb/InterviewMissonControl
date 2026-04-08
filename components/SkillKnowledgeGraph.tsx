"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type {
  KnowledgeGraphDomainLegend,
  KnowledgeGraphLink,
  KnowledgeGraphNode,
  KnowledgeGraphPayload
} from "@/lib/datastore/types";

type GraphNode = KnowledgeGraphNode & { id: string };
type GraphLink = KnowledgeGraphLink & { source: string; target: string };

const EDGE_COLORS: Record<string, string> = {
  prerequisite: "#d67658",
  enables: "#63b07f",
  applies_to: "#6c8fbe",
  related: "#7b7b7b"
};

type ForceGraphInstance = {
  graphData: (data: { nodes: GraphNode[]; links: GraphLink[] }) => ForceGraphInstance;
  nodeVal: (accessor: (node: GraphNode) => number) => ForceGraphInstance;
  nodeColor: (accessor: (node: GraphNode) => string) => ForceGraphInstance;
  nodeLabel: (accessor: (node: GraphNode) => string) => ForceGraphInstance;
  linkWidth: (accessor: (link: GraphLink) => number) => ForceGraphInstance;
  linkColor: (accessor: (link: GraphLink) => string) => ForceGraphInstance;
  linkOpacity: (value: number) => ForceGraphInstance;
  backgroundColor: (color: string) => ForceGraphInstance;
  cooldownTicks: (value: number) => ForceGraphInstance;
  onNodeClick: (handler: (node: GraphNode) => void) => ForceGraphInstance;
  width: (value: number) => ForceGraphInstance;
  height: (value: number) => ForceGraphInstance;
  zoomToFit: (durationMs?: number, paddingPx?: number) => ForceGraphInstance;
  _destructor?: () => void;
};

function getNodeLabel(node: GraphNode) {
  return [
    node.label,
    node.domain ? `Domain: ${node.domain}` : "",
    node.subdomain ? `Subdomain: ${node.subdomain}` : "",
    node.proficiency ? `Proficiency: ${node.proficiency}` : "",
    node.description
  ]
    .filter(Boolean)
    .join("\n");
}

function getFilteredGraphData(
  payload: KnowledgeGraphPayload,
  activeDomains: Set<string>,
  minStrength: number,
  selectedNodeId: string
) {
  const baseNodes = payload.nodes.filter(
    (node) => activeDomains.has(node.domain) && node.strength >= minStrength
  );
  const baseNodeIds = new Set(baseNodes.map((node) => node.id));
  const baseLinks = payload.links.filter(
    (link) => baseNodeIds.has(link.source) && baseNodeIds.has(link.target)
  );

  if (!selectedNodeId) {
    return {
      nodes: baseNodes,
      links: baseLinks
    };
  }

  const neighborIds = new Set<string>([selectedNodeId]);
  for (const link of baseLinks) {
    if (link.source === selectedNodeId) {
      neighborIds.add(link.target);
    }
    if (link.target === selectedNodeId) {
      neighborIds.add(link.source);
    }
  }

  return {
    nodes: baseNodes.filter((node) => neighborIds.has(node.id)),
    links: baseLinks.filter((link) => neighborIds.has(link.source) && neighborIds.has(link.target))
  };
}

export function SkillKnowledgeGraph() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const graphRef = useRef<ForceGraphInstance | null>(null);
  const [payload, setPayload] = useState<KnowledgeGraphPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [minStrength, setMinStrength] = useState(0);
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [activeDomains, setActiveDomains] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/skills/knowledge-graph", { cache: "no-store" });
        const nextPayload = (await response.json()) as KnowledgeGraphPayload;

        if (cancelled) {
          return;
        }

        setPayload(nextPayload);
        setActiveDomains(new Set(nextPayload.domains.map((domain) => domain.domain)));
      } catch (nextError) {
        if (cancelled) {
          return;
        }
        setError(nextError instanceof Error ? nextError.message : "Failed to load knowledge graph.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const domainLegend = useMemo<KnowledgeGraphDomainLegend[]>(() => payload?.domains ?? [], [payload]);
  const visibleDomains = useMemo(
    () => (activeDomains.size > 0 ? activeDomains : new Set(domainLegend.map((domain) => domain.domain))),
    [activeDomains, domainLegend]
  );

  const graphData = useMemo(() => {
    if (!payload) {
      return { nodes: [] as GraphNode[], links: [] as GraphLink[] };
    }

    return getFilteredGraphData(payload, visibleDomains, minStrength, selectedNodeId);
  }, [minStrength, payload, selectedNodeId, visibleDomains]);

  useEffect(() => {
    let cancelled = false;

    async function renderGraph() {
      if (!containerRef.current) {
        return;
      }

      const { default: ForceGraph3D } = await import("3d-force-graph");
      if (cancelled || !containerRef.current) {
        return;
      }

      const width = containerRef.current.clientWidth || 720;
      const height = 560;
      const createGraph = ForceGraph3D as unknown as () => (element: HTMLElement) => ForceGraphInstance;

      if (!graphRef.current) {
        graphRef.current = createGraph()(containerRef.current)
          .backgroundColor("#090909")
          .linkOpacity(0.34)
          .cooldownTicks(120)
          .nodeVal((node) => Math.max(1, node.sphereSize))
          .nodeColor((node) => node.colorHex || "#d8d0c4")
          .nodeLabel((node) => getNodeLabel(node))
          .linkWidth((link) => Math.max(1, link.weight))
          .linkColor((link) => EDGE_COLORS[link.edgeType] || "#7b7b7b")
          .onNodeClick((node) => {
            setSelectedNodeId((current) => (current === node.id ? "" : node.id));
          });
      }

      graphRef.current.width(width).height(height).graphData(graphData);
      if (graphData.nodes.length > 0) {
        graphRef.current.zoomToFit(250, 60);
      }
    }

    void renderGraph();

    function handleResize() {
      if (graphRef.current && containerRef.current) {
        graphRef.current.width(containerRef.current.clientWidth || 720).height(560);
      }
    }

    window.addEventListener("resize", handleResize);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", handleResize);
    };
  }, [graphData]);

  useEffect(() => {
    return () => {
      graphRef.current?._destructor?.();
      graphRef.current = null;
    };
  }, []);

  function toggleDomain(domain: string) {
    setSelectedNodeId("");
    setActiveDomains((current) => {
      const next = new Set(current);
      if (next.has(domain)) {
        next.delete(domain);
      } else {
        next.add(domain);
      }
      return next;
    });
  }

  return (
    <section className="mt-8 rounded-[30px] border border-border/80 bg-[linear-gradient(180deg,rgba(18,18,18,0.92),rgba(8,8,8,0.98))] p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-muted">Knowledge Graph</p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em]">Claude-built concept graph from Google Docs</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            This view reads a shared Google Doc knowledge graph, maps nodes and edges from document tables, and lets
            you filter by domain, strength, and 1-hop neighborhood.
          </p>
        </div>
        <div className="rounded-[22px] border border-border/80 bg-black/10 px-4 py-3 text-sm text-muted">
          {payload?.available
            ? `${graphData.nodes.length} visible nodes · ${graphData.links.length} visible edges`
            : payload?.message || "Knowledge graph not configured"}
        </div>
      </div>

      {loading ? (
        <div className="mt-6 rounded-[24px] border border-dashed border-border bg-black/10 p-5 text-sm text-muted">
          Loading knowledge graph…
        </div>
      ) : null}

      {error ? (
        <div className="mt-6 rounded-[22px] border border-[#a35f53]/40 bg-[#241513] px-4 py-3 text-sm text-[#efb7a9]">
          {error}
        </div>
      ) : null}

      {!loading && !error && !payload?.available ? (
        <div className="mt-6 rounded-[24px] border border-dashed border-border bg-black/10 p-5">
          <p className="text-sm text-text">Knowledge graph unavailable.</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            {payload?.message || "Share the Google Doc with the service account and set GOOGLE_DOC_KNOWLEDGE_GRAPH_ID."}
          </p>
        </div>
      ) : null}

      {!loading && !error && payload?.available ? (
        <div className="mt-6 grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-[24px] border border-border/80 bg-black/10 p-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Document</p>
              <p className="mt-2 text-base font-medium text-text">{payload.title}</p>
              <p className="mt-2 text-sm text-muted">
                {payload.lastUpdated ? `Updated ${payload.lastUpdated}` : payload.message}
              </p>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Strength Threshold</p>
                <span className="text-sm text-text">{minStrength}+</span>
              </div>
              <input
                type="range"
                min={0}
                max={5}
                step={1}
                value={minStrength}
                onChange={(event) => {
                  setSelectedNodeId("");
                  setMinStrength(Number(event.target.value));
                }}
                className="mt-3 w-full"
              />
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Domains</p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedNodeId("");
                    setActiveDomains(new Set(domainLegend.map((domain) => domain.domain)));
                  }}
                  className="text-xs text-muted underline-offset-4 hover:underline"
                >
                  Reset
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {domainLegend.map((domain) => {
                  const checked = visibleDomains.has(domain.domain);
                  return (
                    <label
                      key={domain.id || domain.domain}
                      className="flex items-start gap-3 rounded-[18px] border border-border/80 bg-black/10 px-3 py-3"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleDomain(domain.domain)}
                        className="mt-1 h-4 w-4 rounded border-border bg-transparent"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-text">{domain.domain}</span>
                        <span className="mt-1 block text-xs uppercase tracking-[0.18em] text-muted">
                          {domain.positionHint || domain.colorFamily}
                        </span>
                        <span className="mt-2 block text-sm leading-6 text-muted">{domain.notes}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {selectedNodeId ? (
              <div className="mt-6 rounded-[18px] border border-[#6f8dbe]/30 bg-[#121a27] px-3 py-3 text-sm text-[#cadbff]">
                1-hop view active. Click the selected node again to clear.
              </div>
            ) : null}
          </aside>

          <div className="rounded-[24px] border border-border/80 bg-[#090909] p-3">
            <div ref={containerRef} className="h-[560px] w-full overflow-hidden rounded-[18px]" />
            <div className="mt-3 flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-muted">
              <span className="rounded-full border border-border/70 px-3 py-1">Prerequisite: red</span>
              <span className="rounded-full border border-border/70 px-3 py-1">Enables: green</span>
              <span className="rounded-full border border-border/70 px-3 py-1">Applies To: blue</span>
              <span className="rounded-full border border-border/70 px-3 py-1">Related: grey</span>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
