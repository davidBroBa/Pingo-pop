# AGENTS.md — Pingo POP

## Propósito
Este fichero define las reglas operativas y trampas para trabajar en **Pingo POP**. Es la referencia local del proyecto: lo que no esté aquí, no debe asumirse.

## Comandos (local y servidor)
- `npm run dev` — desarrollo (puerto 3000)
- `npm run build` — build de producción
- `npm run start` — ejecuta build (`next start -p 3000`)
- `npm run lint` — ESLint
- `npm run test` — `node --import tsx --test "tests/**/*.test.ts"` (82 tests, 10 suites)
- `npm run validate` — valida `src/data/*.json` (no usado actualmente)
- `npm run typecheck` — `tsc --noEmit`
- `npm run check` — typecheck + lint + test + build (ideal antes de subir)

## Estructura
- `src/app/` — App Router de Next.js 16
- `src/app/api/` — rutas API (Zod en borde, 401/403 por rol, rate limit donde aplica)
- `src/components/` — componentes co-ubicados con su `.css`
- `src/lib/` — lógica reutilizable: `auth/`, `prisma.ts`, `env.ts`, `validation.ts`, `quote-schema.ts`, `upload-validation.ts`, `rate-limit.ts`, `prisma-error.ts`
- `src/lib/auth/` — `password.ts` (argon2id), `session-token.ts` (HMAC-SHA256, base64url), `require-admin.ts` (guard servidor), `session.ts` (lectura de cookie)
- `src/middleware.ts` — protección de `/admin/:path*`
- `src/generated/prisma/` — cliente Prisma generado (no editar)
- `prisma/` — schema, migraciones, `seed.ts`
- `tests/` — 10 suites con `node:test` + `tsx` (sin dependencias nuevas)
- `public/uploads/products/` — imágenes subidas por admin (nombres aleatorios, `.gitkeep` versionado)

## Principios innegociables
- **Paleta: núcleo preservado + extensión cartoon (spec 002).** El **núcleo original** se mantiene como ancla de marca: `#F7B92C` (accent), `#2A2227` (ink), `#707070` (muted), `#ECECEC` (border), `#FAFAFA` (card), `#fcfcfc`, `#ffffff`. Desde la spec `002-cartoon-visual` se **amplía** con colores de apoyo cartoon (rosa, cielo, menta, lavanda, coral, crema) documentados en `docs/DESIGN.md`, que es la **única fuente de verdad** de la paleta. Prohibido inventar hex fuera de `docs/DESIGN.md`; prohibido alterar los hex del núcleo.
- **Secretos nunca en repo.** `.env` ignorado; `.env.example` sí. Nunca committear `.env*` real.
- **Nada de datos de infraestructura en ficheros publicables.** Sin IPs de servidor, sin nombres de usuario, sin rutashome absolutas: se usa el alias SSH `srv`. Las excepciones vivas van en la `.env` del servidor.
- **Capturas: nada de `/admin/*` ni de sesión iniciada** en un repo público (el panel enseña el catálogo real y cualquier token queda congelado en la imagen). Antes de publicar, revisar `docs/PUBLICAR.md`.
- **No enumeración de usuarios.** Mismo 401 ante credenciales incorrectas o usuario inexistente. Ver `src/app/api/auth/login/route.ts`.
- **Defence in depth.** Middleware + `requireAdmin()` en servidor. Nunca confiar solo en UI/middleware.
- **Uploads seguros.** Solo JPEG/PNG/WebP. **Magic bytes** obligatorios. Máx 5 MiB. Nombre `randomBytes(16).hex` + extensión válida. Escritura con `flag: "wx"`. Ruta validada con regex estricta.
- **Entradas validadas con Zod** en el borde. `imagePath` acepta `""`/espacios → `null` (preprocess) para evitar 400 en formularios.
- **Errores Prisma mapeados.** Usar `describePrismaError` → 400/404/409/422 para fallos del cliente, 500 + log para fallos reales.
- **Cero secretos loggeados.** Nunca imprimir `DATABASE_URL`, hash, tokens o contraseñas.
- **Test-first cuando se añade lógica crítica.** Tests en `tests/` con `node:test`.

## Trampas a evitar
- **`force-dynamic`**: debe ir en el **`page.tsx`**, no en componentes. Rutas `/admin/*` deben ser dinámicas.
- **`server-only`**: no está instalado. No añadirlo. `password.ts` no debe tenerlo (lo importa `prisma/seed.ts`).
- **Windows vs Linux**: migraciones con mayúsculas/minúsculas. MariaDB en Linux con `lower_case_table_names=0` distingue caso → usar `QuoteRequest` consistentemente.
- **`JSON.stringify({image: ""})`**: preserva cadena vacía. El esquema debe normalizarla a `undefined`/`null`.
- **Magic bytes primero**: no basta con `Content-Type`. El `upload-validation.ts` comprueba los primeros bytes.
- **PowerShell con `$HOME`**: el wrapper `srv.ps1` tiene trampas. Usar rutas absolutas (`/home/<usuario>/...`) o `exec` directo.
- **Cookie forjada**: la firma HMAC debe verificarse (payload + hmac). No basta con que el payload sea parseable.

## Flujo de trabajo
1. Leer `MEMORY.md` al empezar.
2. Si cambias lógica de seguridad/autenticación/subidas → añade/actualiza tests.
3. Ejecutar `npm run check` (typecheck + lint + test + build).
4. Al terminar, actualizar `MEMORY.md` con estado, decisiones y próximos pasos.
5. **Nunca** hacer `git commit`/`push` sin que el usuario lo pida explícitamente.
6. Trabajar en el servidor SSH cuando esté disponible (usar `srv.ps1` con cuidado, evitando las trampas).

## Referencias
- `README.md` — qué es el proyecto, puesta en marcha, stack, límites conocidos
- `CHANGELOG.md` — historial de cambios por versión
- `docs/PUBLICAR.md` — **checklist antes de publicar el repo**: qué se ignora, barrido de secretos, qué parece secreto y no lo es
- `docs/DEPLOY.md` — runbook del despliegue al servidor, con los errores reales y cómo evitarlos
- `docs/THREATS.md` — modelo STRIDE + Top 10 + pendientes justificados
- `docs/DESIGN.md` — paleta (fuente de verdad), contraste medido, lenguaje cartoon
- `specs/001-pingo-rework/` y `specs/002-cartoon-visual/` — spec, plan, tasks con estado real
- `docs/GATES.md` — gates, auditoría npm, razones de 8 altas residuales (justificadas)
- `src/lib/auth/session-token.ts` — firma/verificación HMAC
- `src/lib/upload-validation.ts` — validación segura de subida
- `src/lib/prisma-error.ts` — mapeo de errores Prisma

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
