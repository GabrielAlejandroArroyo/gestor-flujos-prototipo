# Scripts de desarrollo y publicación

Ejecutá todo desde la **raíz del repo** salvo que se indique otra carpeta.

## Mock local — `mock-local.ps1`

Sirve la carpeta `prototipo/` en **http://127.0.0.1:8765/index.html** (mismo contenido que GitHub Pages, datos distintos en `localStorage`).

```powershell
.\scripts\mock-local.ps1
.\scripts\mock-local.ps1 -Build
.\scripts\mock-local.ps1 -Port 8888 -NoBrowser
```

| Parámetro | Uso |
|-----------|-----|
| `-Build` | Ejecuta `prototipo/build-mock.ps1` antes de servir (obligatorio tras cambiar `prototipo/js/`). |
| `-Port` | Puerto HTTP (default `8765`). |
| `-NoBrowser` | No abre el navegador automáticamente. |

**Requisitos:** Python 3 (`python` o `py -3`). Para `-Build`: Node.js (esbuild vía `npx` en `build-mock.ps1`).

**Detener:** Ctrl+C en la terminal.

---

## Publicar GitHub Pages — `mock-publish-github.ps1`

Build del mock, commit **solo de `prototipo/`**, confirmación interactiva y **push a `main`**. Dispara el workflow [`.github/workflows/deploy-pages.yml`](../.github/workflows/deploy-pages.yml).

**URL publicada:** https://gabrielalejandroarroyo.github.io/gestor-flujos-prototipo/

```powershell
.\scripts\mock-publish-github.ps1 -Message "feat(mock): importador ABM maestros"
.\scripts\mock-publish-github.ps1 -Message "fix(mock): nav maestros" -DryRun
.\scripts\mock-publish-github.ps1 -Message "chore(mock): bump cache" -SkipBuild
```

| Parámetro | Uso |
|-----------|-----|
| `-Message` | **Obligatorio.** Mensaje del commit (convención `tipo(mock): ...`). |
| `-DryRun` | Muestra qué haría; no commit ni push. |
| `-SkipBuild` | No ejecuta `build-mock.ps1` (usá si ya regeneraste el bundle). |

**Preflight:**

- Remote `origin` debe contener `GabrielAlejandroArroyo/gestor-flujos-prototipo` (regla platino).
- Rama actual: `main`.
- Antes del push pregunta: `Push a origin main? (s/N)`.

**Requisitos:** Git. Para build: Node.js. Opcional: [GitHub CLI](https://cli.github.com/) (`gh`) para ver el último run de Actions.

Si el commit falla por un hook, corregí y volvé a ejecutar el script (no usa `--no-verify`).

Guía extendida: [DESPLIEGUE.md](../DESPLIEGUE.md).

---

## Mock + Next.js — `start-dev.ps1`

Levanta el mock en segundo plano y Next.js en la misma terminal.

```powershell
.\scripts\start-dev.ps1
.\scripts\start-dev.ps1 -Install -BuildMock
.\scripts\start-dev.ps1 -SoloMock
```

| Flag | Uso |
|------|-----|
| `-BuildMock` | Ejecuta `prototipo/build-mock.ps1` antes de servir. |
| `-Install` | `npm ci` en `gestor-app/`. |
| `-SoloMock` | Solo `:8765` (equivalente a `mock-local.ps1` sin `-Build`). |

| Servicio | URL |
|----------|-----|
| Prototipo (mock) | http://127.0.0.1:8765/index.html |
| gestor-app | http://localhost:3000 |

**Detener:** Ctrl+C (Next + mock en background).

---

## Texto Unicode (catálogos y bootstrap)

Regla del proyecto: [`prototipo/docs/unicode-text.md`](../prototipo/docs/unicode-text.md).

```powershell
node scripts/verify-unicode-text.mjs
node scripts/repair-testing-bootstrap.mjs   # repara mojibake en JSON testing
.\scripts\sync-local-to-pages.ps1             # extrae Chrome + repara al exportar
```

Tras cambiar `prototipo/js/`, `build-mock.ps1` usa esbuild `--charset=utf8`.

---

## Resumen

| Necesidad | Script |
|-----------|--------|
| Probar el mock en tu PC | `mock-local.ps1` |
| Subir cambios del mock a Pages | `mock-publish-github.ps1` |
| Mock + motor Next local | `start-dev.ps1` |
| Validar UTF-8 en mock/datos | `node scripts/verify-unicode-text.mjs` |
