# Texto Unicode (mock gestor de flujos)

## Regla

Todo **texto visible** y **datos de catálogo** (nombres y `description` de flujos, nodos, tipos de flujo, maestros, pantallas, seeds y bootstrap JSON) debe estar en **UTF-8** con caracteres Unicode **literales** (es-AR: á, é, í, ó, ú, ñ, ¿, ¡, —, →, ·, « »).

## Prohibido

- Secuencias `\uXXXX`, `\xNN` o entidades HTML en **código fuente** y **JSON versionado** (salvo strings generados por herramientas que no editamos a mano).
- Caracter de reemplazo `` o secuencias tipo `뿯` (mojibake por UTF-16 mal decodificado).
- Guardar exportaciones de Chrome sin pasar por `scripts/extract-chrome-localstorage.mjs` (soporta UTF-8, UTF-16 LE y UTF-16 BE).

## Build

`prototipo/build-mock.ps1` usa esbuild con `--charset=utf8` para que `bundle.js` conserve el mismo texto legible.

## Verificación

```powershell
node scripts/verify-unicode-text.mjs
```

Fallo si hay mojibake o `` en `prototipo/js/*.js` (excepto `bundle.js`), `prototipo/data/**/*.json` o entradas del bootstrap testing.

## Tipografía UI (referencia)

| Uso | Carácter |
|-----|----------|
| Sin valor / placeholder | — (U+2014) |
| Separador en listas | · (U+00B7) |
| Flecha en descripciones BPMN | → (U+2192) |
| Comillas españolas | « » |

Preferí importar desde `prototipo/js/unicode-text.js` cuando el mismo símbolo se repite en muchos archivos.
