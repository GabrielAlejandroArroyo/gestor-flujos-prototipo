# Despliegue — Gestor App (producción)

Aplicación **Next.js 16** con API REST y persistencia en **Supabase** (proyecto propio). No usar AccuOne ni remotes de la org ([`../PLATINO.md`](../PLATINO.md)).

| Entorno | URL típica |
|---------|------------|
| Local (Node) | http://localhost:3000 |
| Local (Docker) | http://localhost:3000 (puerto `HOST_PORT` en `.env`) |
| Integración / health | http://localhost:3000/integracion · http://localhost:3000/api/health |
| Vercel | `https://<tu-proyecto>.vercel.app` (la genera Vercel al importar el repo) |

---

## 1. Requisitos

- Node.js 20+ (22 recomendado) **o** Docker 24+
- Proyecto Supabase con migraciones aplicadas desde `gestor-app/supabase/migrations/`

### Base de datos

```powershell
cd gestor-app
npx supabase link --project-ref <TU_REF_DESA>
npx supabase db push
```

Regenerar tipos si cambiás el esquema:

```powershell
npx supabase gen types typescript --linked > src/lib/supabase/types.ts
```

---

## 2. Variables de entorno

Copiá la plantilla y completá credenciales:

```powershell
cd gestor-app
copy .env.example .env
```

| Variable | Obligatoria en prod | Descripción |
|----------|-------------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Sí | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sí | Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Recomendada | Escritura segura desde API Routes |
| `APP_PUBLIC_URL` | Recomendada | URL pública (Docker / Vercel) |
| `HOST_PORT` | Solo Docker | Puerto en el host (default `3000`) |

Sin Supabase la app arranca pero usa **memoria volátil** (no apto para producción).

---

## 3. Scripts (desde la raíz del repo)

Recomendado — incluye guardia platino (no AccuOne/Accusys):

```powershell
cd "d:\gestor_flujos supabase"
.\scripts\gestor.ps1 help
.\scripts\gestor.ps1 env-init
.\scripts\gestor.ps1 docker-up
.\scripts\gestor.ps1 docker-seed    # opcional, con Supabase en .env
.\scripts\gestor.ps1 vercel         # preview en cuenta personal
```

## 4. Docker (manual)

Desde `gestor-app/`:

```powershell
copy .env.example .env
# Editar .env con Supabase

docker compose up -d --build
```

Comandos útiles:

```powershell
docker compose ps
docker compose logs -f app
docker compose down
```

**Carga inicial de datos** (opcional, con Supabase en `.env`):

```powershell
docker compose --profile seed run --rm seed
```

Imagen local: `gestor-flujos-app:latest`.

Build manual:

```powershell
docker build -t gestor-flujos-app:latest .
docker run --rm -p 3000:3000 --env-file .env gestor-flujos-app:latest
```

Health check del contenedor: `GET /api/health`.

---

## 5. Node.js (sin Docker)

```powershell
cd gestor-app
npm ci
npm run build
npm run start
```

Desarrollo:

```powershell
npm run dev
```

Scripts npm:

| Script | Acción |
|--------|--------|
| `npm run docker:up` | `docker compose up -d --build` |
| `npm run docker:down` | `docker compose down` |
| `npm run import:testing` | Import CLI → Supabase (requiere env) |

---

## 6. Vercel

1. [New Project](https://vercel.com/new) → repo `gestor-flujos-prototipo`.
2. **Root Directory:** `gestor-app`.
3. Variables de entorno: las mismas que `.env.example`.
4. Deploy.

`vercel.json` ya define `installCommand` y `buildCommand`.

---

## 7. Datos iniciales

Tras el primer deploy:

- **UI:** http://localhost:3000/datos → «Importar testing-bootstrap»
- **API:** `POST /api/data/import` con `{ "useTestingBootstrap": true }`
- **CLI:** `npm run import:testing`

Usuario de prueba (tras import): `luna` / `1234`.

---

## 8. Integración con otros sistemas

- Documentación viva en la app: **`/integracion`**
- Contrato: REST JSON bajo `/api/*`
- Autenticación actual: cookie de sesión tras `POST /api/auth/login` (usuarios en tabla `app_users`)

---

## 9. CI

Workflow [`.github/workflows/build-gestor-app.yml`](../.github/workflows/build-gestor-app.yml): compila en cada push que toque `gestor-app/`.

---

## E2E y galería de casos de uso

```powershell
.\scripts\gestor.ps1 e2e
```

O en `gestor-app/`: `npm run test:e2e`. Videos en `public/e2e-replays/`. Galería: **http://localhost:3000/e2e**. Detalle: [`e2e/README.md`](e2e/README.md).

---

## Relación con el prototipo HTML

El mock en GitHub Pages (`prototipo/`) es referencia visual; **esta app** es el producto desplegable. No comparten `localStorage` con Pages; usá import/export o Supabase.
