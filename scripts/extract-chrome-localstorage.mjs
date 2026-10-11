/**
 * Lee gestor_flujos_* desde una copia de Chrome Local Storage leveldb.
 * Uso: node scripts/extract-chrome-localstorage.mjs [ruta-leveldb-copia]
 */
import { ClassicLevel } from "classic-level";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { repairCatalogUnicode, repairCatalogUnicodeDeep } from "./repair-catalog-unicode.mjs";

const dbPath = resolve(process.argv[2] ?? ".tmp-chrome-ls");
const outPath = resolve(
  process.argv[3] ?? "prototipo/data/environments/testing-bootstrap.json",
);

/**
 * @param {Buffer} buf
 */
function utf16LeJson(buf) {
  const evenLen = buf.length - (buf.length % 2);
  return buf.subarray(0, evenLen).toString("utf16le");
}

/**
 * @param {Buffer} buf
 */
function utf16BeJson(buf) {
  const evenLen = buf.length - (buf.length % 2);
  const copy = Buffer.from(buf.subarray(0, evenLen));
  copy.swap16();
  return copy.toString("utf16le");
}

/** @param {Buffer} buf @returns {string[]} */
function decodeCandidates(buf) {
  /** @type {string[]} */
  const candidates = [];
  if (buf.length >= 2 && buf[0] === 0x01 && buf[1] === 0x7b) {
    candidates.push(buf.subarray(1).toString("utf8"));
  }
  if (buf.length >= 2 && buf[0] === 0x7b && buf[1] === 0x00) {
    candidates.push(utf16LeJson(buf));
  }
  if (buf.length >= 2 && buf[0] === 0x00 && buf[1] === 0x7b) {
    candidates.push(utf16BeJson(buf));
    candidates.push(utf16LeJson(buf));
  }
  const stripped = buf.toString("utf8").replace(/\0/g, "").trimStart();
  if (stripped.startsWith("{") || stripped.startsWith("[")) {
    candidates.push(stripped);
  }
  const asUtf8 = buf.toString("utf8").trimStart();
  if (asUtf8.startsWith("{") || asUtf8.startsWith("[")) {
    candidates.push(asUtf8);
  }
  return [...new Set(candidates)];
}

/**
 * Decodifica y normaliza JSON de Chrome Local Storage a UTF-8 legible.
 * @param {Buffer} value
 */
function decodeChromeLocalStorageValue(value) {
  const buf = Buffer.isBuffer(value) ? value : Buffer.from(value);
  /** @type {Error[]} */
  const errors = [];
  for (const candidate of decodeCandidates(buf)) {
    const raw = repairCatalogUnicode(candidate);
    try {
      const parsed = repairCatalogUnicodeDeep(JSON.parse(raw));
      return JSON.stringify(parsed);
    } catch (err) {
      try {
        const stripped = raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
        const parsed = repairCatalogUnicodeDeep(JSON.parse(stripped));
        return JSON.stringify(parsed);
      } catch (err2) {
        errors.push(err2 instanceof Error ? err2 : new Error(String(err2)));
      }
    }
  }
  throw new Error(
    `Valor no reconocido (len=${value.length}, head=${buf.subarray(0, 8).toString("hex")}): ${errors[0]?.message ?? "sin candidatos"}`,
  );
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

const exportedAt = new Date().toISOString();
const bundle = {
  version: 1,
  environment: "testing",
  seedVersion: exportedAt,
  label: "Testing — exportado desde mock local",
  exportedAt,
  origin: "http://127.0.0.1:8765",
  entries,
};

mkdirSync(resolve(outPath, ".."), { recursive: true });
writeFileSync(outPath, JSON.stringify(bundle, null, 2), "utf8");
console.log(`Escrito ${outPath}`);

const legacyPath = resolve("prototipo/data/github-pages-bootstrap.json");
if (legacyPath !== resolve(outPath)) {
  writeFileSync(legacyPath, JSON.stringify(bundle, null, 2), "utf8");
  console.log(`Escrito ${legacyPath} (compat)`);
}
