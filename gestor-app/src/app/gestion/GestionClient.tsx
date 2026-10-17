"use client";

import { getCurrentNode, statusLabel } from "@/lib/engine/core";
import type { FlowDefinition, FlowInstance } from "@/lib/engine/flow-types";
import { NODE_KINDS } from "@/lib/engine/flow-types";
import { useCallback, useEffect, useMemo, useState } from "react";

type GestionTab = "en_curso" | "completada" | "cerrada_rechazo";

const TABS: { id: GestionTab; label: string }[] = [
  { id: "en_curso", label: "En curso" },
  { id: "completada", label: "Completadas" },
  { id: "cerrada_rechazo", label: "Cerradas por rechazo" },
];

export default function GestionClient(): React.ReactElement {
  const [flows, setFlows] = useState<FlowDefinition[]>([]);
  const [instancesByTab, setInstancesByTab] = useState<Record<GestionTab, FlowInstance[]>>({
    en_curso: [],
    completada: [],
    cerrada_rechazo: [],
  });
  const [tab, setTab] = useState<GestionTab>("en_curso");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flowId, setFlowId] = useState<string>("");
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const instances = instancesByTab[tab];
  const selectedFlow = flows.find((f) => f.id === flowId) ?? flows[0] ?? null;
  const selectedInstance = instances.find((i) => i.id === selectedId) ?? null;
  const currentNode = selectedInstance ? getCurrentNode(selectedInstance) : null;

  const counts = useMemo(
    () => ({
      en_curso: instancesByTab.en_curso.length,
      completada: instancesByTab.completada.length,
      cerrada_rechazo: instancesByTab.cerrada_rechazo.length,
    }),
    [instancesByTab],
  );

  const refresh = useCallback(async (): Promise<void> => {
    setError(null);
    const [flowsRes, enCursoRes, compRes, cerrRes] = await Promise.all([
      fetch("/api/flows?readyOnly=1"),
      fetch("/api/instances?status=en_curso"),
      fetch("/api/instances?status=completada"),
      fetch("/api/instances?status=cerrada_rechazo"),
    ]);
    const flowsJson = (await flowsRes.json()) as { flows?: FlowDefinition[]; error?: string };
    const enJson = (await enCursoRes.json()) as { instances?: FlowInstance[] };
    const compJson = (await compRes.json()) as { instances?: FlowInstance[] };
    const cerrJson = (await cerrRes.json()) as { instances?: FlowInstance[] };

    if (!flowsRes.ok) throw new Error(flowsJson.error ?? "Error cargando flujos");

    setFlows(flowsJson.flows ?? []);
    setInstancesByTab({
      en_curso: enJson.instances ?? [],
      completada: compJson.instances ?? [],
      cerrada_rechazo: cerrJson.instances ?? [],
    });
    if (!flowId && flowsJson.flows?.[0]) setFlowId(flowsJson.flows[0].id);
  }, [flowId]);

  useEffect(() => {
    refresh()
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    if (tab !== "en_curso") setSelectedId(null);
  }, [tab]);

  async function handleStart(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!selectedFlow) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/engine/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flowId: selectedFlow.id, inputValues }),
      });
      const json = (await res.json()) as { instance?: FlowInstance; error?: string };
      if (!res.ok) throw new Error(json.error ?? "No se pudo iniciar");
      if (json.instance) {
        setSelectedId(json.instance.id);
        setTab("en_curso");
      }
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function handleResolve(payload: Record<string, unknown>): Promise<void> {
    if (!selectedInstance) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/engine/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceId: selectedInstance.id, ...payload }),
      });
      const json = (await res.json()) as { instance?: FlowInstance; error?: string };
      if (!res.ok) throw new Error(json.error ?? "No se pudo resolver");
      if (json.instance?.status !== "en_curso") setSelectedId(null);
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="panel">
        <p className="gestion-empty">Cargando motor de ejecución…</p>
      </div>
    );
  }

  return (
    <div className="gestion-layout">
      <section className="panel">
        <h2 className="panel-title">Instanciar flujo</h2>
        {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}
        {flows.length === 0 ? (
          <p className="gestion-empty">No hay flujos listos.</p>
        ) : (
          <form className="form-grid" onSubmit={handleStart}>
            <div className="form-row">
              <label>Flujo</label>
              <select
                value={flowId || selectedFlow?.id || ""}
                onChange={(e) => setFlowId(e.target.value)}
                required
              >
                {flows.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            {selectedFlow?.inputParams.map((p) => (
              <div className="form-row" key={p.id}>
                <label>{p.label}</label>
                <input
                  name={p.key}
                  required={p.required}
                  value={inputValues[p.key] ?? ""}
                  onChange={(e) =>
                    setInputValues((prev) => ({ ...prev, [p.key]: e.target.value }))
                  }
                />
              </div>
            ))}
            <button type="submit" className="btn btn-primary" data-testid="gestion-start" disabled={busy}>
              Iniciar instancia
            </button>
          </form>
        )}

        <div className="gestion-hub-tabs" role="tablist" aria-label="Estado de instancias">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`gestion-tab ${tab === t.id ? "is-active" : ""}`}
              data-testid={`gestion-tab-${t.id}`}
              onClick={() => setTab(t.id)}
            >
              {t.label} ({counts[t.id]})
            </button>
          ))}
        </div>

        <div className="card-grid">
          {instances.map((inst) => {
            const node = tab === "en_curso" ? getCurrentNode(inst) : null;
            return (
              <article
                key={inst.id}
                className={`panel instance-card ${selectedId === inst.id ? "is-selected" : ""}`}
                onClick={() => tab === "en_curso" && setSelectedId(inst.id)}
                onKeyDown={(e) => e.key === "Enter" && tab === "en_curso" && setSelectedId(inst.id)}
                role={tab === "en_curso" ? "button" : undefined}
                tabIndex={tab === "en_curso" ? 0 : undefined}
              >
                <strong>{inst.flowName}</strong>
                <div className="instance-card__meta">{inst.startedAt}</div>
                {tab === "en_curso" ? (
                  <div className="instance-card__step">Pendiente: {node?.name ?? "—"}</div>
                ) : (
                  <div className="instance-card__step">
                    <span className={`badge badge-${inst.status === "completada" ? "completada" : "rechazada"}`}>
                      {statusLabel(inst.status)}
                    </span>
                  </div>
                )}
              </article>
            );
          })}
          {instances.length === 0 ? (
            <p className="gestion-empty">Sin instancias en esta pestaña.</p>
          ) : null}
        </div>
      </section>

      <section className="panel resolver-panel">
        <h2 className="panel-title">Resolver actividad</h2>
        {tab !== "en_curso" ? (
          <p className="gestion-empty">Seleccioná la pestaña En curso para resolver tareas.</p>
        ) : !selectedInstance ? (
          <p className="gestion-empty">Seleccioná una instancia en curso.</p>
        ) : !currentNode ? (
          <p>
            Instancia finalizada:{" "}
            <span className="badge badge-completada">{statusLabel(selectedInstance.status)}</span>
          </p>
        ) : currentNode.kind === NODE_KINDS.AUTOMATICA ? (
          <>
            <p>
              <strong>{currentNode.name}</strong> (Service Task)
            </p>
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={() => handleResolve({ kind: "automatica" })}
            >
              Ejecutar y continuar
            </button>
          </>
        ) : currentNode.kind === NODE_KINDS.AGENTE_IA ? (
          <>
            <p>
              <strong>{currentNode.name}</strong> (Agente IA · HITL)
            </p>
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={() =>
                handleResolve({
                  kind: "agente_ia",
                  resolutionData: { status: "approved" },
                })
              }
            >
              Simular respuesta recibida
            </button>
          </>
        ) : currentNode.kind === NODE_KINDS.MANUAL ? (
          <>
            <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
              {currentNode.description ?? "User Task"}
            </p>
            <div className="preview-actions">
              <button
                type="button"
                className="btn btn-success"
                disabled={busy}
                onClick={() =>
                  handleResolve({
                    kind: "manual",
                    decision: "aceptar",
                    comment: "Aprobado desde gestión",
                  })
                }
              >
                Aceptar
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={busy}
                onClick={() =>
                  handleResolve({
                    kind: "manual",
                    decision: "rechazar",
                    comment: "Rechazado desde gestión",
                  })
                }
              >
                Rechazar
              </button>
            </div>
          </>
        ) : (
          <p>Nodo no resoluble: {currentNode.name}</p>
        )}
      </section>
    </div>
  );
}
