"use client";

import * as d3 from "d3";
import { useEffect, useMemo, useRef } from "react";
import type { NetworkEdge, SystemNode } from "@/types/investigation";

interface AttackGraphProps {
  nodes: SystemNode[];
  edges: NetworkEdge[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
}

const NODE_COLORS: Record<SystemNode["threatLevel"], string> = {
  low: "#38e5b0",
  medium: "#f7b955",
  high: "#ff8b5c",
  critical: "#ff5c7a",
};

const EDGE_COLORS: Record<NetworkEdge["status"], string> = {
  normal: "#2c4f66",
  suspicious: "#f7b955",
  compromised: "#ff5c7a",
};

export function AttackGraph({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
}: AttackGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const graph = useMemo(
    () => ({
      nodes: nodes.map((node) => ({ ...node })),
      links: edges.map((edge) => ({ ...edge })),
    }),
    [nodes, edges],
  );

  useEffect(() => {
    const svgElement = svgRef.current;
    if (!svgElement) return;
    const width = 900;
    const height = 520;
    const svg = d3.select(svgElement);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${height}`);
    svg.append("rect").attr("width", width).attr("height", height).attr("fill", "#080c12");

    const root = svg.append("g");
    svg.call(
      d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.5, 2.5])
        .on("zoom", (event) => root.attr("transform", event.transform.toString())),
    );

    const simulation = d3
      .forceSimulation(graph.nodes as d3.SimulationNodeDatum[])
      .force(
        "link",
        d3
          .forceLink(
            graph.links as unknown as d3.SimulationLinkDatum<d3.SimulationNodeDatum>[],
          )
          .id((d: any) => d.id)
          .distance(120)
          .strength(0.7),
      )
      .force("charge", d3.forceManyBody().strength(-260))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide(28));

    const link = root
      .append("g")
      .selectAll("line")
      .data(graph.links)
      .join("line")
      .attr("stroke", (d) => EDGE_COLORS[d.status])
      .attr("stroke-width", (d) => (d.status === "normal" ? 2 : 3))
      .attr("stroke-dasharray", (d) => (d.status === "normal" ? null : "6 4"));

    const node = root
      .append("g")
      .selectAll("circle")
      .data(graph.nodes)
      .join("circle")
      .attr("r", (d) => (d.id === selectedNodeId ? 19 : 15))
      .attr("fill", "#101a26")
      .attr("stroke", (d) => NODE_COLORS[d.threatLevel])
      .attr("stroke-width", (d) => (d.id === selectedNodeId ? 3 : 2))
      .style("cursor", "pointer")
      .on("click", (_event, d) => onSelectNode(d.id))
      .call(
        d3
          .drag<SVGCircleElement, any>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.2).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }),
      );

    const labels = root
      .append("g")
      .selectAll("text")
      .data(graph.nodes)
      .join("text")
      .text((d) => d.name)
      .attr("fill", "#c9d8e8")
      .attr("font-size", 10)
      .attr("text-anchor", "middle")
      .style("font-family", "monospace")
      .style("pointer-events", "none");

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("cx", (d: any) => d.x).attr("cy", (d: any) => d.y);
      labels.attr("x", (d: any) => d.x).attr("y", (d: any) => d.y + 28);
    });

    return () => simulation.stop();
  }, [graph, onSelectNode, selectedNodeId]);

  return (
    <svg ref={svgRef} className="h-full w-full" />
  );
}
