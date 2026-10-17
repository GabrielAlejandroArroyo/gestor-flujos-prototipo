"use client";

import { NODE_KINDS, type FlowDefinition, type FlowNode } from "@/lib/engine/flow-types";
import { isFlowEditable } from "@/lib/flow-lifecycle";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
  type OnNodeDrag,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo } from "react";

interface DesignerFlowCanvasProps {
  flow: FlowDefinition;
  onFlowChange?: (flow: FlowDefinition) => void;
}

function nodeLabel(node: FlowNode): string {
  return node.name || node.id;
}

function buildGraph(flow: FlowDefinition): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = (flow.nodes ?? []).map((n) => ({
    id: n.id,
    position: { x: n.x ?? 0, y: n.y ?? 0 },
    data: { label: nodeLabel(n), kind: n.kind },
    draggable: isFlowEditable(flow),
    className: `rf-node rf-node--${n.kind}`,
  }));

  const edges: Edge[] = (flow.transitions ?? [])
    .filter((t) => (t.lineType ?? "sequence") === "sequence")
    .map((t) => ({
      id: t.id,
      source: t.fromId,
      target: t.toId,
      label: t.condition === "siempre" ? undefined : t.condition,
      animated: t.condition === "siempre",
    }));

  return { nodes, edges };
}

export default function DesignerFlowCanvas({
  flow,
  onFlowChange,
}: DesignerFlowCanvasProps): React.ReactElement {
  const initial = useMemo(() => buildGraph(flow), [flow]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);

  useEffect(() => {
    const g = buildGraph(flow);
    setNodes(g.nodes);
    setEdges(g.edges);
  }, [flow, setNodes, setEdges]);

  const onNodeDragStop: OnNodeDrag<Node> = useCallback(
    (_event, node) => {
      if (!onFlowChange || !isFlowEditable(flow)) return;
      const updatedNodes = flow.nodes.map((n) =>
        n.id === node.id ? { ...n, x: node.position.x, y: node.position.y } : n,
      );
      onFlowChange({ ...flow, nodes: updatedNodes });
    },
    [flow, onFlowChange],
  );

  const readOnly = !isFlowEditable(flow);

  return (
    <div className="designer-canvas" style={{ width: "100%", height: "min(70vh, 720px)" }}>
      {readOnly ? (
        <p className="designer-readonly-hint">
          {flow.status === "deprecado"
            ? "Versión deprecada — solo lectura."
            : "Flujo listo — usá Versionar en el catálogo para editar."}
        </p>
      ) : null}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        fitView
        nodesDraggable={!readOnly}
        nodesConnectable={false}
        elementsSelectable
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} color="var(--border)" />
        <MiniMap pannable zoomable />
        <Controls />
      </ReactFlow>
      <p className="designer-legend">
        Tipos: {Object.values(NODE_KINDS).join(" · ")}
      </p>
    </div>
  );
}
