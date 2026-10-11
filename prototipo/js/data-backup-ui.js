/**
 * UI — respaldo e importación de datos (local ↔ GitHub Pages).
 */

import {
  applyPortableStorageBundle,
  downloadPortableStorageBundle,
  exportPortableStorageBundle,
  parsePortableImportFile,
  PORTABLE_STORAGE_KEYS,
} from "./state-portability.js";
import { escapeHtml, renderPageHeader, toast } from "./ui.js";

/**
 * @param {HTMLElement} mainEl
 * @param {{ onImported: () => void }} opts
 */
export function renderDataBackupPage(mainEl, opts) {
  const preview = exportPortableStorageBundle();
  const keyCount = Object.keys(preview.entries).length;
  const hasState = !!(
    preview.entries["gestor_flujos_prototipo_v3"] ||
    preview.entries["gestor_flujos_prototipo_v2"]
  );

  mainEl.innerHTML = `
    <section class="panel panel--catalog data-backup-panel">
      ${renderPageHeader(
        "Datos del mock",
        "Exportá lo guardado en este navegador y restauralo en otro origen (local ↔ GitHub Pages). La sesión no se exporta: volvé a iniciar sesión tras importar.",
      )}
      <div class="entity-meta-panel">
        <h3 class="entity-meta-title">En este navegador</h3>
        <p class="form-hint">Origen: <code>${escapeHtml(location.origin)}</code></p>
        <p class="catalog-tree-count">${keyCount} bloque(s) de datos · ${hasState ? "incluye flujos/maestros" : "sin estado principal"}</p>
        <ul class="form-hint data-backup-keys">
          ${PORTABLE_STORAGE_KEYS.map((k) => `<li><code>${escapeHtml(k)}</code></li>`).join("")}
        </ul>
      </div>
      <div class="data-backup-actions">
        <button type="button" class="btn btn-primary" id="btn-export-portable-data">Descargar respaldo (.json)</button>
      </div>
      <div class="entity-meta-panel data-backup-import-panel">
        <h3 class="entity-meta-title">Importar respaldo</h3>
        <p class="form-hint">Reemplaza los datos del mock en <strong>este</strong> sitio (ej. pegar lo exportado desde local en Pages).</p>
        <input type="file" id="field-portable-import" accept=".json,application/json" />
        <label class="entity-check-label data-backup-merge-opt">
          <input type="checkbox" id="field-portable-merge" />
          Fusionar (no reemplazar usuarios/IA si ya existen)
        </label>
        <p class="form-hint data-backup-warn">Tras importar se recarga la aplicación. Hacé respaldo antes si no estás seguro.</p>
      </div>
    </section>`;

  mainEl.querySelector("#btn-export-portable-data")?.addEventListener("click", () => {
    const bundle = exportPortableStorageBundle();
    if (!Object.keys(bundle.entries).length) {
      toast("No hay datos para exportar en este navegador.");
      return;
    }
    downloadPortableStorageBundle(bundle);
    toast("Respaldo descargado.", 2500, "success");
  });

  mainEl.querySelector("#field-portable-import")?.addEventListener("change", (e) => {
    const input = e.target;
    if (!(input instanceof HTMLInputElement) || !input.files?.[0]) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result ?? ""));
        const check = parsePortableImportFile(parsed);
        if (!check.ok) {
          toast(check.message);
          return;
        }
        const merge = !!mainEl.querySelector("#field-portable-merge")?.checked;
        if (
          !merge &&
          !window.confirm(
            "¿Reemplazar los datos del mock en este sitio con el respaldo? Esta acción no se puede deshacer sin otro respaldo.",
          )
        ) {
          return;
        }
        const result = applyPortableStorageBundle(check.bundle, { merge });
        toast(
          `Importado: ${result.applied.join(", ") || "—"}. Recargando…`,
          2800,
          "success",
        );
        input.value = "";
        window.setTimeout(() => opts.onImported(), 400);
      } catch {
        toast("No se pudo leer el JSON del respaldo.");
      }
    };
    reader.readAsText(file, "utf-8");
  });
}
