# Documentación del prototipo — Gestor de flujos

Modelo conceptual, diagrama entidad-relación y **arquitectura objetivo** para la implementación futura. El mock HTML sigue vigente; no sustituye a la app Next.js.

- Versión HTML: [documentacion.html](./documentacion.html)
- Bitácora de cambios: [bitacora.md](./bitacora.md) · [bitacora.html](./bitacora.html)

---

## Propósito

Este prototipo HTML valida el diseño de un gestor de flujos de trabajo antes de implementarlo con Supabase. Separa la **definición** del flujo (diseñador) de la **ejecución** (instancias, traza y reporte).

## Menú del mock

- **Diseñador de flujo:** catálogo, lienzo, parámetros de entrada, conexiones y pantallas de actividades manuales.
- **Gestión de actividades:** instanciar flujos listos, resolver tareas manuales (Aceptar/Rechazar) y ejecutar automáticas.
- **Reporte:** avance, filtros y traza de cada instancia.

## Entidades (modelo conceptual)

| Entidad | Descripción |
|---------|-------------|
| **TipoFlujo** | Categoría (texto libre en el mock, ej. Aprobación). |
| **Flujo** | Tipo, nombre, descripción, estado (borrador \| listo), versión. |
| **ParametroEntrada** | Clave, etiqueta, tipo (texto, numero, fecha, si_no), obligatorio. |
| **Nodo** | inicio \| manual \| automatica \| fin; posición en lienzo; datos que consume. |
| **Transicion** | Origen, destino, condición (siempre \| aceptar \| rechazar). |
| **Pantalla** | Una por actividad manual. |
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

Clave `localStorage`: `gestor_flujos_prototipo_v1`. Incluye un flujo de ejemplo «Aprobación de gasto» listo para instanciar.

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
- **Supabase Auth**: sesión en app; instancias y decisiones asociadas al usuario (no aplica al mock).

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

## Fuera de alcance (fase mock actual)

- Proyecto Next.js, Tailwind, i18n, Zod y cliente Supabase.
- Docker / `supabase init` / migraciones (hasta pedir implementar).
- Asignación por usuario/rol, acciones automáticas reales (email, webhooks).
- Diseñador avanzado (zoom, minimapa, undo ilimitado).
