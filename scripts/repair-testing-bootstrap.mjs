/**
 * Repara UTF-8 en entradas del bootstrap testing (in-place).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { repairCatalogUnicode, repairCatalogUnicodeDeep } from "./repair-catalog-unicode.mjs";

const paths = [
  resolve("prototipo/data/environments/testing-bootstrap.json"),
  resolve("prototipo/data/github-pages-bootstrap.json"),
];

for (const path of paths) {
  const bundle = JSON.parse(readFileSync(path, "utf8"));
  bundle.label = repairCatalogUnicode(bundle.label ?? "");
  for (const [key, raw] of Object.entries(bundle.entries ?? {})) {
    if (typeof raw !== "string") continue;
    try {
      const parsed = repairCatalogUnicodeDeep(JSON.parse(raw));
      bundle.entries[key] = JSON.stringify(parsed);
    } catch {
      bundle.entries[key] = repairCatalogUnicode(raw);
    }
  }
  writeFileSync(path, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
  console.log(`Reparado ${path}`);
}
