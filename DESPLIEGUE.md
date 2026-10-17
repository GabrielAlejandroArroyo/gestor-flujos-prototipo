# Despliegue — solo tu cuenta (Gabriel)

Documento **personal**. Este mock **no** se despliega en Accusys, AccuOne ni repos de la org. Todo vive en **tu GitHub** y en **GitHub Pages** bajo tu usuario.

---

## URLs (las que usás día a día)

| Qué | Enlace |
|-----|--------|
| **Mock en vivo (URL oficial)** | https://gabrielalejandroarroyo.github.io/gestor-flujos-prototipo/ |
| **Entorno testing (datos del repo)** | https://gabrielalejandroarroyo.github.io/gestor-flujos-prototipo/testing.html |
| **Repositorio** | https://github.com/GabrielAlejandroArroyo/gestor-flujos-prototipo |
| **Actions (deploys)** | https://github.com/GabrielAlejandroArroyo/gestor-flujos-prototipo/actions |

No hay Supabase en este despliegue: los flujos e instancias se guardan en **`localStorage` del navegador** en esa URL (no se sincronizan con Git ni con ninguna base).

### Por qué no ves lo mismo que en local

- **Origen distinto:** `http://127.0.0.1:8765` y `*.github.io` no comparten `localStorage`.
- **Pages puede quedar con un estado viejo** (solo el seed demo de una visita anterior). Usá el entorno **testing** (abajo) para cargar el dataset versionado del repo.
- Tras cargar datos, **iniciá sesión** de nuevo (`@luna` / `1234` en el mock).

### Entorno testing (recomendado para QA)

1. Abrí **testing.html** (fuerza `?env=testing&bootstrap=1`):
   - https://gabrielalejandroarroyo.github.io/gestor-flujos-prototipo/testing.html
2. En la barra superior deberías ver el badge **Testing** y el botón **Recargar datos testing**.
3. Dataset embebido: `prototipo/data/environments/testing-bootstrap.json` (flujos, instancias, maestros, entidades exportados desde tu Chrome local).

Actualizar testing desde tu PC (después de seguir trabajando en local):

```powershell
cd "d:\gestor_flujos supabase"
.\scripts\sync-local-to-pages.ps1 -Publish
```

### App Next.js (producto desplegable)

La carpeta **`gestor-app/`** no se publica en Pages. Opciones:

| Modo | Guía |
|------|------|
| **Scripts** (Docker, dev, Vercel, Supabase) | `.\scripts\gestor.ps1 help` — guardia platino, sin AccuOne |
| **Docker** (integración / on-prem) | `.\scripts\gestor.ps1 docker-up` o [`gestor-app/DEPLOY.md`](gestor-app/DEPLOY.md) |
| **Vercel** | `.\scripts\gestor.ps1 vercel` (cuenta personal) |
| **UI de integración** | `/integracion` y `GET /api/health` en la URL desplegada |

Variables: [`gestor-app/.env.example`](gestor-app/.env.example). Persistencia: **Supabase propio** (migraciones en `gestor-app/supabase/migrations/`).

### Desarrollo local (mock + Next)

Desde la raíz del repo:

```powershell
.\scripts\start-dev.ps1
```

Primera vez: `.\scripts\start-dev.ps1 -Install`. Ver [`scripts/README.md`](scripts/README.md).

El script abre **dos** URLs: el mock (`:8765`) incluye los catálogos del diseñador en el menú lateral; Next (`:3000`) muestra los mismos submenús con vistas stub. Para probar catálogos con datos (`localStorage`), usá el mock o GitHub Pages.

---

## Qué se publica

- Solo la carpeta **`prototipo/`** (HTML, CSS, `bundle.js` ya generado).
- El workflow [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) corre en cada **push a `main`**.
- La carpeta **`.cursor/`** no va a Git (reglas locales en tu PC, opcional).

---

## Publicar cambios (desde tu PC)

Carpeta del proyecto en disco:

```text
d:\gestor_flujos supabase
```

### Camino recomendado (un comando)

Desde la raíz del repo, en **rama `main`**:

```powershell
cd "d:\gestor_flujos supabase"
.\scripts\mock-publish-github.ps1 -Message "feat(mock): descripción breve del cambio"
```

El script: regenera `bundle.js` → `git add prototipo/` → commit → pide confirmación → `git push origin main`. Solo commitea la carpeta `prototipo/`.

Simular sin tocar Git: agregá `-DryRun`.

Instrucciones y parámetros: [`scripts/README.md`](scripts/README.md).

### Alternativa manual

1. Build (si editaste `prototipo/js/`):

```powershell
cd "d:\gestor_flujos supabase\prototipo"
.\build-mock.ps1
```

2. Commit y push:

```powershell
cd "d:\gestor_flujos supabase"
git status
git add prototipo/
git commit -m "feat(mock): descripción breve del cambio"
git push origin main
```

### Esperar el deploy (~20 s)

```powershell
gh run list -R GabrielAlejandroArroyo/gestor-flujos-prototipo --workflow=deploy-pages.yml --limit 1
```

Cuando diga `success`, recargá la URL de Pages (a veces conviene Ctrl+F5).

**Remote único permitido (platino):**

```text
https://github.com/GabrielAlejandroArroyo/gestor-flujos-prototipo.git
```

Comprobación:

```powershell
git remote -v
```

No agregues remotes de empresas u orgs ajenas a este proyecto personal.

---

## Activación inicial (ya hecha; por si repetís en otro repo)

1. Repo en **tu** cuenta GitHub, nombre `gestor-flujos-prototipo`.
2. Con plan **Free**, el repo debe ser **público** para Pages (sin secretos en el código).
3. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Primer push a `main` o **Actions → Deploy GitHub Pages → Run workflow**.

---

## Probar que todo anda (checklist)

1. Abrí la URL de Pages → **Diseñador de flujo** → flujo «Aprobación de gasto».
2. User Task → pestañas **Camino / Pantalla**.
3. Service Task → **Automatización** → **Probar contrato** (mock).
4. **Gestión** → instanciar → completar revisión → **Reporte** (contexto de instancia).

---

## Desarrollo local (sin internet)

```powershell
cd "d:\gestor_flujos supabase"
.\scripts\mock-local.ps1 -Build
```

Alternativa: `prototipo\abrir-mock.ps1` (sin build automático).

Los datos de `file://` y los de `github.io` son **orígenes distintos**: no comparten `localStorage`.

---

## Supabase (futuro, opcional)

- **No** usar proyectos Supabase de Accusys para este mock.
- Si más adelante querés backend propio, sería **tu cuenta Supabase personal**, otro repo y otro despliegue — con regla platino (6 confirmaciones antes de mezclar con Accusys).

---

## Si el deploy falla

| Síntoma | Qué hacer |
|---------|-----------|
| Workflow rojo en Actions | Abrí el run → log de **Deploy to GitHub Pages** |
| «Pages not enabled» | Settings → Pages → Source: **GitHub Actions** |
| «Plan does not support Pages» en repo privado | Repo **público** o GitHub Pro |
| Cambios no se ven | Esperá el run verde; hard refresh; revisá que commiteaste `bundle.js` si tocaste `js/` |

---

## Resumen en una línea

**Editás en local → `mock-publish-github.ps1 -Message "..."` (o build + push manual) → el sitio se actualiza solo.**

Regla platino: ver [PLATINO.md](PLATINO.md).
