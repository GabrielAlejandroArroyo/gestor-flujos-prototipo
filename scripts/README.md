# Scripts de desarrollo local

## Levantar mock + Next.js

Desde la **raíz del repo**:

```powershell
cd "d:\gestor_flujos supabase"
.\scripts\start-dev.ps1
```

Levanta el mock en segundo plano y **Next.js en la misma terminal** (logs de `npm run dev`). Abre el navegador en:

| Servicio | URL |
|----------|-----|
| Prototipo (mock) | http://127.0.0.1:8765/index.html |
| gestor-app | http://localhost:3000 |
| Gestión (API) | http://localhost:3000/gestion |

En el **mock** (`:8765`), bajo «Diseñador de flujo», están «Catálogo de flujos» y «Catálogo de actividades». En **Next** el sidebar tiene la misma estructura; el listado completo sigue en el mock hasta portar el diseñador.

### Flags

| Flag | Uso |
|------|-----|
| `-BuildMock` | Ejecuta `prototipo/build-mock.ps1` antes de servir (tras cambios en `prototipo/js/`). |
| `-Install` | Ejecuta `npm ci` en `gestor-app/` (primera vez o tras cambiar dependencias). |
| `-SoloMock` | Solo el prototipo en `:8765` (sin Next). Usalo si solo queres el mock. |

Ejemplo:

```powershell
.\scripts\start-dev.ps1 -Install -BuildMock
```

### Requisitos

- Python 3 (`python` o `py -3` en PATH)
- Node.js LTS y `npm`
- Primera vez en `gestor-app`: `.\scripts\start-dev.ps1 -Install`

### Detener

**Ctrl+C** en la terminal donde corriste el script: cierra Next.js y el servidor mock del puerto 8765.

### Nota

Esto **no** reemplaza GitHub Pages. La URL pública del mock sigue siendo la de [DESPLIEGUE.md](../DESPLIEGUE.md).

Alternativas manuales:

- Solo mock: `prototipo/abrir-mock.ps1`
- Solo Next: `cd gestor-app; npm run dev`
