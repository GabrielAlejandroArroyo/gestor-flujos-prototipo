"use client";

import { flowStatusLabel, sortFlowsForCatalog } from "@/lib/flow-lifecycle";
import type { MockFlowDefinition } from "@/lib/db/flow-mapper";
import type { FlowTypeRow } from "@/lib/supabase/types";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function FlowCatalogClient(): React.ReactElement {
  const [flows, setFlows] = useState<MockFlowDefinition[]>([]);
  const [flowTypes, setFlowTypes] = useState<FlowTypeRow[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [flowTypeId, setFlowTypeId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    setError(null);
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (status) params.set("status", status);
    if (flowTypeId) params.set("flowTypeId", flowTypeId);
    const [flowsRes, typesRes] = await Promise.all([
      fetch(`/api/flows?${params.toString()}`),
      fetch("/api/flow-types"),
    ]);
    const flowsJson = (await flowsRes.json()) as { flows?: MockFlowDefinition[]; error?: string };
    const typesJson = (await typesRes.json()) as { flowTypes?: FlowTypeRow[] };
    if (!flowsRes.ok) throw new Error(flowsJson.error ?? "Error cargando flujos");
    setFlows(sortFlowsForCatalog(flowsJson.flows ?? []));
    setFlowTypes(typesJson.flowTypes ?? []);
  }, [q, status, flowTypeId]);

  useEffect(() => {
    refresh()
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, [refresh]);

  const typeNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const ft of flowTypes) map.set(ft.id, ft.name);
    return map;
  }, [flowTypes]);

  async function handleVersion(flowId: string): Promise<void> {
    setBusyId(flowId);
    try {
      const res = await fetch(`/api/flows/${flowId}/version`, { method: "POST" });
      const json = (await res.json()) as { flow?: MockFlowDefinition; error?: string };
      if (!res.ok) throw new Error(json.error ?? "No se pudo versionar");
      await refresh();
      if (json.flow?.id) window.location.href = `/diseno/${json.flow.id}`;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusyId(null);
    }
  }

  async function handleActivate(flowId: string): Promise<void> {
    setBusyId(flowId);
    try {
      const res = await fetch(`/api/flows/${flowId}/activate`, { method: "POST" });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "No se pudo confirmar");
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreate(): Promise<void> {
    setBusyId("new");
    try {
      const res = await fetch("/api/flows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Nuevo flujo", type: "General" }),
      });
      const json = (await res.json()) as { flow?: MockFlowDefinition; error?: string };
      if (!res.ok) throw new Error(json.error ?? "No se pudo crear");
      if (json.flow?.id) window.location.href = `/diseno/${json.flow.id}`;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <section className="panel panel--catalog">
        <p className="gestion-empty">Cargando catálogo…</p>
      </section>
    );
  }

  return (
    <section className="panel panel--catalog">
      <div className="catalog-header">
        <h2 className="panel-title">Catálogo de flujos</h2>
        <button type="button" className="btn btn-primary" disabled={busyId === "new"} onClick={handleCreate}>
          Nuevo borrador
        </button>
      </div>

      {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}

      <div className="catalog-filters form-grid">
        <div className="form-row">
          <label>Buscar</label>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre o tipo" />
        </div>
        <div className="form-row">
          <label>Estado</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos</option>
            <option value="borrador">Borrador</option>
            <option value="listo">Listo</option>
            <option value="deprecado">Deprecado</option>
          </select>
        </div>
        <div className="form-row">
          <label>Tipo de flujo</label>
          <select value={flowTypeId} onChange={(e) => setFlowTypeId(e.target.value)}>
            <option value="">Todos</option>
            {flowTypes.map((ft) => (
              <option key={ft.id} value={ft.id}>
                {ft.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="catalog-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th>Versión</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {flows.map((flow) => (
              <tr key={flow.id}>
                <td>
                  <Link href={`/diseno/${flow.id}`}>{flow.name}</Link>
                </td>
                <td>{typeNameById.get(flow.flowTypeId ?? "") ?? flow.type}</td>
                <td>
                  <span className={`badge badge-${flow.status}`}>{flowStatusLabel(flow.status)}</span>
                </td>
                <td>{flow.status === "borrador" ? "—" : `v${flow.version ?? 1}`}</td>
                <td className="catalog-actions">
                  <Link className="btn btn-ghost btn-sm" href={`/diseno/${flow.id}`}>
                    Abrir
                  </Link>
                  {flow.status === "listo" ? (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={busyId === flow.id}
                      onClick={() => handleVersion(flow.id)}
                    >
                      Versionar
                    </button>
                  ) : null}
                  {flow.status === "borrador" ? (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={busyId === flow.id}
                      onClick={() => handleActivate(flow.id)}
                    >
                      Confirmar
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
            {flows.length === 0 ? (
              <tr>
                <td colSpan={5} className="gestion-empty">
                  Sin flujos. Importá datos de testing o creá un borrador.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
