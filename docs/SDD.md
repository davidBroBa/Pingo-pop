# SDD.md — Software Design Document (Pingo POP)

> Versión 1.0 (Octubre 2026). Escrito tras las correcciones de seguridad y migraciones.

## 1. Objetivo
Sistema web para mostrar catálogo, solicitar cotizaciones y gestionar productos/categorías con roles BUYER/ADMIN. Requisitos cumplidos: autenticación con contraseñas hasheadas (argon2id), sesiones firmadas con HMAC-SHA256, subida segura de imágenes, protección de rutas `/admin/*`, rate limiting, validación en borde, mapeo de errores Prisma.

## 2. Alcance
- Catálogo público (`/`, `/products`, `/products/[slug]`, `/contacto`, `/novedades`, `/cotizacion`)
- Autenticación (`/login`, POST `/api/auth/login`, POST `/api/auth/logout`)
- Administración (`/admin/productos`, `/admin/categorias`) — solo ADMIN
- APIs: productos, categorías (lectura pública; escritura ADMIN), upload (ADMIN), quotes (público con rate limit)
- Base de datos MySQL/MariaDB con Prisma

## 3. Actores
- **BUYER**: visitante autenticado sin privilegios de escritura. Solo lectura de catálogo, envío de cotizaciones.
- **ADMIN**: gestiona productos/categorías, sube imágenes.
- **Anónimo**: catálogo + cotización pública (limitada).

## 4. Modelo de datos
Ver `prisma/schema.prisma`. Entidades:
- `User` (id, email único, passwordHash, role enum BUYER|ADMIN, name, timestamps)
- `Category` (id, slug único, name, description?, timestamps)
- `Product` (id, slug único, name, description?, price Decimal(10,2), image?, featured, active, categoryId FK, timestamps)
- `QuoteRequest` (id, name, email?, phone, details, status, items, timestamps)
- `QuoteRequestItem` (id, quoteRequestId FK, productId FK, quantity, timestamps)

## 5. Arquitectura
- **Frontend**: React + Next.js 16 App Router, CSS co-ubicado
- **Backend/API**: Route Handlers en `src/app/api/*`
- **Auth**: `argon2` + `crypto.subtle` HMAC-SHA256 + cookie `HttpOnly`, `SameSite=Lax`, `Secure` en producción
- **Storage**: `public/uploads/products/` (archivos estáticos servidos por Next)
- **DB**: Prisma con `@prisma/adapter-mariadb`. Config desde `DATABASE_URL` vía `src/lib/env.ts`
- **Cliente**: el carrito de cotización vive en `localStorage` (`pingo-quote-cart`) y se hidrata en `QuoteCartProvider`. Como el navegador controla ese contenido, se valida con esquema Zod en `src/lib/quote-cart-storage.ts` y se descarta entero ante cualquier fallo; los límites coinciden con los del servidor (cantidad 1–10000, 50 productos)

## 6. Seguridad
- Middleware (`src/middleware.ts`) protege `/admin/:path*` → redirige `/login` si sin sesión válida
- `requireAdmin()` revalida firma + rol → 401/403
- Login: comparación con `argon2.verify`; mismo 401 ante fallo
- Sesión: TTL 8h, firma del payload completo
- Upload: magic bytes + whitelist MIME/ext + tamaño ≤ 5 MiB + nombre aleatorio (`[a-f0-9]{32}.{ext}`)
- Rate limit: 10 login/15min, 5 quotes/15min (memoria)
- Headers de seguridad: CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, HSTS, COOP, CORP, X-DNS-Prefetch-Control (`next.config.ts`)
- Validación Zod estricta; `imagePath` regex acotada

## 7. Flujo crítico
**Subida + alta de producto (ADMIN):**
1. POST `/api/auth/login` → cookie firmada
2. POST `/api/admin/upload` con archivo JPEG/PNG/WebP válido → devuelve `{ url: "/uploads/products/<hex32>.<ext>", mime, bytes }`, guarda en disco con `wx`
3. POST `/api/products` con `{ ..., image: url }` validado por `imagePath` → Prisma crea producto
4. GET `/uploads/products/<hex32>.<ext>` sirve archivo estático

## 8. IA / Automatización
**Uso de IA:** asistente para refactor, tests, documentación y correcciones. Decisiones de seguridad validadas con tests. No se delegó la firma HMAC ni la validación de subida a prompts no verificados. Todo cambio crítico con tests primero.

## 9. Testing
- `node:test` + `tsx`
- Suites: `session-token` (firma/verificación/expiración/tamper), `rate-limit` (memoria, ventana), `upload-validation` (magic bytes, whitelist, tamaño), `validation` (Zod + control chars + image ""), `prisma-error` (mapeo códigos), `quote-cart-storage` (carrito guardado: corrupto, enorme, fuera de límites)
- **Sin jsdom**: la lógica comprobable se extrae a módulos puros de `src/lib/` sin acceso al DOM. Por eso `quote-cart-storage.ts` existe separado del contexto de React, que solo se limita a hidratar y a un efecto de escritura
- 107/107 passing

## 10. Despliegue
- Build con `npm run build` (requiere `DATABASE_URL`, `SESSION_SECRET`)
- `npm run start` en servidor Linux
- MariaDB 11 con usuario dedicado (`pingo`) solo sobre `pingo_pop`
- `public/uploads/products/` debe persistir entre despliegues
- `.env` no versionado

## 11. Riesgos y mitigaciones
| Riesgo | Mitigación |
|---|---|
| Falsificación de sesión | HMAC-SHA256 + verificación estricta |
| Path traversal en upload | Nombre aleatorio + regex de ruta + escritura `wx` |
| Enumeración usuarios | Respuesta idéntica + `DUMMY_HASH` |
| FK inexistente → 500 | `describePrismaError` (P2003→422) |
| image "" rompe formulario | Preprocess Zod a ausencia |

## 12. Estado
Completo: auth, roles, subida segura, protección admin, rate limit, validación, mapeo errores, migraciones corregidas, tests 82/82, gates OK.
