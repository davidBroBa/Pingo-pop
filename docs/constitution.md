# constitution.md — Pingo POP

## Principios fundamentales (no negociables)

1. **Seguridad por diseño.** Todo endpoint que escribe pasa por `requireAdmin()` en servidor. Middleware es primera línea, no única. Firma HMAC en sesiones. Sin enumeración de usuarios.
2. **Entrada siempre validada.** Zod en el borde. Validación estructural + semántica. Nunca confiar en datos de cliente.
3. **Subidas seguras.** Magic bytes + lista blanca (JPEG/PNG/WebP) + tamaño ≤ 5 MiB + nombres aleatorios + path traversal bloqueado + escritura atómica.
4. **Secretos fuera del repo.** `.env` nunca commiteado. `.env.example` completo y sin secretos reales.
5. **Paleta: núcleo + extensión documentada.** El núcleo original (`#F7B92C`, `#2A2227`, `#707070`, `#ECECEC`, `#FAFAFA`, `#fcfcfc`, `#ffffff`) no se altera. La extensión cartoon (spec 002) añade colores de apoyo, todos documentados en `docs/DESIGN.md`. Ningún hex fuera de ese documento.
6. **Minimizar superficie.** Menor complejidad = menor ataque. No añadir dependencias sin justificación escrita.
7. **Test-first para seguridad.** Tests unitarios para `session-token`, `rate-limit`, `upload-validation`, `validation`, `prisma-error`.
8. **Cero exposición de errores internos.** Mensajes al cliente genéricos cuando corresponda; errores reales solo se loggean servidor-side.
9. **Compatibilidad Windows→Linux tenida en cuenta.** Migraciones con casing correcto. Evitar asunciones de FS case-insensitive.

## Arquitectura
- Next.js 16 (App Router)
- Prisma + MySQL/MariaDB (`@prisma/adapter-mariadb`)
- argon2id para contraseñas
- Web Crypto (`crypto.subtle`) para HMAC-SHA256
- `node:test` + `tsx` para tests

## Decisiones duras
- **No tokens CSS unificados**: preservar hex literal por convención histórica y para evitar romper todo el sitio.
- **Rate limit en memoria**: aceptado por single-node. Documentado.
- **No `server-only`**: decisión pragmática (no instalado, seed necesita `password.ts`).
