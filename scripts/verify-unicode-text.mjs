/**
 * Verifica UTF-8 legible en fuentes del mock y datasets versionados.
 * Exit 1 si hay mojibake conocido o U+FFFD.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const MOJIBAKE = /뿯|ï뾽|\uFFFD/;

/** @param {string} dir @param {string[]} acc */
function listJsFiles(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) listJsFiles(p, acc);
    else if (name.endsWith(".js") && name !== "bundle.js") acc.push(p);
  }
  return acc;
}

/** @param {string} dir @param {string[]} acc */
function listJsonFiles(dir, acc = []) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) listJsonFiles(p, acc);
    else if (name.name.endsWith(".json")) acc.push(p);
  }
  return acc;
}

/** @type {{ file: string; reason: string }[]} */
const issues = [];

for (const file of listJsFiles(join(ROOT, "prototipo/js"))) {
  const text = readFileSync(file, "utf8");
  if (/\\x[0-9a-fA-F]{2}/.test(text)) {
    issues.push({ file, reason: "escape \\x en literal (usar UTF-8 directo)" });
  }
  if (/\\u(?!FEFF)[0-9a-fA-F]{4}/.test(text)) {
    issues.push({ file, reason: "escape \\u en literal (usar UTF-8 directo; excepto BOM \\uFEFF)" });
  }
  if (MOJIBAKE.test(text)) {
    issues.push({ file, reason: "mojibake o carácter de reemplazo" });
  }
}

for (const file of listJsonFiles(join(ROOT, "prototipo/data"))) {
  const text = readFileSync(file, "utf8");
  if (MOJIBAKE.test(text)) {
    issues.push({ file, reason: "mojibake o carácter de reemplazo en JSON" });
  }
}

if (issues.length) {
  console.error("verify-unicode-text: falló\n");
  for (const { file, reason } of issues) {
    console.error(`  ${file.replace(ROOT + "\\", "")}: ${reason}`);
  }
  process.exit(1);
}

console.log("verify-unicode-text: OK");
