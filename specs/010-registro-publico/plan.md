# Plan: 010-registro-publico (Registro público de BUYER)

> **Estado:** `implementada` | **Spec:** [spec.md](spec.md) | **Const:** [../../constitution.md](../../constitution.md) | **SDD:** [../../docs/SDD.md](../../docs/SDD.md)

## 1. Objetivo

Añadir registro público para rol BUYER desde /login → /registro, con validación Zod, hash argon2id, sesión automática, rate limit, y guardar LegalAcceptance (TERMINOS/PRIVACIDAD) ligado al usuario mediante la columna nueva `userId`. Admins solo desde panel. Primer admin precargado en seed.

## 2. Archivos tocados

- `src/app/login/LoginForm.tsx` — enlace "Crear cuenta"
- `src/app/registro/page.tsx` y `src/app/registro/RegisterForm.tsx` — página y formulario
- `src/app/api/auth/register/route.ts` — endpoint POST
- `src/lib/register-schema.ts` — schema Zod del registro
- `prisma/schema.prisma` + `prisma/migrations/20261008000000_add_legal_acceptance_user/` — `LegalAcceptance.userId` (D28)
- `prisma/seed.ts` — sin cambios: `seedAdmin()` ya precarga el primer admin
- `src/middleware.ts` — sin cambios: el matcher solo cubre `/admin/*` y `/perfil`
- `tests/register-schema.test.ts` — 12 tests del schema

## 3. Estrategia test-first

1. Schema registro (normalización, BUYER policy, aceptación obligatoria) — hecho, 12 tests
2. API register — verificada por gates y QA curl (feliz 201 + sesión, duplicado 409, validación 400, rate limit 429)
3. UI básica — verificada por build + QA en navegador

## 4. Implementación

- Reutilizar `hashPassword`, `signSession` + `buildSessionPayload` y las cookies con el patrón exacto del login
- Reutilizar `clientKey`, `consume`, `retryAfterSeconds` (mismo patrón que login: 5 por ventana)
- Reutilizar `meetsPasswordPolicy` para BUYER
- Reutilizar `describePrismaError` para la carrera de email duplicado (409) y fallo de BD (503 con `Retry-After`)
- Guardar usuario + 2 `LegalAcceptance` en una transacción

## 5. Verificación

- `npm run check` → typecheck + lint + 431 tests + build, EXIT:0
- QA curl: 201 + cookie, 409 duplicado, 400 validación, 429 rate limit
- QA navegador desde la URL pública
