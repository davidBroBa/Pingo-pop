# AGENTS.md — Pingo POP

## Propósito
Este fichero define las reglas operativas y trampas para trabajar en **Pingo POP**. Es la referencia local del proyecto: lo que no esté aquí, no debe asumirse.

## Punto de entrada (si acabas de llegar, léelo en este orden)
1. **Este fichero** — reglas, principios y trampas.
2. **`MEMORY.md`** — la **fase actual**, las decisiones ya tomadas *y su porqué*, y los próximos pasos. Es el único sitio donde se mira primero.
3. **`specs/<NNN>-<nombre>/`** de la spec en curso: `spec.md` → `plan.md` → `tasks.md`. En `tasks.md` está el estado real de cada tarea **con la nota de su verificación**; no confíes en un checkbox sin nota.
4. **Solo entonces, el código.**

**Comprueba la fase antes de tocar nada.** Si `MEMORY.md` dice que hay una spec
abierta, su `spec.md` está pendiente de aprobación y **no se escribe código** hasta
que el usuario la apruebe. Flujo obligatorio (skill `proyecto-estandar`, nivel B):

```
spec.md  →  aclaración con el usuario  →  plan.md  →  tasks.md
                                                      ↓
                          gates en verde  ←  validación  ←  código (tests primero)
```

Las specs cerradas (`001`, `002`) están **completas y desplegadas**; son referencia
de estilo, no trabajo pendiente.

## Comandos (local y servidor)
- `npm run dev` — desarrollo (puerto 3000)
- `npm run build` — build de producción
- `npm run start` — ejecuta build (`next start -p 3000`)
- `npm run lint` — ESLint
- `npm run test` — `node --import tsx --test "tests/**/*.test.ts"` (190 tests, 26 suites)
- `npm run validate` — valida `src/data/*.json` (no usado actualmente)
- `npm run typecheck` — `tsc --noEmit`
- `npm run check` — typecheck + lint + test + build (ideal antes de subir)

## Estructura
- `src/app/` — App Router de Next.js 16
- `src/app/api/` — rutas API (Zod en borde, 401/403 por rol, rate limit donde aplica)
- `src/components/` — componentes co-ubicados con su `.css`
- `src/lib/` — lógica reutilizable: `auth/`, `prisma.ts`, `env.ts`, `validation.ts`, `quote-schema.ts`, `quote-cart-storage.ts`, `account-schema.ts`, `upload-validation.ts`, `rate-limit.ts`, `prisma-error.ts`
- `src/lib/auth/` — `password.ts` (argon2id), `session-token.ts` (HMAC-SHA256, base64url, `sv`), `require-admin.ts` (guard servidor, **revoca**), `session.ts` (lectura de cookie, con y sin revocación)
- `src/middleware.ts` — protección de `/admin/:path*` y `/perfil`. Solo exige ADMIN en `/admin/*`; corre en **Edge**, así que **no puede revocar sesiones** (no hay Prisma): la revocación la hace `requireAdmin()` y `getSessionUser()`
- `src/app/perfil/` — página de perfil y su vista cliente. Solo `name`; el `email` no se edita
- `src/app/api/account/` — `password` (revoca todas las sesiones) y `profile`
- `src/generated/prisma/` — cliente Prisma generado (no editar)
- `prisma/` — schema, migraciones, `seed.ts`
- `tests/` — 26 suites con `node:test` + `tsx` (sin dependencias nuevas, **sin jsdom**: la lógica comprobable va en módulos puros de `src/lib/`, nunca dentro de un componente)
- `public/uploads/products/` — imágenes de **productos y categorías** (nombres aleatorios, `.gitkeep` versionado)
- `public/uploads/site/` — imágenes de **ajustes del sitio** (la foto del hero). Carpeta aparte porque su validación también lo es: `imagePath` para productos, `siteImagePath` para el hero. Un destino no puede usar la ruta del otro
- `src/app/admin/apariencia/` — panel de la foto del hero (`PATCH /api/admin/site`)
- `src/lib/site-settings.ts` — la fila **única** de `SiteSettings` (`SINGLETON_ID = 1`). `readHeroImage()` es **tolerante a fallos**: si la BD cae devuelve `null` y sale el `Pingo`, porque un ajuste del sitio no puede dejar la web sin pintar
- `src/lib/category-card-props.ts` — número y color de las tarjetas de la portada, **derivados y no guardados**, más el recorte a 4. Puro y testeado
- `src/app/admin/AdminNavLinks.tsx` — enlaces entre las tres páginas de administración. Antes **`/admin/categorias` no tenía ni un enlace entrante** y solo se abría escribiendo la URL

## Principios innegociables
- **Paleta: núcleo preservado + extensión cartoon (spec 002).** El **núcleo original** se mantiene como ancla de marca: `#F7B92C` (accent), `#2A2227` (ink), `#707070` (muted), `#ECECEC` (border), `#FAFAFA` (card), `#fcfcfc`, `#ffffff`. Desde la spec `002-cartoon-visual` se **amplía** con colores de apoyo cartoon (rosa, cielo, menta, lavanda, coral, crema) documentados en `docs/DESIGN.md`, que es la **única fuente de verdad** de la paleta. Prohibido inventar hex fuera de `docs/DESIGN.md`; prohibido alterar los hex del núcleo.
- **Secretos nunca en repo.** `.env` ignorado; `.env.example` sí. Nunca committear `.env*` real.
- **Nada de datos de infraestructura en ficheros publicables.** Sin IPs de servidor, sin nombres de usuario, sin rutashome absolutas: se usa el alias SSH `srv`. Las excepciones vivas van en la `.env` del servidor.
- **Capturas: nada de `/admin/*` ni de sesión iniciada** en un repo público (el panel enseña el catálogo real y cualquier token queda congelado en la imagen). Antes de publicar, revisar `docs/PUBLICAR.md`.
- **No enumeración de usuarios.** Mismo 401 ante credenciales incorrectas o usuario inexistente. Ver `src/app/api/auth/login/route.ts`.
- **Defence in depth.** Middleware + `requireAdmin()` en servidor. Nunca confiar solo en UI/middleware.
- **La revocación de sesiones es real:** `User.sessionVersion` viaja firmado en la cookie como `sv` y se contrasta con la BD. Cambiar la contraseña la incrementa y **cierra todas las sesiones, incluida la del dispositivo que la cambió**. El middleware no puede hacerlo (Edge, sin Prisma): por eso `requireAdmin()` usa `getSessionUser()`, que sí consulta.
- **Uploads seguros.** Solo JPEG/PNG/WebP. **Magic bytes** obligatorios. Máx 5 MiB. Nombre `randomBytes(16).hex` + extensión válida. Escritura con `flag: "wx"`. Ruta validada con regex estricta.
- **Un solo endpoint de subida, con destino.** `POST /api/admin/upload` lee `target` del `FormData` y lo contrasta contra `UPLOAD_TARGETS`, un registro **congelado**. `products` por defecto, así que los formularios de producto no cambian ni una línea. Se eligió un parámetro y no un endpoint por carpeta para que la frontera de seguridad (quién sube, qué se acepta, cómo se nombra) quede **en un solo sitio**.
- **`SiteSettings` es una fila, no una tabla de configuraciones.** `id` fijo a `1` y `upsert`: es lo que impide el error de crear una fila nueva en cada guardado y acabar leyendo un valor al azar. Cuando haga falta más de un ajuste se **añaden columnas**, no filas.
- **El recorte a 4 tarjetas de la portada es una decisión del usuario (D11), no un descuido.** Pero su consecuencia real es peor de lo que parece: como el orden es alfabético, **una categoría nueva puede desplazar a otra que ya estaba** y sacarla de la portada. La 5.ª se sigue editando y admite foto; solo no se ve.
- **Entradas validadas con Zod** en el borde. `imagePath` acepta `""`/espacios → `null` (preprocess) para evitar 400 en formularios.
- **Toda vista de producto pinta `product.image`.** Las cuatro vistas públicas (catálogo, destacados de la home, ficha y carrito) usan `image !== null && image !== ""` y, si no hay foto, el `<span>Pingo</span>` de reserva: 5 de 6 productos no tienen imagen. Con `<img>` y `eslint-disable-next-line @next/next/no-img-element` **en una sola línea** y el motivo escrito. Una vista que acepta el campo y no lo lee repite el bug que tenía el catálogo entero.
- **Dos políticas de contraseña por rol:** BUYER 8+ **sin exigir complejidad**; ADMIN 12+ con mayúscula, minúscula, dígito y puntuación. El suelo de 8 **no baja**, porque `LoginSchema` ya rechazaba menos. Viven en `src/lib/account-schema.ts`, que es puro.
- **Errores Prisma mapeados.** Usar `describePrismaError` → 400/404/409/422 para fallos del cliente, 500 + log para fallos reales.
- **Cero secretos loggeados.** Nunca imprimir `DATABASE_URL`, hash, tokens o contraseñas.
- **Test-first cuando se añade lógica crítica.** Tests en `tests/` con `node:test`.

## Trampas a evitar
- **`force-dynamic`**: debe ir en el **`page.tsx`**, no en componentes. Rutas `/admin/*` deben ser dinámicas.
- **`MainLayout` NO puede ser `async` con `cookies()`.** `/contacto` y `/novedades` se prerenderizan como HTML estático, y ahí no hay `cookies()`: el build falla. Para saber si hay sesión, cada página se la pasa como propiedad.
- **Cambiar el esquema de Prisma obliga a reiniciar el dev server** (si no, `Unknown field`) y `npm run build` hace panic de Turbopack si compila a la vez. Además `migrate dev` necesita `CREATE` y `ALTER` para su *shadow database*.
- **Tras cambiar el esquema hay que `npx prisma generate`**: el cliente de `src/generated/prisma/` no se actualiza solo.
- **`server-only`**: no está instalado. No añadirlo. `password.ts` no debe tenerlo (lo importa `prisma/seed.ts`).
- **Windows vs Linux**: migraciones con mayúsculas/minúsculas. MariaDB en Linux con `lower_case_table_names=0` distingue caso → usar `QuoteRequest` consistentemente.
- **`JSON.stringify({image: ""})`**: preserva cadena vacía. El esquema debe normalizarla a `undefined`/`null`.
- **Magic bytes primero**: no basta con `Content-Type`. El `upload-validation.ts` comprueba los primeros bytes.
- **PowerShell con `$HOME`**: el wrapper `srv.ps1` tiene trampas. Usar rutas absolutas (`/home/<usuario>/...`) o `exec` directo.
- **Cookie forjada**: la firma HMAC debe verificarse (payload + hmac). No basta con que el payload sea parseable.

## Flujo de trabajo
1. Leer `MEMORY.md` al empezar y comprobar la fase.
2. Si hay spec abierta: leer su `spec.md` y **esperar la aprobación del usuario**. Ninguna spec se implementa sin aprobación escrita.
3. Si cambias lógica de seguridad/autenticación/subidas → añade/actualiza tests.
4. **Test-first**: escribe el test, ejecútalo y **míralo fallar**, luego implementa. Un test que nunca se vio rojo no demuestra nada.
5. Ejecutar `npm run check` (typecheck + lint + test + build).
6. Al terminar, actualizar `MEMORY.md` con estado, decisiones y próximos pasos, y marcar los checkboxes de `tasks.md` **con la nota de verificación**.
7. **Nunca** hacer `git commit`/`push` sin que el usuario lo pida explícitamente.
8. Antes de commitear: barrido de secretos (`docs/PUBLICAR.md` §2). El repo es **público**: un secreto publicado no se quita con un commit posterior.
9. Trabajar en el servidor SSH cuando esté disponible (usar `srv.ps1` con cuidado, evitando las trampas).

## Referencias
- `README.md` — qué es el proyecto, puesta en marcha, stack, límites conocidos
- `MEMORY.md` — **fase actual, decisiones con su porqué, próximos pasos**. Se lee antes que nada
- `CHANGELOG.md` — historial de cambios por versión
- `docs/PUBLICAR.md` — **checklist antes de cada commit**: qué se ignora, barrido de secretos, qué parece secreto y no lo es
- `docs/DEPLOY.md` — runbook del despliegue al servidor, con los errores reales y cómo evitarlos
- `docs/SDD.md` — diseño del sistema: actores, modelo de datos, arquitectura, seguridad, testing
- `docs/THREATS.md` — modelo STRIDE + Top 10 + pendientes justificados
- `docs/DESIGN.md` — paleta (fuente de verdad), contraste medido, lenguaje cartoon
- `docs/GATES.md` — gates, auditoría npm, razones de 8 altas residuales (justificadas)
- `docs/AI.md` — uso responsable de IA: qué se delega en el modelo y qué no
- `specs/001-pingo-rework/`, `specs/002-cartoon-visual/` — **cerradas**, spec/plan/tasks con estado real. Referencia de estilo
- `specs/003-quote-cart-persistence/` — **cerrada y commiteada**. Persistencia del carrito con validación Zod de lo guardado en `localStorage`. Referencia de estilo del patrón "módulo puro + tests sin DOM"
- `specs/006-user-profile/` — **implementada, sin commitear**. Perfil, cambio de contraseña con revocación de sesiones y dos políticas por rol
- `src/lib/auth/session-token.ts` — firma/verificación HMAC + `sv` (versión de sesión) e `isSessionCurrent`
- `src/lib/auth/session.ts` — **`getSession()` no consulta la BD; `getSessionUser()` sí y revoca.** Elegir mal es un agujero o un coste innecesario
- `src/lib/account-schema.ts` — políticas de contraseña por rol (BUYER 8+, ADMIN 12+ con símbolos) y esquemas de cuenta. Puro, sin DOM
- `src/lib/upload-validation.ts` — validación segura de subida
- `src/lib/prisma-error.ts` — mapeo de errores Prisma
- `src/context/QuoteCartContext.tsx` — carrito de cotización. **La carga va en un `useEffect` de montaje, nunca en el inicializador de `useState`**: leer `localStorage` ahí hace que el servidor y el cliente pinten ramas distintas y React tire la hidratación (spec 003, T9). El efecto de escritura va protegido por `cargado`

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
