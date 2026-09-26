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

Repo: **https://github.com/GabrielAlejandroArroyo/gestor-flujos-prototipo** (privado).

### GitHub Pages

1. **Settings → Pages → Source: GitHub Actions** (ver [prototipo/DEPLOY-PAGES.md](prototipo/DEPLOY-PAGES.md)).
2. En plan **Free**, Pages en repo **privado** suele requerir **GitHub Pro** o hacer el repo **público**.
3. URL cuando Pages esté activo:  
   **https://gabrielalejandroarroyo.github.io/gestor-flujos-prototipo/**

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
