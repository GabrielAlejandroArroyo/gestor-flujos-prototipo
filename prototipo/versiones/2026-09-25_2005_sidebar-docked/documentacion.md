# Documentación del prototipo — Gestor de flujos

Modelo conceptual, diagrama entidad-relación y **arquitectura objetivo** para la implementación futura. El mock HTML sigue vigente; no sustituye a la app Next.js.

- Versión HTML: [documentacion.html](./documentacion.html)
- Bitácora de cambios: [bitacora.md](./bitacora.md) · [bitacora.html](./bitacora.html)

---

## Propósito

Este prototipo HTML valida el diseño de un gestor de flujos de trabajo antes de implementarlo con Supabase. Separa la **definición** del flujo (diseñador) de la **ejecución** (instancias, traza y reporte).

## Menú del mock

- **Diseñador de flujo (BPMN):** catálogo, lienzo con subconjunto BPMN 2.0, parámetros en Start Event, Sequence Flow y pantallas en User Task.
- **Gestión de actividades:** instanciar flujos listos, resolver tareas manuales (Aceptar/Rechazar) y ejecutar automáticas.
- **Reporte:** avance, filtros y traza de cada instancia.

## Entidades (modelo conceptual)

| Entidad | Descripción |
|---------|-------------|
| **TipoFlujo** | Categoría (texto libre en el mock, ej. Aprobación). |
| **Flujo** | Tipo, nombre, descripción, estado (borrador \| listo), versión. |
| **ParametroEntrada** | Clave, etiqueta, tipo (texto, numero, fecha, si_no), obligatorio. |
| **Nodo** | BPMN: Start Event (`inicio`), User Task (`manual`), Service Task (`automatica`), Exclusive Gateway (`gateway`), End Event (`fin`). |
| **Sequence Flow** | Origen, destino, condición (siempre \| aceptar \| rechazar). |
| **Pantalla** | Una por User Task. |
| **BloquePantalla** | titulo, texto, dato (solo lectura), comentario; orden definido. |
| **Instancia** | Copia del flujo al iniciar, valores de entrada, estado, paso actual. |
| **PasoInstancia** | Actividad resuelta con decisión y comentario. |
| **Traza** | Eventos inmutables para auditoría y reporte. |

## Diagrama entidad-relación (referencia Supabase)

```
TipoFlujo 1 —— * Flujo
Flujo 1 —— * ParametroEntrada
Flujo 1 —— * Nodo
Flujo 1 —— * Transicion
Nodo * —— * ParametroEntrada  (UsoDato)
Nodo 1 —— 0..1 Pantalla  (solo actividad manual)
Pantalla 1 —— * BloquePantalla
ParametroEntrada 1 —— * BloquePantalla  (bloques tipo dato)
Flujo 1 —— * Instancia
Instancia 1 —— * PasoInstancia
Nodo 1 —— * PasoInstancia
Instancia 1 —— * Traza
```

## Tablas sugeridas (implementación futura)

Schemas por dominio en Postgres (`flujo`, `ejecucion`; Auth en schema de Supabase):

```
flujo.flujos (id, tipo, nombre, descripcion, estado, version, created_at)
flujo.parametros_entrada (id, flujo_id, clave, etiqueta, tipo, obligatorio)
flujo.nodos (id, flujo_id, kind, nombre, descripcion, pos_x, pos_y)
flujo.nodo_parametros (nodo_id, parametro_id)
flujo.transiciones (id, flujo_id, from_nodo_id, to_nodo_id, condicion)
flujo.pantallas (id, nodo_id)
flujo.bloques_pantalla (id, pantalla_id, orden, tipo, texto, parametro_id)
ejecucion.instancias (id, flujo_id, flujo_snapshot jsonb, estado, input_values jsonb, current_nodo_id, started_at, finished_at, created_by)
ejecucion.pasos_instancia (id, instancia_id, nodo_id, estado, comentario, at)
ejecucion.trazas (id, instancia_id, tipo, mensaje, decision, comentario, data_shown jsonb, at)
```

## Persistencia del mock

| Clave | Uso |
|-------|-----|
| `gestor_flujos_prototipo_v2` | Flujos, instancias y traza |
| `gestor_flujos_theme_v1` | Tema claro / oscuro |

Flujo de ejemplo «Aprobación de gasto» con User Task → XOR Gateway.

## Procedimiento de versionado del mock

- **Mock editable:** carpeta [`prototipo/`](./) (`index.html`, `css/`, `js/`).
- **Snapshots congelados:** [`prototipo/versiones/YYYY-MM-DD_HHmm_etiqueta/`](./versiones/) — no editar después de publicados.
- **Índice:** [versiones.md](./versiones.md) · [versiones.html](./versiones.html).
- Antes de un cambio grande: copiá el mock vigente a una nueva carpeta bajo `versiones/`, actualizá el índice y registrá el hito en [bitacora.md](./bitacora.md).
- Tras cambiar fuentes en `js/`, regenerá `bundle.js` y `theme-bundle.js` con esbuild desde `entry-main.js` y `entry-theme.js` (ver reglas Cursor `prototipo-canvas.mdc` y `gestor-flujos-mock.mdc`).

La versión SemVer de la app productiva (`lib/version.ts`) aplica solo cuando exista Next.js; en fase mock usá etiquetas de snapshot.

## Subconjunto BPMN 2.0 (mock)

| BPMN | kind | Reglas |
|------|------|--------|
| Start Event | `inicio` | Parámetros de entrada; una salida `siempre`. |
| User Task | `manual` | Pantalla; una salida `siempre` hacia un gateway. |
| Exclusive Gateway | `gateway` | Entradas ≥1; salidas `aceptar` y `rechazar`. |
| Service Task | `automatica` | Una salida `siempre`. |
| End Event | `fin` | Sin salidas. |

Al completar un User Task, el motor sigue el Sequence Flow `siempre` y cruza el gateway con la decisión Aceptar/Rechazar (traza `gateway`).

---

## Arquitectura objetivo (implementación futura)

El mock no se reemplaza hasta validar UX; la app productiva sigue este stack en **tres capas**:

```
Presentación (Next.js / React 19)
        │  API First (fetch)
        ▼
Negocio (API Routes + Zod + reglas centralizadas)
        │  Supabase client / service role según caso
        ▼
Datos (Postgres Supabase — local primero, cloud después)
```

### Capa de presentación

- **Next.js** con **React 19**, **App Router** y **Server Components**.
- **Tailwind CSS**, diseño **responsive** (escritorio y móvil).
- **Multi idioma ES / EN / PT** (rutas o preferencia; textos fuera de componentes hardcodeados).
- Pantallas equivalentes al mock: diseñador de flujo (incl. diseñador de pantallas manuales), gestión de actividades, reporte.

### Capa de negocio (API First)

- **Route Handlers** de Next.js como única puerta de reglas de negocio.
- Reglas alineadas al prototipo:
  - [js/validation.js](./js/validation.js) — grafo válido, pantallas en manuales, datos de entrada.
  - [js/motor.js](./js/motor.js) — instancias, aceptar/rechazar, automáticas, traza.
- Validación de contratos con **Zod** (entrada/salida de API).

### Autenticación productiva (por definir)

Al iniciar la app Next.js hay que **elegir un solo modelo** y alinear documentación y reglas:

| Opción | Implicación |
|--------|-------------|
| Supabase Auth | RLS con `auth.uid()`; sesión nativa de Supabase. |
| Azure AD / NextAuth (AccuOne) | API Routes con service role; ver `.cursor/rules/supabase-hooks.mdc`. |

Hasta esa decisión, el mock no implementa login. La documentación anterior mencionaba Supabase Auth como referencia; no es un compromiso cerrado.

### Capa de datos

- **Primera implementación: Supabase local** vía **Supabase CLI** y **Docker** (`supabase start`: Postgres, Auth, REST, Studio).
- **Migraciones Supabase** como única fuente de verdad del esquema (`supabase/migrations`, `supabase migration new`, `supabase db reset` / `supabase migration up`). RLS incluida en migraciones.
- Schemas: `flujo`, `ejecucion`; sin duplicar usuarios fuera de Auth.
- **Supabase Cloud** después, con el mismo historial de migraciones.
- Local: respaldo por volúmenes Docker y dumps del CLI. Cloud: backups y monitoreo de la plataforma.

### Flujo de evolución

```
Mock HTML (actual) → Implementación pedida → Supabase local + migraciones → Supabase Cloud
```

## Anexo — Checklist Supabase (fase futura)

Cuando exista `supabase/migrations/` en el repo, **todo cambio DDL** debe seguir `.cursor/rules/supabase-migrations.mdc`:

1. Nunca DDL suelto (MCP / SQL Editor) sin archivo en `supabase/migrations/`.
2. `npx supabase migration new <nombre_snake_case>`.
3. Validar: `bash scripts/supabase/validate-migrations.sh` (cuando exista el script).
4. Aplicar en DESA: `npx supabase db push`.
5. Regenerar tipos: `npx supabase gen types typescript --linked > lib/supabase/types.ts`.
6. `npm run verify`.
7. Commitear juntos: migración + `types.ts` + código dependiente.
8. No aplicar DDL en stage/prod desde Cursor; solo merge Git + deploy.
9. Tras merge: `python3 scripts/supabase/verify-environments.py` (cuando exista).

Guía de setup prevista: `docs/setup/supabase-setup.md` (a crear al inicializar Supabase).

## Fuera de alcance (fase mock actual)

- Proyecto Next.js, Tailwind, i18n, Zod y cliente Supabase.
- Docker / `supabase init` / migraciones (hasta pedir implementar).
- Asignación por usuario/rol, acciones automáticas reales (email, webhooks).
- Diseñador avanzado (zoom, minimapa, undo ilimitado).
