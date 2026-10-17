"use client";

import type { EntityRow, FlowTypeRow, MasterDefinitionRow, MasterRecordRow } from "@/lib/supabase/types";
import { useCallback, useEffect, useState } from "react";

export default function MaestrosClient(): React.ReactElement {
  const [flowTypes, setFlowTypes] = useState<FlowTypeRow[]>([]);
  const [entities, setEntities] = useState<EntityRow[]>([]);
  const [definitions, setDefinitions] = useState<MasterDefinitionRow[]>([]);
  const [records, setRecords] = useState<MasterRecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTypeName, setNewTypeName] = useState("");

  const refresh = useCallback(async (): Promise<void> => {
    const [ft, ent, defs, rec] = await Promise.all([
      fetch("/api/flow-types").then((r) => r.json()),
      fetch("/api/entities").then((r) => r.json()),
      fetch("/api/master-definitions").then((r) => r.json()),
      fetch("/api/master-records").then((r) => r.json()),
    ]);
    setFlowTypes(ft.flowTypes ?? []);
    setEntities(ent.entities ?? []);
    setDefinitions(defs.definitions ?? []);
    setRecords(rec.records ?? []);
  }, []);

  useEffect(() => {
    refresh()
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, [refresh]);

  async function addFlowType(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const res = await fetch("/api/flow-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTypeName }),
    });
    if (!res.ok) {
      const json = (await res.json()) as { error?: string };
      setError(json.error ?? "Error");
      return;
    }
    setNewTypeName("");
    await refresh();
  }

  if (loading) {
    return (
      <div className="panel">
        <p className="gestion-empty">Cargando maestros…</p>
      </div>
    );
  }

  return (
    <div className="maestros-layout">
      {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}

      <section className="panel">
        <h2 className="panel-title">Tipos de flujo</h2>
        <form className="form-grid inline-form" onSubmit={addFlowType}>
          <input
            value={newTypeName}
            onChange={(e) => setNewTypeName(e.target.value)}
            placeholder="Nombre del tipo"
            required
          />
          <button type="submit" className="btn btn-primary">
            Agregar
          </button>
        </form>
        <ul className="simple-list">
          {flowTypes.map((ft) => (
            <li key={ft.id}>
              <strong>{ft.name}</strong>
              {ft.description ? <span className="muted"> — {ft.description}</span> : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2 className="panel-title">Entidades ({entities.length})</h2>
        <ul className="simple-list">
          {entities.map((e) => {
            const name = String((e.payload as { name?: string }).name ?? e.id);
            return (
              <li key={e.id}>
                <strong>{name}</strong> <code>{e.id}</code>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="panel">
        <h2 className="panel-title">Definiciones de maestros ({definitions.length})</h2>
        <ul className="simple-list">
          {definitions.map((d) => (
            <li key={d.id}>
              <strong>{d.name}</strong>
              {d.description ? <span className="muted"> — {d.description}</span> : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2 className="panel-title">Registros ({records.length})</h2>
        <p className="gestion-empty">
          ABM detallado de valores: usar export/import o el mock HTML hasta ampliar formularios por entidad.
        </p>
      </section>
    </div>
  );
}
