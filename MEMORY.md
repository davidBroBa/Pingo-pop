# MEMORY.md — Pingo POP

> **Decisiones y su porqué**, no lista de tareas. Lo que ya está en `AGENTS.md` o en
> `docs/` **no se repite aquí**. Máximo ~100 líneas.

## Fase actual

- **Spec 009 `legal-compliance-privacy`: cerrada, verificada y APROBADA por el
  usuario el 2026-10-07** (18/18 casillas con su nota; `spec.md` APROBADA).
  Commiteada y pusheada (`b305b69`). Gate con dev server parado: typecheck 0 ·
  lint 0 · **419 tests / 77 suites / 0 fallos** · build **38 rutas**.
- **Próximo paso: desplegar al servidor** con `docs/DEPLOY.md`, `SITE_URL` real
  (aún `localhost`) y subdominio en Cloudflare (pendiente de datos del usuario).
- Migraciones al día: `npx prisma migrate status` → "up to date", **9** (las 6 de la
  008 + `add_legal_models` + `quote_status_enum` + la de la 007, `add_usuario_estado`).

## Decisiones que no conviene re-litigar (vigentes)

- **Revocación de sesiones con `sessionVersion`.** `sv` firmado en la cookie,
  contrastado con la BD. Solo `getSessionUser()` revoca (el middleware corre en Edge
  sin Prisma). Límite conocido y documentado.
- **Retención no se ejecuta, a propósito.** RF-22: a los 12 meses "queda marcada:
  avisa, no borra". Sin cron ni columna "revisada". Una vencida conservada sigue
  apareciendo vencida (correcto).
- **`LEGAL_LINKS` separado de `legal-versions`.** El segundo usa `node:crypto`; un
  componente de cliente lo arrastraba (`crypto-browserify`, 800 KB). Dos tests lo atan.
- **Textos legales definitivos (D20) y acentuados.** Huellas con
  `scripts/recalcular-huellas.ts`; el marcador `[REQUIERE DATO DEL PROPIETARIO]`
  **se importa** desde `legal-data.ts`, nunca a mano.
- **`SiteSettings` y `LegalData` son filas únicas** (`id` fijo a `1`, `upsert`).
- **`MainLayout` recibe `haySesion` por prop y NO lee cookies.** Si fuera `async`, la
  home dejaría de ser estática. Desde F9 además lleva el skip-link (sigue estático).
- **D21: contraseña temporal obligatoria y de verdad.** `proxy` (403 en `/admin/*`),
  `requireAdmin()` (igual en la API), aviso en `/perfil`. Sin callejón sin salida.

## Decisiones de esta tanda (2026-10-07)

- **D14 en práctica: sin banner automático, SÍ apertura a demanda.** El enlace
  "Preferencias de cookies" está **siempre visible** en el pie; el panel solo se abre
  si el usuario lo pide y **abrirlo no escribe nada en `localStorage`** (RF-18).
  `Footer` es server component → el enlace es un Client Component fino
  (`ConsentLink.tsx`) que solo emite `abrir-consentimiento`.
- **El panel de consentimiento ya es un diálogo modal accesible (APG):**
  `role="dialog"` + `aria-modal`, foco inicial en `consent-close`, **Escape cierra** y
  **el foco vuelve al enlace que lo abrió** (`ConsentProvider` guarda el autor y lo
  reenfoca al cerrar). Verificado en navegador con flujo real.
- **Skip-link en `MainLayout`** (`<a href="#contenido">` + `main#contenido` con
  `tabIndex={-1}`): primer focusable de la página, activarlo salta al contenido (WCAG
  2.4.1). El prerender no cambió (`/novedades` sigue `○`).
- **Contraste:** el file picker del admin heredaba `text-foreground-muted` sobre
  `accent` (2.77:1) → `file:text-primary` (8.79:1). El hover `text-accent` de
  Navbar/Footer (1.76:1) **queda documentado como hallazgo pendiente**: elegir el
  color de hover es decisión de diseño.
- **Rate limit público 120, alto a propósito (P10), no `DEFAULT_MAX`**:
  `AdminProductsView.refresh()` se auto-bloquearía con 10. 117×200 → 118º 429 con
  `retry-after`. Cabeceras presentes también en 404/400 (**RF-32, cero delta**).
- **RF-35: los logs de error NO sueltan el objeto crudo, solo `fallo.message`** y
  **nunca** contraseñas literales (se quitó una de `prisma/make-buyer.ts`).
- **`npm audit fix` aplicado** (source-map-js, no rompedor; solo `package-lock.json`):
  audit vuelve a 8 high justificados.
- **README desmentido y corregido:** el email de cotización **no** devuelve 400 por
  vacío — es opcional (`.nullish()`) y un POST válido responde **201** (200 si el
  token ya existía). Verificado contra `quote-schema.ts` y la ruta.

## Trampas (todas me han mordido)

- **En un server component, un `onClick` en `<Link>` = error de Next.**
- **`browser.evaluate` no tiene timers** dentro de `execute`; el foco/panel se
  verifica en **dos `evaluate` secuenciales** (clic y lectura).
- **Acentos y BOM: usa la herramienta de edición, nunca un `.ps1` tecleado.** Barre
  con `npx tsx scripts/barrido-caracteres.ts` (se autocomprueba con su control).
- **`new Date()` a nivel de módulo congela el reloj.** Dentro de la función.
- **`npm run build` hace panic si el dev server está vivo.** Parar Next y borrar
  `.next`.
- **Cambiar el esquema de Prisma obliga a reiniciar el dev server** y `npx prisma
  generate`.
- **PowerShell trata `[id]` como comodín.** Usa `-LiteralPath`.
- **Docker Desktop apagado o arrancado tarde** → pool de Prisma muerto (500).

## Hallazgos abiertos

| # | Qué | Estado |
|---|---|---|
| **A1/A2/A3** | Skip-link (2.4.1), auditoría completa (Escape/foco/contraste) y build final post-Footer | **Resueltos hoy** → `docs/ACCESSIBILITY.md` + gate 419/77/38 |
| H5 | Navbar "Iniciar sesión" en dinámicas con sesión; en estáticas es diseño | Preexistente |
| H3 | Dos "+" rápidos en el carrito solo suman 1 | Abierto, bajo impacto |
| — | **Hover `text-accent` de Navbar/Footer** (1.76:1 al pasar el cursor) | Pendiente: elegir color = decisión de diseño |
| — | **Focus trap físico del diálogo** no implementado ni probado con teclado real | Documentado en ACCESSIBILITY.md |
| — | **`SITE_URL` en el servidor sigue `localhost`**: el sitemap publicará localhost | **Pendiente antes de desplegar** |
| — | **`middleware` → `proxy`** (Next 16.3.8 lo avisa en cada arranque) | Merece spec propia |
| — | **Gates sin bloquear** (`.git/hooks/` vacío), repo público: falta CI | Pendiente de decisión |

## Repositorio y despliegue

- **GitHub:** `github.com/davidBroBa/Pingo-pop`, rama `main`, público. Specs 006/007/009
  commiteadas y pusheadas en **`b305b69`**. **Barrido de secretos antes de cada commit**
  (`docs/PUBLICAR.md` §2).
- **Producción:** `~/proyectos/pingo-pop` en `srv` (túnel `3001→3000`). IP y usuario
  nunca en ficheros publicables.