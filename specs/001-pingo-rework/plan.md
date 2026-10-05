# Plan: Pingo POP Rework

## Fases
1. Datos: Agregar modelo User (id, email unique, passwordHash, role enum BUYER/ADMIN, createdAt). Migracion Prisma.
2. Auth: Utils hash/verify (argon2 o bcrypt), session/cookie segura, middleware /admin, login page/API, crear admin inicial (script seguro).
3. Upload: API /api/upload o integrado a productos con validacion (MIME+magic bytes, size, ext whitelist, random name, no traversal). Guardar en public/uploads/products/.
4. Admin productos: Form con file input + preview, integracion con upload/POST producto.
5. Rework visual: Unificar tokens (globals.css + theme.ts), preservar colores exactos, actualizar componentes UI (Button/Card/Input/Badge/Typography) + layout.
6. Seguridad: Zod validation, rate limit basico, evitar enumeracion auth, revisar headers.
7. Verificacion: lint + build. Despliegue local dev.
