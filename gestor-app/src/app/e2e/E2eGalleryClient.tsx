"use client";

import { USE_CASES, groupUseCasesByPersona, type UseCaseDefinition } from "@/lib/e2e/use-cases";
import { useEffect, useMemo, useState } from "react";

interface UseCaseRun {
  status: string;
  durationMs: number;
  video: string | null;
  screenshot: string | null;
  error: string | null;
}

type UseCaseWithRun = UseCaseDefinition & { run: UseCaseRun | null };

function statusLabel(run: UseCaseRun | null): { text: string; className: string } {
  if (!run) return { text: "Sin ejecutar", className: "e2e-badge e2e-badge--pending" };
  if (run.status === "passed") return { text: "Pasó", className: "e2e-badge e2e-badge--ok" };
  if (run.status === "failed" || run.status === "timedOut") {
    return { text: "Falló", className: "e2e-badge e2e-badge--fail" };
  }
  return { text: run.status, className: "e2e-badge e2e-badge--pending" };
}

export default function E2eGalleryClient(): React.ReactElement {
  const [runs, setRuns] = useState<Record<string, UseCaseRun>>({});
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/e2e-replays/index.json", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) return;
        const json = (await r.json()) as { generatedAt?: string; runs?: Record<string, UseCaseRun> };
        setGeneratedAt(json.generatedAt ?? null);
        setRuns(json.runs ?? {});
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Error"));
  }, []);

  const items: UseCaseWithRun[] = USE_CASES.map((uc) => ({
    ...uc,
    run: runs[uc.id] ?? null,
  }));

  const groups = useMemo(() => {
    const q = filter.trim().toLocaleLowerCase("es");
    const filtered = q
      ? items.filter((uc) =>
          `${uc.id} ${uc.title} ${uc.perspective} ${uc.personaLabel}`.toLocaleLowerCase("es").includes(q),
        )
      : items;
    const byPersona = groupUseCasesByPersona();
    return byPersona
      .map((g) => ({
        ...g,
        items: filtered.filter((uc) => uc.persona === g.persona),
      }))
      .filter((g) => g.items.length > 0);
  }, [items, filter]);

  const passed = items.filter((i) => i.run?.status === "passed").length;
  const failed = items.filter((i) => i.run?.status === "failed" || i.run?.status === "timedOut").length;
  const withVideo = items.filter((i) => i.run?.video).length;

  return (
    <div className="e2e-gallery">
      <header className="e2e-hero">
        <p className="e2e-kicker">Perspectiva de usuario</p>
        <h1 className="page-title">Casos de uso E2E</h1>
        <p>
          Cada tarjeta es un recorrido real grabado con Playwright. El video muestra lo que ve el
          usuario: menú, formularios, canvas y mensajes del sistema.
        </p>
        <p data-testid="e2e-count" className="e2e-meta">
          {items.length} casos · {passed} ok · {failed} fallidos · {withVideo} con video
          {generatedAt ? ` · última corrida ${generatedAt}` : " · todavía no hay corrida"}
        </p>
        <p className="gestion-empty">
          Para generar o actualizar videos: <code>npm run test:e2e</code> en <code>gestor-app/</code> o{" "}
          <code>.\scripts\gestor.ps1 e2e</code>
        </p>
        <input
          className="e2e-search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filtrar por persona, id o texto…"
          aria-label="Filtrar casos de uso"
        />
      </header>

      {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}

      {groups.map((group) => (
        <section key={group.persona} className="e2e-persona">
          <h2 className="panel-title">{group.label}</h2>
          <div className="e2e-grid">
            {group.items.map((uc) => {
              const badge = statusLabel(uc.run);
              return (
                <article key={uc.id} className="panel e2e-card" data-testid={`uc-card-${uc.id}`}>
                  <div className="e2e-card__head">
                    <code>{uc.id}</code>
                    <span className={badge.className}>{badge.text}</span>
                  </div>
                  <h3>{uc.title}</h3>
                  <blockquote className="e2e-quote">«{uc.perspective}»</blockquote>
                  <ol className="e2e-steps">
                    {uc.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                  <p className="e2e-expected">
                    <strong>Esperado:</strong> {uc.expected}
                  </p>
                  {uc.run?.video ? (
                    <video className="e2e-video" controls playsInline src={uc.run.video} poster={uc.run.screenshot ?? undefined}>
                      Tu navegador no reproduce video.
                    </video>
                  ) : uc.run?.screenshot ? (
                    <img className="e2e-video" src={uc.run.screenshot} alt={`Captura ${uc.id}`} />
                  ) : (
                    <div className="e2e-video e2e-video--empty">
                      {uc.route.startsWith("/api/")
                        ? "Caso de API: no hay recorrido visual."
                        : "Todavía no hay video. Corré npm run test:e2e."}
                    </div>
                  )}
                  {uc.run?.error ? (
                    <p className="e2e-error">{uc.run.error}</p>
                  ) : null}
                  <p className="e2e-foot">
                    Ruta <code>{uc.route}</code> · spec <code>{uc.spec}</code>
                    {uc.run?.durationMs != null ? ` · ${Math.round(uc.run.durationMs / 100) / 10}s` : ""}
                  </p>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
