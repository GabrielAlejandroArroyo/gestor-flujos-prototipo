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

```powershell
cd prototipo
.\build-mock.ps1   # tras cambios en js/
.\abrir-mock.ps1   # o abrir index.html
```
