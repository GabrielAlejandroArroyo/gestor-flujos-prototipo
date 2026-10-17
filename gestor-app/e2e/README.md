# E2E Playwright — casos de uso

Recorre la app **como el usuario**: menú, login, catálogo, canvas, gestión, maestros, datos e integración. Cada test graba **video** y la página `/e2e` los muestra con la perspectiva de cada persona.

## Correr

Desde `gestor-app/`:

```powershell
npx playwright install chromium
npm run test:e2e

# Si el download de Chromium falla (proxy/TLS), usá Chrome del sistema (default):
# E2E_BROWSER_CHANNEL=chrome
```

Desde la raíz del repo:

```powershell
.\scripts\gestor.ps1 e2e
```

| Script | Qué hace |
|--------|----------|
| `npm run test:e2e` | Headless + videos → `public/e2e-replays/` |
| `npm run test:e2e:headed` | Con ventana |
| `npm run test:e2e:ui` | UI de Playwright |

## Ver los casos

Con la app levantada: **http://localhost:3000/e2e** (menú «Casos de uso»).

Los videos se copian al terminar la corrida (`e2e/reporters/use-case-videos.ts`).

Playwright usa `http://localhost:3000` (no `127.0.0.1`) para que Next hidrate el JS. En `next.config.ts` está `allowedDevOrigins`.

## Catálogo

Fuente única: [`src/lib/e2e/use-cases.ts`](../src/lib/e2e/use-cases.ts). El título de cada test **debe** empezar con el id (`UC-LOGIN-OK — ...`).
