"use client";

import { getCurrentNode, statusLabel } from "@/lib/engine/core";
import type { FlowDefinition, FlowInstance } from "@/lib/engine/flow-types";
import { NODE_KINDS } from "@/lib/engine/flow-types";
import { useCallback, useEffect, useState } from "react";

export default function GestionClient(): React.ReactElement {
  const [flows, setFlows] = useState<FlowDefinition[]>([]);
  const [instances, setInstances] = useState<FlowInstance[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flowId, setFlowId] = useState<string>("");
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selectedFlow = flows.find((f) => f.id === flowId) ?? flows[0] ?? null;
  const selectedInstance = instances.find((i) => i.id === selectedId) ?? null;
  const currentNode = selectedInstance ? getCurrentNode(selectedInstance) : null;

  const refresh = useCallback(async (): Promise<void> => {
    setError(null);
    const [flowsRes, instRes] = await Promise.all([
      fetch("/api/flows"),
      fetch("/api/instances?status=en_curso"),
    ]);
    const flowsJson = (await flowsRes.json()) as { flows?: FlowDefinition[]; error?: string };
    const instJson = (await instRes.json()) as { instances?: FlowInstance[]; error?: string };

    if (!flowsRes.ok) throw new Error(flowsJson.error ?? "Error cargando flujos");
    if (!instRes.ok) throw new Error(instJson.error ?? "Error cargando instancias");

    setFlows(flowsJson.flows ?? []);
    setInstances(instJson.instances ?? []);
    if (!flowId && flowsJson.flows?.[0]) setFlowId(flowsJson.flows[0].id);
  }, [flowId]);

  useEffect(() => {
    refresh()
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, [refresh]);

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
      if (json.instance) setSelectedId(json.instance.id);
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function handleResolve(
    payload: Record<string, unknown>,
  ): Promise<void> {
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
            <button type="submit" className="btn btn-primary" disabled={busy}>
              Iniciar instancia
            </button>
          </form>
        )}

        <h3 className="panel-title" style={{ marginTop: "1.25rem" }}>
          En curso ({instances.length})
        </h3>
        <div className="card-grid">
          {instances.map((inst) => {
            const node = getCurrentNode(inst);
            return (
              <article
                key={inst.id}
                className={`panel instance-card ${selectedId === inst.id ? "is-selected" : ""}`}
                onClick={() => setSelectedId(inst.id)}
                onKeyDown={(e) => e.key === "Enter" && setSelectedId(inst.id)}
                role="button"
                tabIndex={0}
              >
                <strong>{inst.flowName}</strong>
                <div className="instance-card__meta">{inst.startedAt}</div>
                <div className="instance-card__step">
                  Pendiente: {node?.name ?? "—"}
                </div>
              </article>
            );
          })}
          {instances.length === 0 ? (
            <p className="gestion-empty">Sin instancias activas.</p>
          ) : null}
        </div>
      </section>

      <section className="panel resolver-panel">
        <h2 className="panel-title">Resolver actividad</h2>
        {!selectedInstance ? (
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
