"use client";

import { useState } from "react";

export default function DatosClient(): React.ReactElement {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function importTesting(): Promise<void> {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/data/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ useTestingBootstrap: true }),
      });
      const json = (await res.json()) as { error?: string; counts?: Record<string, number> };
      if (!res.ok) throw new Error(json.error ?? "Import fallido");
      setMessage(`Import OK: ${JSON.stringify(json.counts ?? {})}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function exportData(): Promise<void> {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/data/export");
      const json = await res.json();
      if (!res.ok) throw new Error((json as { error?: string }).error ?? "Export fallido");
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gestor-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage("Export descargado (formato compatible con mock).");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <h2 className="panel-title">Export / Import</h2>
      <p>Importá el bootstrap de testing o exportá el estado actual al formato del mock.</p>
      {message ? <p style={{ color: "var(--success)" }}>{message}</p> : null}
      {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}
      <div className="preview-actions">
        <button type="button" className="btn btn-primary" disabled={busy} onClick={importTesting}>
          Importar testing-bootstrap
        </button>
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={exportData}>
          Exportar JSON
        </button>
      </div>
    </section>
  );
}
