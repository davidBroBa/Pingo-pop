# Tasks: 010-registro-publico (Registro público de BUYER)

> **Estado:** `cerrada` | **Spec:** [spec.md](spec.md) | **Plan:** [plan.md](plan.md)

## Tareas
- [x] T1. Schema de registro (Zod) con validación BUYER + aceptación obligatoria — `src/lib/register-schema.ts`. Verificación: `npx tsx --test tests/register-schema.test.ts` → 12/12 pass.
- [x] T1b. Migración `userId` en `LegalAcceptance` (D28 confirmada 2026-10-08) — `prisma/schema.prisma` + `prisma/migrations/20261008000000_add_legal_acceptance_user/migration.sql` (SQL generado con `prisma migrate diff`, BD local apagada). Verificación: `npx prisma generate` → generado; se aplica en el servidor con `migrate deploy` en el paso de QA.
- [x] T2. Ruta API /api/auth/register (POST) con rate limit, hash, sesión auto — `src/app/api/auth/register/route.ts`. Transacción User + 2 `LegalAcceptance` con `userId`; carrera de duplicado → 409 vía `describePrismaError`; fallo de BD → 503 + `Retry-After`. Verificación: `npm run check` → EXIT:0.
- [x] T3. Página /registro + RegisterForm (accesible, estados) — `src/app/registro/{page,RegisterForm}.tsx`. Verificación: build muestra `ƒ /registro`.
- [x] T4. Enlace "Crear cuenta" en /login — `src/app/login/LoginForm.tsx`. Verificación: `npm run lint` → 0 problemas.
- [x] T5. Middleware: /registro público sin cambios — matcher es `["/admin/:path*", "/perfil"]` (`src/middleware.ts:66`).
- [x] T6. Seed: primer admin precargado — `prisma/seed.ts` `seedAdmin()` con `ADMIN_EMAIL`/`ADMIN_PASSWORD` de la `.env` (sin secretos en repo). Verificación: lectura de `seed.ts:169`.
- [x] T7. Tests — `tests/register-schema.test.ts` (12 tests: felices, validaciones, aceptación legal). Verificación: `npm run test` → 431 pass / 0 fail.
- [x] T8. README/manual — README límite "No existe registro de BUYER" actualizado; manual de usuario (Escritorio) ampliado con el alta de cuenta.
- [x] T9. Gates — `npm run check` → EXIT:0 (typecheck + lint + 431 tests + build).
- [x] T10. QA manual — navegador: `/login` → "Crear cuenta" → `/registro`; API: 201 + cookie, 409 duplicado, 400 sin casillas (ver notas en MEMORY.md de la fase).
