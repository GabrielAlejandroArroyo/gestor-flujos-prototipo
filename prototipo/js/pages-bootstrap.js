/**
 * Aplica datos embebidos en el repo al abrir GitHub Pages (sincroniza local → Pages vía Git).
 */
import {
  applyPortableStorageBundle,
  parsePortableImportFile,
} from "./state-portability.js";

const PAGES_SEED_APPLIED_KEY = "gestor_flujos_pages_seed_applied";
const BOOTSTRAP_URL = "data/github-pages-bootstrap.json";

/**
 * @returns {boolean}
 */
function isGitHubPagesHost() {
  const host = location.hostname.toLowerCase();
  return host.endsWith(".github.io") || host === "github.io";
}

/**
 * @returns {Promise<boolean>} true si se aplicó un seed nuevo
 */
export async function maybeApplyGitHubPagesBootstrap() {
  if (!isGitHubPagesHost()) return false;

  const params = new URLSearchParams(location.search);
  const force = params.get("bootstrap") === "1" || params.get("seed") === "pages";

  let res;
  try {
    res = await fetch(BOOTSTRAP_URL, { cache: "no-store" });
  } catch {
    return false;
  }
  if (!res.ok) return false;

  let parsedJson;
  try {
    parsedJson = await res.json();
  } catch {
    return false;
  }

  const seedId = String(parsedJson.exportedAt ?? parsedJson.version ?? "0");
  const already = localStorage.getItem(PAGES_SEED_APPLIED_KEY);
  if (!force && already === seedId) return false;

  const check = parsePortableImportFile(parsedJson);
  if (!check.ok) {
    console.warn("[mock] Bootstrap Pages inválido:", check.message);
    return false;
  }

  applyPortableStorageBundle(check.bundle);
  localStorage.setItem(PAGES_SEED_APPLIED_KEY, seedId);
  console.info(`[mock] Datos de Pages aplicados desde ${BOOTSTRAP_URL} (${seedId})`);
  return true;
}
