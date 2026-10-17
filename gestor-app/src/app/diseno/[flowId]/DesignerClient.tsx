"use client";

import DesignerFlowCanvas from "@/components/flows/DesignerFlowCanvas";
import type { MockFlowDefinition } from "@/lib/db/flow-mapper";
import { flowStatusLabel } from "@/lib/flow-lifecycle";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export default function DesignerClient({ flowId }: { flowId: string }): React.ReactElement {
  const [flow, setFlow] = useState<MockFlowDefinition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    const res = await fetch(`/api/flows/${flowId}`);
    const json = (await res.json()) as { flow?: MockFlowDefinition; error?: string };
    if (!res.ok) throw new Error(json.error ?? "No se pudo cargar");
    setFlow(json.flow ?? null);
    setDirty(false);
  }, [flowId]);

  useEffect(() => {
    load().catch((e: unknown) => setError(e instanceof Error ? e.message : "Error"));
  }, [load]);

  async function save(next?: MockFlowDefinition): Promise<void> {
    const payload = next ?? flow;
    if (!payload) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/flows/${flowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { flow?: MockFlowDefinition; error?: string };
      if (!res.ok) throw new Error(json.error ?? "No se pudo guardar");
      setFlow(json.flow ?? payload);
      setDirty(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  if (!flow) {
    return (
      <section className="panel">
        <p className="gestion-empty">{error ?? "Cargando diseñador…"}</p>
      </section>
    );
  }

  return (
    <section className="panel designer-panel">
      <div className="catalog-header">
        <div>
          <Link href="/" className="designer-back">
            ← Catálogo
          </Link>
          <h2 className="panel-title">{flow.name}</h2>
          <p className="designer-meta">
            {flowStatusLabel(flow.status)} · {flow.type}
          </p>
        </div>
        <div className="catalog-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={!dirty || saving || flow.status !== "borrador"}
            onClick={() => save()}
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
      {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}
      <DesignerFlowCanvas
        flow={flow}
        onFlowChange={(updated) => {
          setFlow(updated as MockFlowDefinition);
          setDirty(true);
        }}
      />
    </section>
  );
}
