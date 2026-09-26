# Despliegue — solo tu cuenta (Gabriel)

Documento **personal**. Este mock **no** se despliega en Accusys, AccuOne ni repos de la org. Todo vive en **tu GitHub** y en **GitHub Pages** bajo tu usuario.

---

## URLs (las que usás día a día)

| Qué | Enlace |
|-----|--------|
| **Mock en vivo (URL oficial)** | https://gabrielalejandroarroyo.github.io/gestor-flujos-prototipo/ |
| **Repositorio** | https://github.com/GabrielAlejandroArroyo/gestor-flujos-prototipo |
| **Actions (deploys)** | https://github.com/GabrielAlejandroArroyo/gestor-flujos-prototipo/actions |

No hay Supabase en este despliegue: los flujos e instancias se guardan en **`localStorage` del navegador** en esa URL (no se sincronizan con Git ni con ninguna base).

### App Next.js (motor en servidor)

La carpeta **`gestor-app/`** no se publica en Pages. Desplegala en **Vercel** (u otro host Node). Guía: [`gestor-app/DEPLOY.md`](gestor-app/DEPLOY.md).

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

### 1. Si editaste fuentes en `prototipo/js/` (no solo HTML/CSS)

```powershell
cd "d:\gestor_flujos supabase\prototipo"
.\build-mock.ps1
```

### 2. Commit y push a **tu** repo

```powershell
cd "d:\gestor_flujos supabase"
git status
git add -A
git commit -m "feat(mock): descripción breve del cambio"
git push origin main
```

### 3. Esperar el deploy (~20 s)

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
cd "d:\gestor_flujos supabase\prototipo"
.\abrir-mock.ps1
```

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

**Editás en local → (build-mock si hace falta) → push a `main` en GabrielAlejandroArroyo/gestor-flujos-prototipo → el sitio se actualiza solo.**

Regla platino: ver [PLATINO.md](PLATINO.md).
