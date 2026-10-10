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

Los datos viven en `localStorage` del navegador (no se sincronizan con Git).

## Alcance

- **Incluido:** diseñador BPMN, estudio Pantalla/Automatización, gestión, reporte, contratos e integraciones mock.
- **Fuera de alcance hasta nuevo pedido:** Next.js, Supabase en este repo, backend productivo.

## Regla platino

Ver [`PLATINO.md`](PLATINO.md): prohibido push, deploy o Supabase en entornos Accusys/AccuOne sin **6 confirmaciones explícitas** previas.

## Desarrollo local

**Mock + Next.js (recomendado):**

```powershell
cd "d:\gestor_flujos supabase"
.\scripts\start-dev.ps1          # primera vez: .\scripts\start-dev.ps1 -Install
```

Detalle: [`scripts/README.md`](scripts/README.md).

**Catálogos del diseñador:** los submenús «Catálogo de flujos» y «Catálogo de actividades» están completos en el **mock** (Pages o `:8765`). En **gestor-app** (`:3000`) el sidebar replica la misma navegación; las pantallas Next son placeholders hasta portar React Flow.

**Solo prototipo (mock):**

```powershell
cd prototipo
.\build-mock.ps1   # tras cambios en js/
.\abrir-mock.ps1   # http://127.0.0.1:8765/index.html
```

**Solo gestor-app (Next.js):**

```powershell
cd gestor-app
npm ci
npm run dev      # http://localhost:3000
```
