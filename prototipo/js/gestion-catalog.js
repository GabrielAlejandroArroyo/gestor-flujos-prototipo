/**
 * Catálogo de flujos listos para instanciación en Gestión (agrupado por tipo).
 */

import { formatFlowVersion } from "./flow-lifecycle.js";

/**
 * @param {object[]} flows
 * @returns {Map<string, object[]>}
 */
export function getReadyFlowsByType(flows) {
  /** @type {Map<string, object[]>} */
  const map = new Map();
  for (const flow of flows ?? []) {
    if (flow.status !== "listo") continue;
    const type = String(flow.type ?? "").trim() || "Sin tipo";
    if (!map.has(type)) map.set(type, []);
    map.get(type).push(flow);
  }
  for (const [, list] of map) {
    list.sort((a, b) => {
      const na = (a.name ?? "").localeCompare(b.name ?? "", "es");
      if (na !== 0) return na;
      return (b.version ?? 0) - (a.version ?? 0);
    });
  }
  return map;
}

/**
 * @param {Map<string, object[]>} byType
 * @returns {string[]}
 */
export function listReadyFlowTypes(byType) {
  return [...byType.keys()].sort((a, b) => a.localeCompare(b, "es"));
}

/**
 * @param {object} flow
 */
export function formatFlowCatalogLabel(flow) {
  return `${flow.name ?? "Flujo"} (${formatFlowVersion(flow)})`;
}
