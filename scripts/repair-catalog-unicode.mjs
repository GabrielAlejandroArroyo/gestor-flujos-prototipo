/**
 * Repara mojibake típico en strings de catálogo (export Chrome mal decodificado).
 * @param {string} text
 */
export function repairCatalogUnicode(text) {
  if (typeof text !== "string" || !text) return text;
  let s = text;
  s = s.replace(/\u0014\u2020/g, "—");
  s = s.replace(/\u0014/g, "—");
  s = s.replace(/뿯↽/g, "→");
  s = s.replace(/ï뾽℠/g, "→");
  s = s.replace(/ï뾽/g, "·");
  s = s.replace(/뿯½/g, "·");
  s = s.replace(/Aprobaci(?:뿯½|ï뾽)n/g, "Aprobación");
  s = s.replace(/T(?:뿯½|ï뾽)tulo/g, "Título");
  s = s.replace(/Revisi(?:뿯½|ï뾽)n/g, "Revisión");
  s = s.replace(/revisi(?:뿯½|ï뾽)n/g, "revisión");
  s = s.replace(/(?:뿯½|ï뾽)Aprobado\?/g, "¿Aprobado?");
  s = s.replace(/User Task \u2014/g, "User Task —");
  s = s.replace(/User Task †/g, "User Task —");
  s = s.replace(/Instancia iniciada †/g, "Instancia iniciada —");
  s = s.replace(/Start ï뾽℠/g, "Start → ");
  s = s.replace(/Start 뿯↽ /g, "Start → ");
  s = s.replace(/\uFFFD/g, "");
  s = s.replace(/D\uFFFDaz/g, "Díaz");
  s = s.replace(/Sof\uFFFDa/g, "Sofía");
  s = s.replace(/gen\uFFFDrico/g, "genérico");
  s = s.replace(/migraci\uFFFDn/g, "migración");
  return s;
}

/** @param {unknown} value */
export function repairCatalogUnicodeDeep(value) {
  if (typeof value === "string") return repairCatalogUnicode(value);
  if (Array.isArray(value)) return value.map(repairCatalogUnicodeDeep);
  if (value && typeof value === "object") {
    /** @type {Record<string, unknown>} */
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = repairCatalogUnicodeDeep(v);
    }
    return out;
  }
  return value;
}
