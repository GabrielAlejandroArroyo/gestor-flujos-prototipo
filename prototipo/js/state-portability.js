/**
 * Exportar / importar datos del mock (localStorage) para mover entre local y GitHub Pages.
 */

export const STATE_PORTABILITY_VERSION = 1;

/** @type {readonly string[]} */
export const PORTABLE_STORAGE_KEYS = [
  "gestor_flujos_prototipo_v3",
  "gestor_flujos_auth_users_v1",
  "gestor_flujos_ai_config",
];

/**
 * @returns {{ version: number; exportedAt: string; origin: string; entries: Record<string, string> }}
 */
export function exportPortableStorageBundle() {
  /** @type {Record<string, string>} */
  const entries = {};
  for (const key of PORTABLE_STORAGE_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw != null && raw !== "") {
      entries[key] = raw;
    }
  }
  const legacy = localStorage.getItem("gestor_flujos_prototipo_v2");
  if (legacy && !entries["gestor_flujos_prototipo_v3"]) {
    entries["gestor_flujos_prototipo_v2"] = legacy;
  }
  return {
    version: STATE_PORTABILITY_VERSION,
    exportedAt: new Date().toISOString(),
    origin: typeof location !== "undefined" ? location.origin : "",
    entries,
  };
}

/**
 * @param {unknown} parsed
 * @returns {{ ok: true; bundle: ReturnType<typeof exportPortableStorageBundle> } | { ok: false; message: string }}
 */
export function parsePortableImportFile(parsed) {
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, message: "El archivo no es un JSON válido de respaldo." };
  }
  const obj = parsed;
  const entries = obj.entries;
  if (!entries || typeof entries !== "object") {
    return { ok: false, message: "Falta el objeto «entries» con los datos del mock." };
  }
  let count = 0;
  for (const key of Object.keys(entries)) {
    if (typeof entries[key] !== "string") {
      return { ok: false, message: `Entrada inválida para la clave «${key}».` };
    }
    count += 1;
  }
  if (count === 0) {
    return { ok: false, message: "El respaldo no contiene datos." };
  }
  if (!entries["gestor_flujos_prototipo_v3"] && !entries["gestor_flujos_prototipo_v2"]) {
    return { ok: false, message: "El respaldo no incluye el estado del gestor (v3 o v2)." };
  }
  return {
    ok: true,
    bundle: {
      version: typeof obj.version === "number" ? obj.version : STATE_PORTABILITY_VERSION,
      exportedAt: String(obj.exportedAt ?? ""),
      origin: String(obj.origin ?? ""),
      entries,
    },
  };
}

/**
 * @param {ReturnType<typeof exportPortableStorageBundle>} bundle
 * @param {{ merge?: boolean }} [opts]
 * @returns {{ applied: string[]; skipped: string[] }}
 */
export function applyPortableStorageBundle(bundle, opts = {}) {
  const merge = opts.merge === true;
  /** @type {string[]} */
  const applied = [];
  /** @type {string[]} */
  const skipped = [];
  for (const [key, value] of Object.entries(bundle.entries ?? {})) {
    if (typeof value !== "string") continue;
    if (merge && localStorage.getItem(key) && key !== "gestor_flujos_prototipo_v3") {
      skipped.push(key);
      continue;
    }
    localStorage.setItem(key, value);
    applied.push(key);
  }
  return { applied, skipped };
}

/**
 * @param {ReturnType<typeof exportPortableStorageBundle>} bundle
 */
export function downloadPortableStorageBundle(bundle) {
  const json = JSON.stringify(bundle, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const a = document.createElement("a");
  a.href = url;
  a.download = `gestor-flujos-respaldo-${stamp}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
