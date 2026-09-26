# Publicar en GitHub Pages

El sitio se genera desde la carpeta `prototipo/` del repo (no hace falta build en CI; `bundle.js` ya está commiteado).

## Activación (una vez)

1. Push a la rama `main`.
2. GitHub → **Settings → Pages**.
3. **Build and deployment → Source:** GitHub Actions.
4. Abrí **Actions** y confirmá que **Deploy GitHub Pages** terminó OK.

## URL

https://gabriel.github.io/gestor-flujos-prototipo/

(Reemplazá `gabriel` si tu usuario de GitHub es otro.)

## Smoke test

- [ ] Carga el diseñador y el flujo seed «Aprobación de gasto».
- [ ] User Task → pestaña **Pantalla** en el estudio.
- [ ] Service Task → **Automatización** → **Probar contrato**.
- [ ] Gestión: instanciar, completar revisión, ver contexto en Reporte.

## Notas

- `localStorage` es por origen; datos en `file://` no se migran a Pages.
- REST **live** puede fallar por CORS según el API destino.
