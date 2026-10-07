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
- `User` (id, email único, passwordHash, role enum BUYER|ADMIN, name, sessionVersion, timestamps)
- `Category` (id, slug único, name, description?, image?, timestamps)
- `Product` (id, slug único, name, description?, price Decimal(10,2), image?, featured, active, categoryId FK, timestamps)
- `QuoteRequest` (id, name, email?, phone, details, status, items, timestamps)
- `QuoteRequestItem` (id, quoteRequestId FK, productId FK, quantity, timestamps)
- `SiteSettings` (**id fijo a 1**, heroImage?, timestamps). Es una **única fila**, no una tabla de configuraciones: el id fijo y el `upsert` de `src/lib/site-settings.ts` son lo que impiden crear una fila nueva en cada guardado y acabar leyendo un valor al azar. Si algún día hay más ajustes, se **añaden columnas aquí**, no filas

## 5. Arquitectura
- **Frontend**: React + Next.js 16 App Router, CSS co-ubicado
- **Backend/API**: Route Handlers en `src/app/api/*`
- **Auth**: `argon2` + `crypto.subtle` HMAC-SHA256 + cookie `HttpOnly`, `SameSite=Lax`, `Secure` en producción
- **Storage**: **dos carpetas** públicas, servidas estáticas por Next
  - `public/uploads/products/` → imágenes de **productos y categorías**. Validadas por `imagePath`, regex `^/uploads/products/[a-f0-9]{32}\.(jpg|png|webp)$`
  - `public/uploads/site/` → imágenes de **ajustes del sitio** (la foto del hero). Validadas por `siteImagePath`, regex `^/uploads/site/[a-f0-9]{32}\.(jpg|png|webp)$`
  - Son esquemas **aparte a propósito**: el hero no es un producto y no puede apuntar a la carpeta del catálogo, y ensuciar `imagePath` para que valieran las dos formas en todas partes lo convertiría en "cualquier ruta bajo `/uploads/`"
- **DB**: Prisma con `@prisma/adapter-mariadb`. Config desde `DATABASE_URL` vía `src/lib/env.ts`
- **Cliente**: el carrito de cotización vive en `localStorage` (`pingo-quote-cart`) y se hidrata en `QuoteCartProvider`. Como el navegador controla ese contenido, se valida con esquema Zod en `src/lib/quote-cart-storage.ts` y se descarta entero ante cualquier fallo; los límites coinciden con los del servidor (cantidad 1–10000, 50 productos)

## 6. Seguridad
- Middleware (`src/middleware.ts`) protege `/admin/:path*` y `/perfil` → redirige `/login` si sin sesión válida. Solo exige ADMIN en `/admin/*`; `/perfil` es de cualquier usuario con sesión
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
2. POST `/api/admin/upload` con archivo JPEG/PNG/WebP válido y `target` (`products` por defecto, o `site`) → devuelve `{ url: "/uploads/<carpeta>/<hex32>.<ext>", mime, bytes }`, guarda en disco con `wx`. Un `target` que no sea una clave de `UPLOAD_TARGETS` es **400**, no un `default` que se trague lo que venga
3. POST `/api/products` con `{ ..., image: url }` validado por `imagePath`, **o** POST `/api/categories` validado por el mismo → Prisma crea producto o categoría
4. GET `/uploads/<carpeta>/<hex32>.<ext>` sirve archivo estático

**Foto del hero:**
1. `POST /api/admin/upload` con `target: "site"` → ruta bajo `/uploads/site/`
2. `PATCH /api/admin/site` con `{ heroImage }` validado por `siteImagePath` → `upsert` sobre `SiteSettings.id = 1`. Sin fila previa, el `upsert` la crea: **no hay paso de siembra** que se pueda olvidar
3. La portada lo lee con `readHeroImage()`, que es **tolerante a fallos**: si la BD cae devuelve `null` y sale el `Pingo` de reserva, porque un ajuste del sitio no puede dejar la web sin pintar

**Editar una categoría:**
1. `PATCH /api/categories/[id]` → `requireAdmin()`, luego `UpdateCategorySchema`, que **no acepta `slug`**: es la URL pública y cambiarla dejaría enlaces muertos
2. Si el nombre nuevo deriva a un slug que pertenece a **otra** categoría → **409**
3. `P2025` sale como **404** por `describePrismaError`. **No hay ruta de borrado**: las categorías tienen productos asociados

**Cambio de contraseña (revocación):**
1. `POST /api/account/password` con actual + nueva + confirmación, con sesión vigente
2. Se verifica la actual contra el hash; 401 genérico si falla (no enumera cuentas)
3. Se comprueba la política **del rol**: BUYER 8+ sin complejidad, ADMIN 12+ con
   mayúscula, minúscula, dígito y puntuación
4. Un solo `update`: `passwordHash` nuevo **y** `sessionVersion: { increment: 1 }`, para
   que no puedan quedar separados
5. Se borra la cookie (`maxAge: 0`) y se avisa de que hay que entrar de nuevo

Como `sv` viaja dentro de la cookie firmada, **toda cookie emitida antes queda en una
versión anterior y deja de valer** en cuanto se compara con la base de datos. Cierran
también las demás sesiones abiertas, no solo la del dispositivo que hace el cambio.

**Dos formas de leer la sesión, y no son intercambiables:**

| Función | Consulta la BD | Para qué |
|---|---|---|
| `getSession()` | No | Decidir qué enlace mostrar; validar firma y caducidad |
| `getSessionUser()` | **Sí** | Cualquier decisión de seguridad: revoca y relee el rol |

El **middleware corre en Edge y no tiene Prisma**, así que nunca revoca: solo comprueba
firma. Por eso una cookie revocada todavía puede renderizar el *shell* de `/admin`, y el
`401`/`403` llega al pedir datos. Es un límite conocido, no un descuido.

## 8. IA / Automatización
**Uso de IA:** asistente para refactor, tests, documentación y correcciones. Decisiones de seguridad validadas con tests. No se delegó la firma HMAC ni la validación de subida a prompts no verificados. Todo cambio crítico con tests primero.

## 9. Testing
- `node:test` + `tsx`
- Suites: `session-token` (firma/verificación/expiración/tamper/**versión de sesión**), `session-revocation` (matriz de vigencia), `rate-limit` (memoria, ventana), `upload-validation` (magic bytes, whitelist, tamaño), `validation` (Zod + control chars + image ""), `prisma-error` (mapeo códigos), `quote-cart-storage` (carrito guardado), `account-schema` (**las dos políticas de contraseña** + esquemas de cuenta), y las de la spec 009: `consent` (registro, decisiones, RF-17), `legal-versions` (documentos, huellas, tokens), `legal-data` (campos legales, marcador), `legal-texto` (negritas, textos reales), `retention` (vencidas, estadios terminales), `quote-idempotency` (token único, rate limit, extracción de IP), `sesion-temporal` (swc compartido por proxy y `requireAdmin`), `usuarios` + `usuarios-panel` (esquemas y etiquetas del panel)
- **Sin jsdom**: la lógica comprobable se extrae a módulos puros de `src/lib/` sin acceso al DOM. Por eso existen `quote-cart-storage.ts` y `account-schema.ts` separados de los componentes de React, que solo hidratan y coordinan
- 419/419 passing (77 suites)

## 10. Despliegue
- Build con `npm run build` (requiere `DATABASE_URL`, `SESSION_SECRET`)
- `npm run start` en servidor Linux
- MariaDB 11 con usuario dedicado (`pingo`) solo sobre `pingo_pop`
- `public/uploads/products/` y `public/uploads/site/` deben persistir entre despliegues
- `.env` no versionado

## 11. Riesgos y mitigaciones
| Riesgo | Mitigación |
|---|---|
| Falsificación de sesión | HMAC-SHA256 + verificación estricta + `sv` contrastado con la BD |
| Path traversal en upload | Nombre aleatorio + regex de ruta + escritura `wx` |
| Enumeración usuarios | Respuesta idéntica + `DUMMY_HASH` |
| FK inexistente → 500 | `describePrismaError` (P2003→422) |
| image "" rompe formulario | Preprocess Zod a ausencia |

## 12. Estado
Completo: auth, roles, subida segura, protección admin, rate limit, validación, mapeo errores, migraciones corregidas, tests 82/82, gates OK.
