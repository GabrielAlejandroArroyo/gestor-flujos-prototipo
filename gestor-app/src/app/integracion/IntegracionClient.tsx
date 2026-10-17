"use client";

import { useEffect, useState } from "react";

interface HealthPayload {
  status: string;
  service: string;
  version: string;
  supabaseConfigured: boolean;
  publicUrl: string | null;
  timestamp: string;
}

const API_GROUPS = [
  {
    title: "Motor",
    endpoints: [
      { method: "POST", path: "/api/engine/start", note: "Iniciar instancia de flujo" },
      { method: "POST", path: "/api/engine/resolve", note: "Resolver actividad manual/automática/IA" },
      { method: "GET", path: "/api/instances?status=en_curso", note: "Listar instancias" },
    ],
  },
  {
    title: "Flujos",
    endpoints: [
      { method: "GET", path: "/api/flows?q=&status=&flowTypeId=", note: "Catálogo con filtros" },
      { method: "POST", path: "/api/flows", note: "Crear borrador" },
      { method: "PATCH", path: "/api/flows/{id}", note: "Actualizar definición (borrador)" },
      { method: "POST", path: "/api/flows/{id}/activate", note: "Publicar borrador → listo" },
      { method: "POST", path: "/api/flows/{id}/version", note: "Versionar flujo listo" },
    ],
  },
  {
    title: "Maestros y datos",
    endpoints: [
      { method: "GET", path: "/api/flow-types", note: "Tipos de flujo" },
      { method: "GET", path: "/api/entities", note: "Entidades" },
      { method: "GET", path: "/api/master-definitions", note: "Definiciones ABM" },
      { method: "GET", path: "/api/master-records", note: "Registros" },
      { method: "GET", path: "/api/master-audit", note: "Auditoría" },
      { method: "GET", path: "/api/data/export", note: "Export JSON (formato mock)" },
      { method: "POST", path: "/api/data/import", note: "Import bootstrap / JSON" },
    ],
  },
  {
    title: "Sesión",
    endpoints: [
      { method: "POST", path: "/api/auth/login", note: "Body: username, password" },
      { method: "POST", path: "/api/auth/logout", note: "Cerrar sesión" },
      { method: "GET", path: "/api/auth/session", note: "Usuario actual" },
    ],
  },
] as const;

export default function IntegracionClient(): React.ReactElement {
  const [baseUrl, setBaseUrl] = useState("");
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  useEffect(() => {
    const origin = window.location.origin;
    setBaseUrl(origin);
    fetch(`${origin}/api/health`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<HealthPayload>;
      })
      .then(setHealth)
      .catch((e: unknown) =>
        setHealthError(e instanceof Error ? e.message : "No se pudo contactar /api/health"),
      );
  }, []);

  return (
    <div className="integracion-layout">
      <section className="panel">
        <h2 className="panel-title">Estado del servicio</h2>
        <p>
          Base URL para integraciones: <code>{baseUrl || "…"}</code>
        </p>
        {healthError ? <p style={{ color: "var(--danger)" }}>{healthError}</p> : null}
        {health ? (
          <ul className="simple-list">
            <li>
              <strong>Health:</strong> {health.status} · v{health.version}
            </li>
            <li>
              <strong>Supabase:</strong>{" "}
              {health.supabaseConfigured ? "configurado (persistencia)" : "no configurado (memoria volátil)"}
            </li>
            <li>
              <strong>Último check:</strong> {health.timestamp}
            </li>
          </ul>
        ) : null}
        <p className="gestion-empty">
          Probe: <code>GET {baseUrl}/api/health</code>
        </p>
      </section>

      <section className="panel">
        <h2 className="panel-title">API REST</h2>
        <p>Todas las rutas son relativas a la base URL. Content-Type JSON en POST/PATCH.</p>
        {API_GROUPS.map((group) => (
          <div key={group.title} className="integracion-group">
            <h3>{group.title}</h3>
            <div className="catalog-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Método</th>
                    <th>Ruta</th>
                    <th>Uso</th>
                  </tr>
                </thead>
                <tbody>
                  {group.endpoints.map((ep) => (
                    <tr key={ep.path}>
                      <td>
                        <code>{ep.method}</code>
                      </td>
                      <td>
                        <code>{ep.path}</code>
                      </td>
                      <td>{ep.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </section>

      <section className="panel">
        <h2 className="panel-title">Ejemplo rápido (curl)</h2>
        <pre className="integracion-pre">{`curl -s "${baseUrl || "http://localhost:3000"}/api/health" | jq .

curl -s "${baseUrl || "http://localhost:3000"}/api/flows?readyOnly=1"

curl -s -X POST "${baseUrl || "http://localhost:3000"}/api/auth/login" \\
  -H "Content-Type: application/json" \\
  -d '{"username":"luna","password":"1234"}'`}</pre>
      </section>

      <section className="panel">
        <h2 className="panel-title">Despliegue</h2>
        <ul className="simple-list">
          <li>
            <strong>Docker:</strong> <code>docker compose up -d --build</code> (ver <code>DEPLOY.md</code>)
          </li>
          <li>
            <strong>Vercel:</strong> root <code>gestor-app</code>, variables en <code>.env.example</code>
          </li>
          <li>
            <strong>Esquema DB:</strong> <code>npx supabase db push</code> en <code>gestor-app/</code>
          </li>
        </ul>
      </section>
    </div>
  );
}
