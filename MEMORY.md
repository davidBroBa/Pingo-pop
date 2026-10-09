# MEMORY.md — Pingo POP

> **Decisiones y su porqué**, no lista de tareas. Lo que ya está en `AGENTS.md` o en
> `docs/` **no se repite aquí**. Máximo ~100 líneas.

## Fase actual

- **Tanda de reparación (2026-10-08, botones de catálogo + uploads):** dos bugs
  reportados por el usuario, arreglados y desplegados.
  1. **Botones de la portada no llevaban a ningún lado:** las tarjetas de
     categoría ahora enlazan (`hrefCategoria()` en `category-card-props.ts`) a
     `/products?categoria=<slug>`; el catálogo filtra por ese parámetro
     (`src/lib/catalog-filter.ts` + `src/app/products/page.tsx`). Reglas:
     `?categoria=` vacío/ausente = catálogo completo; slug válido = filtrado (h1
     con el nombre de la categoría + enlace "Ver todo el catálogo"); slug
     inexistente o malformado = 404 propio. La red de seguridad (sin categorías
     en BD) enlaza a `/products`. Verificado en producción: 4 tarjetas con
     href correcto, `pines-metalicos` → 200 con h1 "Pines metálicos",
     `?categoria=` → 200, slug inexistente/inválido → 404.
  2. **Imagen del muñeco no cargaba:** spec 011 implementada. Route handler
     `src/app/uploads/[...path]/route.ts` que lee disco por petición (Next 16 no
     sirve desde `public/` lo que no resolvió al boot), volumen named
     `pingo-uploads` en `docker-compose.yml`, `chown` + borrado de `.gitkeep` en
     el Dockerfile (un dotfile registrado al boot lo servía Next estático → 500;
     sin él cae al handler → 400). Verificado en producción: fichero nuevo → 200
     **sin recrear el contenedor**, `.php` → 400, inexistente → 404, `.gitkeep`
     → 400, muñeco `4895c7d1…` → 200, hero → 200.
- **Muñeco visible ya funcionando (2026-10-08):** el usuario re-subió la foto
  recreando el producto: hay dos muñecos en BD — `id=6`
  `mun-eco-de-nieve-con-bufanda` con `image = NULL` (el original, quedó sin
  foto) y `id=7` `muln-eco-de-nieve-con-bufanda` con
  `image = /uploads/products/4895c7d1d6e04813ffeb22a93ab0cbb2.jpg` (el nuevo,
  con la foto). Verificado en producción: la ficha de `id=7` responde 200 y
  pinta la imagen, y el catálogo referencia `4895c7d1…`. Decisión pendiente del
  usuario (**no pregunta ni borra por tu cuenta**): si sobra el duplicado
  `id=6`, borrarlo (el endpoint de borrado está marcado en el README como
  límite conocido: no borra el fichero de disco).
- **Spec 012 `favicon-404-registro` (2026-10-08):** favicon con el logo
  (`favicon.ico` + `icon.png` + `apple-icon.png` generados desde
  `public/images/logo/logo.png` con `specs/012/iconos.mjs` y `sharp`), página
  `not-found.tsx` propia con lenguaje cartoon, y `/registro` alineado al marco
  visual de `/login` (fondo `cartoon-cream`, tarjeta `cartoon-border
  cartoon-shadow rounded-3xl`, inputs `rounded-2xl` cartoon, errores coral con
  `role="alert"`, microcopy). Cero cambios de lógica: el payload y los estados
  del registro son los mismos. Gates locales: typecheck 0 · lint 0 · 431 tests /
  0 fallos · build OK (la 404 prerenderizada enlaza favicon.ico + icon.png +
  apple-icon.png; smoke local: /registro 200, /favicon.ico 200, ruta inexistente
  → 404 propia).
- **Spec 010 `registro-publico`: implementada y CERRADA el 2026-10-08** (el
  usuario pidió cerrarla y commitearla). Registro público solo `BUYER` desde
  `/login` → `/registro`; admins exclusivamente desde panel o seed
  (`seedAdmin()` ya existía). Gates locales con dev parado: typecheck 0 ·
  lint 0 · **431 tests / 0 fallos** · build OK con `ƒ /registro`.
- **D28 ejecutada como migración:** `LegalAcceptance.userId Int?` + `SetNull` +
  índice. Migración `20261008000000_add_legal_acceptance_user` creada con
  `prisma migrate diff` (BD local apagada) y **aplicada en el servidor**
  (`migrate deploy` → "successfully applied"); cliente Prisma regenerado en
  servidor con `./node_modules/.bin/prisma generate` (¡`npx` se cuelga
  preguntando!).
- Desplegado en el servidor el 2026-10-07 (build `cON67qap`, 38 rutas) + rebuild
  de la spec 010 el 2026-10-08 (pendiente de QA en URL pública).
- Migraciones en servidor: 10 (las 9 previas + `add_legal_acceptance_user`).

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

## Decisiones de esta tanda (2026-10-08, spec 012)

- **Favicon fuente única = logo.** Se genera con un script versionado
  (`specs/012-favicon-404-registro/iconos.mjs`) desde `public/images/logo/logo.png`
  para que el logo siga siendo la única fuente de verdad. `sharp` 0.35 **emite
  PNG pero no ICO**: el `.ico` se envuelve a mano (formato Vista+: PNG RGBA
  embebido — Next rechaza el ICO si el PNG no es RGBA, primer build falló).
- **Registro: mismo marco que login, cero lógica tocada.** La tarjeta, inputs y
  errores ahora usan los tokens cartoon del resto del sitio (spec 002). El
  payload POST, el manejo de estados y la redirección a `/perfil` no cambian
  (RF-8); solo presentación y microcopy.
- **404 estática de marca:** no consulta BD ni sesión, `noindex` en robots
  (`_not-found` prerenderizado). Hereda fuentes/variables del layout raíz.
- **QA-1/QA-2 (spec 010) siguen abiertos** con su estado en la sección
  "Hallazgos QA".

## Decisiones de esta tanda (2026-10-08, spec 010)

- **D25:** registro inmediato, sin verificación por email (no hay infraestructura
  de correo; spec 009). **D26:** dos casillas obligatorias (Términos + Privacidad)
  con la versión vigente, validadas con `sonVersionesValidas` (un 0.9 viejo → 400).
- **D27:** tras registrarse, sesión automática con el mismo patrón de cookie que
  el login (`cookies()` + `signSession` + `buildSessionPayload`, `swc=0`).
- **D28 (confirmada por el usuario el 2026-10-08):** la aceptación se guarda en
  `LegalAcceptance` con la columna nueva `userId SetNull`. Añade una fila a un
  modelo que la spec 009 había dejado sin identificador de usuario **a propósito**;
  el comentario del schema ya explica el cambio. `SetNull` mantiene la evidencia
  si se borra la cuenta.
- **El rol `BUYER` se fija en el servidor**; el payload no contempla `role`, así
  que `role: "ADMIN"` en el POST se ignora (verificado en QA con respuesta 201
  `role: BUYER`).
- **Carrera de email duplicado → 409 vía `describePrismaError`** (el pre-chequeo
  no cubre dos altas simultáneas); fallo real de BD → 503 + `Retry-After: 30`.

## Hallazgos QA (2026-10-07, abiertos)

- **⚙️ QA-1 RESUELTO (2026-10-08):** la contraseña expuesta se rotó por completo.
  La cuenta que la usaba se **desactivó** (`activo=false`, `sessionVersion+1`,
  sesiones revocadas, email renombrado a `admin.expirado.20261008@pingo-pop.local`)
  y se creó un admin **nuevo** con `admin@pingo-pop.local` (id=5, argon2id de la
  contraseña nueva). Verificado en producción: login nuevo → 200 `role: ADMIN`;
  contraseña vieja → 401. `ADMIN_PASSWORD` del `.env` (servidor y local) alineado
  con la nueva para que un seed futuro no restaure la filtrada.
- **⚠️ Fuga de `ADMIN_PASSWORD` (2026-10-08):** el valor literal llegó a salir en
  este `MEMORY.md` y se publicó en el repo **público** de GitHub. Se purgó el
  historial completo (`git filter-branch` + clon limpio, `main` reescrita) y la
  cuenta afectada quedó desactivada. Aunque el historial esté limpio, forks o
  cachés de GitHub pueden retener el valor; la contraseña en uso **ya no es la
  filtrada**. Las credenciales reales solo viven en `.env` y en el txt del
  Escritorio.
- **QA-2 uploads en producción:** (a) EACCES en `public/uploads` (app `nextjs`
  uid 1001 vs owner root) — chown en caliente hecho, **se pierde al recrear el
  contenedor** (Dockerfile sin `chown`); (b) archivos nuevos en `public/uploads/*`
  devuelven 404 hasta recrear el contenedor (Next 16 resuelve `public/` al boot);
  no hay volumen para uploads en `docker-compose.yml`. **RESUELTO con la spec
  011** (2026-10-08): route handler dinámico + volumen `pingo-uploads` + `chown`
  en Dockerfile + borrado de `.gitkeep` de la imagen. Verificado en producción
  (criterios de aceptación de la spec 011 en verde).

## Decisiones de la tanda 009 (2026-10-07)

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
| — | `SITE_URL` en el servidor era `localhost` | **Resuelto**: `https://pingopo.davidamador.dev` en `.env`, sitemap verificado |
| — | **`middleware` → `proxy`** (Next 16.3.8 lo avisa en cada arranque) | Merece spec propia |
| — | **Gates sin bloquear** (`.git/hooks/` vacío), repo público: falta CI | Pendiente de decisión |

## Repositorio y despliegue

- **GitHub:** `github.com/davidBroBa/Pingo-pop`, rama `main`, público. Specs 006/007/009
  commiteadas y pusheadas en **`b305b69`**. **Barrido de secretos antes de cada commit**
  (`docs/PUBLICAR.md` §2).
- **Producción:** `~/proyectos/pingo-pop` en `srv` (túnel `3001→3000`). IP y usuario
  nunca en ficheros publicables.