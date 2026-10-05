# Tasks: Pingo POP - Enfoque a catálogo existente + fotobotones (004-focus-catalog)

> Spec 004 aprobada para proceder autónomamente. Cambios puramente copy/UI. Sin añadir lógica.

## Tareas

- [ ] **T1** — Revisar archivos propuestos. Identificar cadenas a cambiar sin tocar lógica.
  - Verificado: listado de cambios con rutas + old→new.
- [ ] **T2** — `src/app/page.tsx`: hero CTA "Ver catálogo". Reorientar secciones a pines metálicos, impresiones 3D de réplicas, acrílicos y otros productos (catálogo existente). Bajar énfasis a "personalizado" genérico. No poner impresión 3D por archivo en hero.
  - Verificado: diff solo strings.
- [ ] **T3** — `src/app/products/page.tsx`: copy orientado a catálogo.
  - Verificado: diff solo strings.
- [ ] **T4** — `src/app/products/[slug]/page.tsx`: ficha. Solo fotobotón debe decir "personalizable con tu foto". Impresión 3D por archivo = extra (enlace/botón secundario). Catálogo = neutro.
  - Verificado: sin cambios de props/lógica.
- [ ] **T5** — `src/app/cotizacion/page.tsx`: pasar textos a "productos seleccionados"/"solicitud de cotización".
  - Verificado: diff solo strings.
- [ ] **T6** — Navbar + secciones (`src/components/navbar/*`, `src/components/sections/*`): priorizar "Catálogo". Evitar "personaliza" como primer verbo.
  - Verificado: diff solo strings.
- [ ] **T7** — Verificación: `npm run check` → exit 0 (typecheck, lint, 107/107 tests, build OK).
  - Verificado: salida completa.
- [ ] **T8** — Documentación: actualizar `MEMORY.md`, `CHANGELOG.md` con cambio mínimo (copy/UI). Mantener bajo 100 líneas en `MEMORY.md`.
  - Verificado: cambios coherentes.
- [ ] **T9** — Commit + push. Mensaje claro: "feat(ui): reorientar a catálogo existente + clarificar fotobotones (spec 004)".
  - Verificado: `git log -1 --oneline` y `origin/main == HEAD`.

## Criterios de aceptación

- Home muestra **"Ver catálogo"** como CTA principal.
- Impresión 3D por archivo **no** aparece en hero.
- **Solo fotobotón** dice "personalizable con tu foto".
- Navbar prioriza "Catálogo".
- `/cotizacion` habla de "productos seleccionados"/"solicitud de cotización".
- `npm run check` → exit 0.
- Cero cambios fuera de copy/UI.