# Gestor de flujos — prototipo (mock)

Repositorio **personal privado**. La app usable está en [`prototipo/`](prototipo/).

| Qué | Dónde |
|-----|--------|
| Mock HTML vigente | [`prototipo/index.html`](prototipo/index.html) |
| Documentación | [`prototipo/documentacion.md`](prototipo/documentacion.md) |
| Bitácora | [`prototipo/bitacora.md`](prototipo/bitacora.md) |
| Snapshots congelados | [`prototipo/versiones/`](prototipo/versiones/) |
| Regenerar JS | [`prototipo/build-mock.ps1`](prototipo/build-mock.ps1) |

## GitHub Pages

Tras el primer push a `main`:

1. En GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Esperá que el workflow [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) termine en verde.
3. URL del mock (sitio público, repo privado):  
   **https://gabriel.github.io/gestor-flujos-prototipo/**

Los datos viven en `localStorage` del navegador (no se sincronizan con Git).

## Alcance

- **Incluido:** diseñador BPMN, estudio Pantalla/Automatización, gestión, reporte, contratos e integraciones mock.
- **Fuera de alcance hasta nuevo pedido:** Next.js, Supabase en este repo, backend productivo.

## Regla platino

Ver [`PLATINO.md`](PLATINO.md): prohibido push, deploy o Supabase en entornos Accusys/AccuOne sin **6 confirmaciones explícitas** previas.

## Desarrollo local

```powershell
cd prototipo
.\build-mock.ps1   # tras cambios en js/
.\abrir-mock.ps1   # o abrir index.html
```
