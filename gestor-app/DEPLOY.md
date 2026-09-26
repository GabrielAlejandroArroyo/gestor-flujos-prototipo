# Despliegue de Gestor App (Next.js)

El **prototipo** sigue en GitHub Pages (solo carpeta `prototipo/`).

Esta app (`gestor-app`) necesita **Node.js** por las API Routes (`/api/engine/*`). No puede publicarse como HTML estático en Pages.

## Opción recomendada: Vercel (gratis)

1. Subí el repo a GitHub (incluye la carpeta `gestor-app/`).
2. Entrá a [Vercel → New Project](https://vercel.com/new).
3. Importá el repo `gestor-flujos-prototipo`.
4. En **Root Directory**, elegí **`gestor-app`**.
5. Deploy. Vercel detecta Next.js automáticamente.

Variables opcionales (Settings → Environment Variables):

| Variable | Uso |
|----------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Escritura desde API Routes (recomendado) |

Sin Supabase, el motor usa **memoria en el servidor** (sirve para demo; en serverless cada instancia puede reiniciarse).

## Local

```powershell
cd gestor-app
npm ci
npm run dev
```

Abrí http://localhost:3000/gestion

## CI

El workflow `Build Gestor App` compila en cada push a `main` que toque `gestor-app/`.
