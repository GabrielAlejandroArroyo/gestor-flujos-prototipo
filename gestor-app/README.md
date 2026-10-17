# Gestor de Flujos — App

Plataforma Next.js para diseño BPMN, ejecución de instancias, maestros y auditoría, con backend Supabase.

## Inicio rápido

Desde la **raíz del repo** (recomendado):

```powershell
.\scripts\gestor.ps1 env-init
.\scripts\gestor.ps1 dev -Install
```

O manualmente en `gestor-app/`:

```powershell
copy .env.example .env
npm ci
npm run dev
```

Abrir http://localhost:3000 · Integración: http://localhost:3000/integracion

## Docker

```powershell
copy .env.example .env
docker compose up -d --build
```

Detalle completo: **[DEPLOY.md](./DEPLOY.md)**

## Estructura

| Ruta | Descripción |
|------|-------------|
| `/` | Catálogo de flujos |
| `/diseno/[flowId]` | Canvas React Flow |
| `/gestion` | Instancias y resolución de tareas |
| `/maestros` | Tipos, entidades, maestros |
| `/reporte` | Auditoría |
| `/datos` | Import / export |
| `/integracion` | Health, API y ejemplos curl |

## Stack

- Next.js 16 · React 19 · TypeScript
- Supabase (Postgres + RLS dev)
- `@xyflow/react` (diagrama)

## Licencia / despliegue

Repo personal; ver [`../DESPLIEGUE.md`](../DESPLIEGUE.md) y [`../PLATINO.md`](../PLATINO.md).
