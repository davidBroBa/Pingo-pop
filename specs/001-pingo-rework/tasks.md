# Tasks: Pingo POP Rework

Estado al 2026-10-03. Cada linea dice con que comando se verifico, o por que queda
pendiente. "Verificado" sin comando no cuenta.

- [x] **T1.** Prisma: `Role` enum (BUYER, ADMIN) + modelo `User`.
  Verificado con `npx prisma generate`: genera `src/generated/prisma/models/User.ts`.
  La migracion queda pendiente de aplicarse: necesita `DATABASE_URL`.

- [x] **T2.** Dependencias: `argon2` (hash) y `zod` (validacion en el borde).
  Verificado con `npm ls argon2 zod`.

- [x] **T3.** Utilidades de auth (`hashPassword`, `verifyPassword`) y seed del admin.
  Verificado con `npm test` (politica de contrasena) y `tsc`. El seed exige
  `ADMIN_EMAIL` y `ADMIN_PASSWORD`; no hay contrasena por defecto en el codigo.

- [x] **T4.** API de login + pagina + proteccion de `/admin/*` y de las APIs.
  Verificado en vivo: `/admin/productos` sin sesion -> 307 a `/login`; con cookie
  `role: ADMIN` falsificada -> 307 a `/login`. POST a products, categories y upload
  -> 401 con y sin cookie falsificada.

- [x] **T5.** Upload seguro: MIME + magic bytes, limite de 5 MB, lista blanca de
  extensiones, nombre aleatorio, sin path traversal.
  Verificado con `tests/upload-validation.test.ts` (11 pruebas, incluido HTML
  disfrazado de JPEG y SVG con `<script>`).

- [x] **T6.** Upload integrado en el panel de productos, con vista previa y reemplazo.
  Verificado con `tsc` y `npm run lint`. El envio real no se ha probado: requiere
  sesion de admin, y a su vez una base de datos.

- [~] **T7.** Rework visual preservando la paleta.
  Lo hecho: los componentes nuevos usan los mismos valores que el resto del codigo
  (`#2A2227`, `#707070`, `#F7B92C`, `#ECECEC`, `#FAFAFA`), y los ficheros que no
  tenian control de estructura se han partido en Server + Client Component.
  Lo que no: no se ha unificado `theme.ts`, que esta muerto (nadie lo importa) y
  contradice a `globals.css`. Se deja como esta; unificarlo es una decision de
  diseno, no un arreglo de seguridad.

- [x] **T8.** Rate limit, cabeceras de seguridad y no enumeracion de cuentas.
  Verificado en vivo: 12 POST al login -> 429 a partir del 9. Las 9 cabeceras
  presentes en la respuesta de `/login`. Mismo 401 exista o no la cuenta.

- [~] **T9.** Verificacion.
  `npm run lint` sin errores. `npm run typecheck` sin errores. `npm test` 65/65.
  `npm run build` compila (15 rutas). `npm audit --audit-level=high`: 8 altas
  residuales, todas en herramientas de build, detalladas en `docs/THREATS.md` seccion 8.
  **El flujo de compra no se ha probado en el navegador: no hay base de datos con
  credenciales.**

- [ ] **T10.** Despliegue local.
  El servidor arranca y responde (`next start -p 3010`, `/login` -> 200). Falta
  conectar la base de datos real para completar migracion, seed y recorrido de compra.
