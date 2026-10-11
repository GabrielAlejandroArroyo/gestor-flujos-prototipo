# Gestor de flujos — prototipo (mock)

Repositorio **personal privado**. La app usable está en [`prototipo/`](prototipo/).

| Qué | Dónde |
|-----|--------|
| Mock HTML vigente | [`prototipo/index.html`](prototipo/index.html) |
| Documentación | [`prototipo/documentacion.md`](prototipo/documentacion.md) |
| Bitácora | [`prototipo/bitacora.md`](prototipo/bitacora.md) |
| Snapshots congelados | [`prototipo/versiones/`](prototipo/versiones/) |
| Regenerar JS | [`prototipo/build-mock.ps1`](prototipo/build-mock.ps1) |

## Despliegue (tu GitHub, no Accusys)

| | |
|--|--|
| **App** | https://gabrielalejandroarroyo.github.io/gestor-flujos-prototipo/ |
| **Repo** | https://github.com/GabrielAlejandroArroyo/gestor-flujos-prototipo |

Instrucciones completas solo para vos: **[DESPLIEGUE.md](DESPLIEGUE.md)**.

Los datos viven en `localStorage` del navegador (no se sincronizan con Git). **Local** (`127.0.0.1`) y **Pages** (`github.io`) son orígenes distintos: no comparten datos.

## Scripts rápidos

Desde la **raíz del repo** (PowerShell):

| Objetivo | Comando |
|----------|---------|
| **Mock local** (servidor en `:8765`) | `.\scripts\mock-local.ps1` |
| Mock local + regenerar `bundle.js` | `.\scripts\mock-local.ps1 -Build` |
| **Publicar en GitHub Pages** | `.\scripts\mock-publish-github.ps1 -Message "feat(mock): descripción"` |
| Simular publish (sin commit ni push) | `.\scripts\mock-publish-github.ps1 -Message "..." -DryRun` |
| Mock + Next.js (gestor-app) | `.\scripts\start-dev.ps1` (ver [`scripts/README.md`](scripts/README.md)) |

Tras publicar: esperá el workflow **Deploy GitHub Pages** en verde (~20 s) y recargá la URL con **Ctrl+F5**. Detalle y fallos: **[DESPLIEGUE.md](DESPLIEGUE.md)**.

## Alcance

- **Incluido:** diseñador BPMN, estudio Pantalla/Automatización, gestión, reporte, contratos e integraciones mock.
- **Fuera de alcance hasta nuevo pedido:** Next.js, Supabase en este repo, backend productivo.

## Regla platino

Ver [`PLATINO.md`](PLATINO.md): prohibido push, deploy o Supabase en entornos Accusys/AccuOne sin **6 confirmaciones explícitas** previas.

## Desarrollo local

**Recomendado — solo mock:**

```powershell
cd "d:\gestor_flujos supabase"
.\scripts\mock-local.ps1 -Build
```

**Mock + Next.js:**

```powershell
.\scripts\start-dev.ps1          # primera vez: .\scripts\start-dev.ps1 -Install
```

Detalle de flags y requisitos: [`scripts/README.md`](scripts/README.md).

**Catálogos del diseñador:** crear, editar y versionar flujos solo en el **mock** (Pages o `http://127.0.0.1:8765/index.html`). En **gestor-app** (`:3000`) el menú es igual pero las pantallas son placeholders hasta portar React Flow.

**Alternativa manual (prototipo):** `prototipo\build-mock.ps1` y `prototipo\abrir-mock.ps1`.

**Solo gestor-app (Next.js):**

```powershell
cd gestor-app
npm ci
npm run dev      # http://localhost:3000
```
