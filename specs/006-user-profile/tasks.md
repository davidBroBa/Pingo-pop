# Tasks: Pingo POP — Perfil de cuenta y cambio de contraseña (006-user-profile)

> Spec aprobada por el usuario (con las decisiones D1–D7 ya fijadas). **Test-first**:
> cada test se escribe y se ve fallar antes de escribir el código que lo hace pasar.

## F1 — Módulo puro de cuenta (tests primero)

- [x] **T1** — `tests/account-schema.test.ts` con la matriz de las dos políticas y del
  `name`, **escrito y ejecutado ANTES que el módulo**.
  Verificado: `npm run test` → `Cannot find module '../src/lib/account-schema'`,
  **exit 1**, 107 pass / 1 fail.
- [x] **T2** — `src/lib/account-schema.ts`: `passwordPolicyProblems(password, role)`
  devuelve un array de problemas (vacío = válida), `UpdateProfileSchema` y
  `ChangePasswordSchema`. Reutiliza `hasControlChars` de `src/lib/control-chars.ts`.
  Verificado: `npm run test` → todo verde; `npm run typecheck` y `npm run lint` exit 0.

## F2 — La columna que habilita la revocación

- [x] **T3** — `User.sessionVersion Int @default(0)` en `prisma/schema.prisma` +
  migración. Ojo al nombre de la tabla: en Linux es `User`, no `user`.
  Verificado: migración `20261006023952_add_session_version` aplicada;
  `prisma migrate status` → "Database schema is up to date!"; la columna existe en la
  BD local con `default 0`.
  **Dos cosas que solo aparecen al hacerlo:**
  - `prisma migrate dev` necesita **CREATE y ALTER** para su *shadow database*, y el
    usuario `pingo` no los tenía (P3014). Concedidos **solo en la BD local**.
  - Tras cambiar el esquema hay que **reiniciar el dev server**: con el cliente viejo en
    memoria sale `Unknown field 'sessionVersion'`. Y `npm run build` hace panic de
    Turbopack si el dev server compila a la vez.

## F3 — La sesión sabe si está vigente

- [x] **T4** — `session-token.ts`: `sv` en `SessionPayload`, validado como entero
  `>= 0`, **ausente → 0**; `buildSessionPayload` lo recibe como parámetro obligatorio.
  Verificado: `tests/session-token.test.ts` ampliado y en verde; **los 107 tests
  previos sin tocar siguen pasando**.
- [x] **T5** — `tests/session-revocation.test.ts` (nuevo) para la función pura
  `isSessionCurrent(sv, userSv)`, **escrito y en rojo antes** de implementarla.
- [x] **T6** — `isSessionCurrent` en `src/lib/auth/session-token.ts`, `getSessionUser()`
  en `src/lib/auth/session.ts` (compara contra la BD) y `require-admin.ts` usándola.
  Verificado: tests verdes; typecheck y lint exit 0.

## F4 — Los endpoints

- [x] **T7** — `PATCH /api/account/profile`: solo `name`, con sesión válida, sin tocar
  el `email` ni el hash. Verificado: en navegador se guarda y se ve al recargar.
- [x] **T8** — `POST /api/account/password`: actual + nueva + confirmación; comprueba la
  actual (401 genérico), que sea distinta, la política del rol (400 con el motivo),
  incrementa `sessionVersion`, borra la cookie y devuelve el aviso de reingresar.
  Rate limit como el login.
  Verificado en navegador: contraseña actual incorrecta → 401; contraseña corta → 400
  con el motivo; correcta →cookie borrada y redirección a `/login`.
- [x] **T9** — **La prueba que de verdad importa**: con la cookie **anterior** al
  cambio, pedir el panel y un endpoint de admin. Debe responder 401/403.
  Verificado en navegador, con el valor de la cookie anterior registrado antes.

## F5 — La página

- [x] **T10** — `/perfil` protegida (middleware + `getSessionUser()`): datos de la
  cuenta, edición de `name`, **cerrar sesión para cualquier rol**, y el bloque extra
  de ADMIN (id, rol, `createdAt`, `updatedAt`, sesión actual). **Nunca** el hash.
  Verificado en navegador con BUYER y con ADMIN.
- [x] **T11** — Enlaces: "Mi perfil" en el navbar con sesión, y junto a "Cerrar
  sesión" en el panel.
  Verificado: los dos enlaces llevan a `/perfil`.

## F6 — El admin local

- [x] **T12** — Cambiar la contraseña del admin local a una que cumpla la política
  estricta, en `.env` (nunca en el repo) y relanzar el seed.
  Verificado: login con la nueva → 200; con la anterior → 401.

## F7 — Cierre

- [x] **T13** — `npm run check` completo → **exit 0**, **151/151 tests en 20 suites**,
  build OK con 16 rutas (`/perfil` sale como `ƒ` dinámica y `/contacto` sigue como `○`
  estática).
- [x] **T14** — Documentación: `MEMORY.md` (decisiones y trampas, **100 líneas**),
  `CHANGELOG.md`, `docs/SDD.md` (sesiones y revocación), `README.md` §Límites.

## El cambio de `MainLayout` que no estaba en el plan

Al pasar `haySesion` al navbar, `MainLayout` tenía que leer cookies para saberlo. Al
hacerlo `async`, el build falló: **`/contacto` y `/novedades` se prerenderizan como
HTML estático y ahí no hay `cookies()` disponible**. La solución fue mover la responsabilidad a quien ya es dinámica (`/perfil`) y que el
layout reciba la información como propiedad, manteniendo el layout síncrono. Está anotado en `MEMORY.md` porque es el tipo de
acoplamiento que vuelve a aparecer.

## Verificación real de la revocación (T9), medida

| Prueba | Resultado |
|---|---|
| Cookie emitida con `sv: 0` y BD con `sessionVersion: 0` | Coincide, el panel responde |
| Cambio de contraseña correcto | **200**, cookie borrada, `sessionVersion` → 1 |
| **La cookie anterior** contra `PATCH /api/account/profile` | **401 No autenticado** (revocada) |
| Login con la contraseña vieja | **401** |
| Login con la nueva | **200 ADMIN** |
| Contraseña actual incorrecta | 401 con texto genérico |
| Nueva igual a la actual | 400 |
| Admin sin signo de puntuación | 400 con el motivo concreto |
| Confirmación distinta | 400 |
| `PATCH` con `email` de más | 400 (`strict()` lo rechaza) |
| Perfil de BUYER | Sin bloque de admin, política de 8 caracteres |
| Perfil de ADMIN | Con bloque de admin, **sin hash en el HTML** |
| Guardar el nombre | 200 y persiste tras recargar |

## Fuera de esta spec

- **007:** crear administradores desde `/admin/usuarios` (decidido por el usuario).
- Recuperación de contraseña por correo (no hay servicio de correo saliente).
- Editar el `email`, avatar, y listar sesiones activas.

## Límites conocidos que deja

- Una cookie revocada todavía puede renderizar el *shell* de `/admin` (el middleware
  corre en Edge y no consulta la BD); el 401/403 llega al pedir datos. Documentado en
  `README.md` §Límites conocidos y en `docs/SDD.md`.
