/**
 * Lee gestor_flujos_* desde una copia de Chrome Local Storage leveldb.
 * Uso: node scripts/extract-chrome-localstorage.mjs [ruta-leveldb-copia]
 */
import { ClassicLevel } from "classic-level";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const dbPath = resolve(process.argv[2] ?? ".tmp-chrome-ls");
const outPath = resolve(process.argv[3] ?? "prototipo/data/github-pages-bootstrap.json");

/** @param {Buffer} value */
function decodeChromeLocalStorageValue(value) {
  let buf = Buffer.isBuffer(value) ? value : Buffer.from(value);
  if (buf[0] === 0x01 && buf[1] === 0x7b) {
    return buf.subarray(1).toString("utf8");
  }
  while (buf.length && buf[0] === 0x00) {
    buf = buf.subarray(1);
  }
  if (buf.length >= 2 && buf[0] === 0x7b && buf[1] === 0x00) {
    return buf.toString("utf16le").replace(/\0/g, "");
  }
  const asUtf8 = buf.toString("utf8").trimStart();
  if (asUtf8.startsWith("{") || asUtf8.startsWith("[")) {
    return asUtf8;
  }
  throw new Error(`Valor no reconocido (len=${value.length}, head=${buf.subarray(0, 8).toString("hex")})`);
}

const db = new ClassicLevel(dbPath, { createIfMissing: false });
/** @type {Record<string, string>} */
const entries = {};

/** @type {Record<string, { origin: string; raw: string }>} */
const best = {};

for await (const [keyBuf, valueBuf] of db.iterator()) {
  const keyStr = keyBuf.toString("utf8");
  const origin = keyStr.includes("127.0.0.1:8765")
    ? "http://127.0.0.1:8765"
    : keyStr.includes("file://")
      ? "file://"
      : "";
  if (!origin) continue;
  for (const storageKey of [
    "gestor_flujos_prototipo_v3",
    "gestor_flujos_auth_users_v1",
    "gestor_flujos_ai_config",
  ]) {
    if (!keyStr.includes(storageKey)) continue;
    const raw = decodeChromeLocalStorageValue(valueBuf);
    JSON.parse(raw);
    const rank = origin === "http://127.0.0.1:8765" ? 2 : 1;
    const prev = best[storageKey];
    if (!prev || rank > (prev.origin === "http://127.0.0.1:8765" ? 2 : 1) || raw.length > prev.raw.length) {
      best[storageKey] = { origin, raw };
    }
  }
}

for (const [storageKey, { origin, raw }] of Object.entries(best)) {
  entries[storageKey] = raw;
  console.log(`OK ${storageKey} from ${origin} (${raw.length} chars)`);
}

await db.close();

if (!entries["gestor_flujos_prototipo_v3"]) {
  console.error("No se encontró gestor_flujos_prototipo_v3 para http://127.0.0.1:8765");
  process.exit(1);
}

const bundle = {
  version: 1,
  exportedAt: new Date().toISOString(),
  origin: "http://127.0.0.1:8765",
  entries,
};

writeFileSync(outPath, JSON.stringify(bundle, null, 2), "utf8");
console.log(`Escrito ${outPath}`);
