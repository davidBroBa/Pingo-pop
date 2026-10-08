# Tasks: 012-favicon-404-registro

Estado real con nota de verificación. Un `[x]` sin nota no cuenta.

## T1 — Script de iconos + generación de favicon/icon/apple-icon

- [x] `specs/012-favicon-404-registro/iconos.mjs`: lee `public/images/logo/logo.png`, emite `src/app/favicon.ico` (32×32, PNG RGBA embebido), `src/app/icon.png` (32×32), `src/app/apple-icon.png` (180×180).
- [x] Verificación: `node specs\012-favicon-404-registro\iconos.mjs` → "iconos generados OK"; ficheros presentes: favicon.ico 1657 B, icon.png 1635 B, apple-icon.png 26808 B; asserts de tamaño en el propio script (32/32/180). Nota: primer build falló — el ICO llevaba PNG sin alfa; se corrigió con `ensureAlpha()` (el decodificador de Next exige PNG RGBA en el ICO).

## T2 — Página 404 propia

- [x] `src/app/not-found.tsx` con lenguaje cartoon (`bg-cartoon-cream min-h-screen`, logo, badge rotado "404 · Se fue de paseo", tarjeta-botón `cartoon-border cartoon-shadow`, `<Link href="/">` "Volver a la tienda", `metadata: noindex`).
- [x] Verificación: `npm run build` → `.next/server/app/_not-found.html` prerenderizado; su `<head>` enlaza `rel="icon"` (/favicon.ico + /icon.png) y `apple-touch-icon` 180×180; smoke local: `curl http://localhost:3000/esto-no-existe` → 404 con el HTML propio.

## T3 — Registro alineado al estilo cartoon

- [x] `page.tsx`: marco igual que `/login` (fondo `cartoon-cream min-h-screen`, badge rotado "Pingo", h1, subtítulo cálido, "Volver a la tienda", metadata title + noindex).
- [x] `RegisterForm.tsx`: tarjeta `cartoon-border cartoon-shadow rounded-3xl bg-card p-6 sm:p-8`; inputs `rounded-2xl bg-white px-4 py-3 cartoon-border cartoon-focus`; labels `text-primary font-semibold`; hint "Mínimo 8 caracteres"; errores por campo con `role="alert"` sobre `bg-cartoon-coral` (text-primary); checkboxes `accent-accent`; botón `cartoon-border cartoon-shadow cartoon-hover cartoon-focus rounded-2xl bg-accent h-12`.
- [x] El payload del POST y el manejo de estados NO cambian (RF-8): mismo `fetch("/api/auth/register")`, mismo body, misma redirección a `/perfil`.
- [x] Verificación: build OK; smoke local: `curl /registro` → 200, HTML con `cartoon-border`, badge "Pingo" y `cartoon-focus`.

## T4 — Gates

- [x] `npm run typecheck` → 0 errores (salida vacía tras el banner).
- [x] `npm run lint` → 0 errores (salida vacía tras el banner).
- [x] `npm run test` → **431 pass / 0 fail** / 80 suites.
- [x] `npm run build` → OK; rutas nuevas `○ /icon.png`, `○ /apple-icon.png` y `_not-found` prerenderizado.
- [x] Verificación: salidas reales arriba (2026-10-08).

## T5 — Docs, deploy y QA

- [x] `MEMORY.md` actualizado (fase 012, decisiones, hallazgos).
- [x] `tasks.md` (este) con notas de verificación reales.
- [x] Sync al servidor (srv put) + `docker compose build app && up -d app` → `DEPLOY_012_OK`.
- [x] QA producción (2026-10-08): `home:200 registro:200 favicon-ico:200 icon-png:200 apple:200`; `/esto-no-existe-xyz` → **404** con HTML propio (`Se fue de paseo`, `Volver a la tienda`, `noindex`); `/registro` 200 con clases cartoon, badge "Pingo", hint "Mínimo 8 caracteres" (verificado por índice en el HTML, el `-match` en PS fallaba solo por encoding de "í").
- [x] Criterios de aceptación de `spec.md` marcados con su verificación.