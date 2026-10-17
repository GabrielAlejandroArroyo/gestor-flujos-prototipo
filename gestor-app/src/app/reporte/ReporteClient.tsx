"use client";

import type { MasterAuditRow } from "@/lib/supabase/types";
import { useEffect, useState } from "react";

export default function ReporteClient(): React.ReactElement {
  const [audit, setAudit] = useState<MasterAuditRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/master-audit?limit=100")
      .then((r) => r.json())
      .then((json: { audit?: MasterAuditRow[]; error?: string }) => {
        if (json.error) throw new Error(json.error);
        setAudit(json.audit ?? []);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Error"));
  }, []);

  return (
    <section className="panel">
      <h2 className="panel-title">Auditoría de maestros</h2>
      {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}
      <div className="catalog-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Usuario</th>
              <th>Área</th>
              <th>Acción</th>
              <th>Detalle</th>
            </tr>
          </thead>
          <tbody>
            {audit.map((row) => (
              <tr key={row.id}>
                <td>{row.at}</td>
                <td>{row.user_label ?? row.user_id ?? "—"}</td>
                <td>{row.area}</td>
                <td>{row.action}</td>
                <td>{row.detail ?? row.label ?? "—"}</td>
              </tr>
            ))}
            {audit.length === 0 ? (
              <tr>
                <td colSpan={5} className="gestion-empty">
                  Sin eventos. Importá datos de testing o operá maestros.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
