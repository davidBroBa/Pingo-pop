# Tareas — 007-crear-usuarios

> Spec: `spec.md`. Plan: `plan.md`. Regla: **el test primero y visto en rojo.**
> `[ ]` = sin hacer. Cada casilla lleva su **NOTA DE VERIFICACIÓN** al cerrarla.
> **Una casilla no se marca sin su nota.** Un PASS nunca se infiere.

---

## F0 — La migración · **prerrequisito duro de F1 a F5**

Sin esto no se puede compilar: el cliente de `src/generated/prisma/` no conoce las dos
columnas y **toda** consulta sale `Unknown field`.

- [x] **T1** — `<ts>_add_usuario_estado`, **una sola migración** con las **dos** columnas
  `debeCambiarContrasena Boolean @default(false)` y `activo Boolean @default(true)`
  (plan §1). **Generada con `migrate diff --from-config-datasource --to-schema`** y
  **SQL revisado a ojo antes de aplicar**: solo dos `ADD COLUMN`, ni un `DROP` ni un
  `ALTER` de columna existente. **Prohibido** `migrate dev` a pelo (pide `CREATE` y
  `ALTER` para su *shadow database* y hay datos) y **prohibido** `migrate reset` (borra).
  **Los `DEFAULT` no son opcionales**: `STRICT_TRANS_TABLES` falla al añadir un `NOT NULL`
  sin defecto a una tabla con filas.
  **Hecho cuando:** `SELECT COUNT(*) FROM User` **antes** (anotar N) y **después** =
  **N**; y en toda cuenta que ya existía: **`activo = 1`** y
  **`debeCambiarContrasena = 0`** — comprobado y **no supuesto**. Los dos valores no
  son simétricos: `activo` nace a `true` porque esas cuentas **estaban** activas, y
  `debeCambiarContrasena` nace a `false` porque a nadie se le estaba exigiendo
  cambiar una contraseña. Este criterio decía antes "0 en las dos", lo cual además de
  estar mal haría que alguien "arreglara" el estado con un `UPDATE` y **desactivara
  las tres cuentas del sitio**, incluida la de administración.
  `npx prisma migrate status` → **up to date** con **9 migraciones**; `npx prisma
  generate` → exit 0; dev server **reiniciado** y sin `Unknown field`; `git diff` del
  `migration.sql` = solo lo que generó Prisma.

    **NOTA DE VERIFICACIÓN — HECHA.** SQL revisado a ojo antes de aplicarlo: **un solo
  `ALTER TABLE`** con **dos `ADD COLUMN`**, ni un `DROP` ni un `ALTER` de columna
  existente. `npx prisma migrate status` -> **9 migraciones, up to date**. `SELECT COUNT(*)
  FROM User` = **3 antes y 3 despues**. Y las dos columnas de toda cuenta previa:
  `activo = 1` y `debeCambiarContrasena = 0`, comprobado con `SELECT`.
  `npx prisma generate` -> exit 0, y el cliente generado ya trae `debeCambiarContrasena` y
  `activo`. **Correccion de este mismo criterio**: decia "0 en las dos", lo cual era el
  contrario de lo correcto para `activo`, y habria llevado a alguien a hacer un `UPDATE`
  para "arreglarlo" que habria **desactivado las tres cuentas**, incluida la de
  administracion. El criterio se corrigio **antes** de aplicar, por eso no paso nada.

---

## F1 — Lo puro · `src/lib/usuarios.ts`

- [x] **T2** — **Primero el test, y verlo en rojo.** `tests/usuarios.test.ts` (nuevo), con
  al menos: (1) `normalizarEmail` baja a minúsculas y recorta; (2) `""` y `"   "` son
  ausencia y el esquema los acepta como ausentes; (3) `"ana@x.com"` y `"ANA@x.com"`
  son **la misma** cuenta; (4) correo mal formado → inválido; (5) una contraseña de 8
  caracteres **no** cumple la política de `ADMIN` y **sí** la de `BUYER`; (6) una de 12
  sin símbolos **no** cumple la de `ADMIN`; (7) la contraseña se valida **con el rol que
  llega**, no con uno fijo; (8) un rol inventado → inválido; (9)
  `CambioUsuarioSchema` acepta las **cuatro** acciones; (10) `"cualquiera"` → inválido;
  (11) `textoConfirmacion` menciona el correo y dice que corta el acceso, en las acciones
  que lo cortan.
  **Rojo esperado:** `Cannot find module '../src/lib/usuarios'`.
  Solo entonces el módulo (plan §2). **El rol se valida contra el enum del cliente
  generado**, igual que `QuoteStatus` en `api/admin/quotes`.
  **Hecho cuando:** la suite en verde y el recuento global en verde; typecheck y lint →
  exit 0.

    **NOTA DE VERIFICACIÓN — HECHA, PERO AMPLIADA.** El modulo se partio en **dos**
  (`usuarios.ts` de servidor y `usuarios-panel.ts` para el navegador) al destaparse el
  panic de Turbopack; eso se recounts en T14. Rojo visto: `Cannot find module
  '../src/lib/usuarios'`, 379 tests / 1 fail. Verde final: la suite de `usuarios` y el
  recuento global. typecheck 0 y lint 0.
  **Un fallo mio de test, no de codigo**: el bucle "acepta las cuatro acciones" pasaba
  `{ id, accion }` a secas y otro test afirmaba que `cambiar_rol` sin `rol` **no** pasa. Los dos
  tests se contradecian; se corrigio el bucle, no la regla.
  **Un fallo de diseno mio, corregido antes de seguir**: `CambioUsuarioSchema` validaba la
  contrasena de `restablecer_contrasena` contra un rol por defecto (`"BUYER"`), y el rol real
  solo se sabe tras leer la cuenta. Habria dejado restablecer la contrasena de un ADMIN
  con la politica de un BUYER, que es justo el fallo que D21 viene a cerrar. Ahora el
  esquema solo exige que la contrasena **venga**, y `compruebaContrasena(contrasena,
  cuenta.role)` la valida en la ruta, ya con el rol leido.

---

## F2 — La sesión · **lo más delicado de la spec**

> ⚠️ Un error aquí **cierra el panel entero** para todos. Los tests de
> `session-token.test.ts` y `session-revocation.test.ts` son la red: se corren **antes**
> y **después**.

- [x] **T3** — **Primero el test, y verlo en rojo**, en `tests/session-token.test.ts`
  (se amplía, no se crea): (1) `buildSessionPayload` **firma** `swc`; (2) un token con
  `swc: 1` sobrevive a `verifySession` con `swc: 1`; (3) **`swc` ausente se verifica
  como `0`**, no se rechaza — una cookie emitida antes del despliegue debe seguir
  valiendo; (4) `swc` con valor **negativo** o no entero se rechaza, igual que `sv`;
  (5) **un `swc` editado a mano no verifica**, porque el token va firmado.
  Luego `src/lib/auth/session-token.ts` (plan §3): `swc: number` en `SessionPayload`,
  parámetro en `buildSessionPayload`, lectura tolerante en `verifySession`.
  **Hecho cuando:** los tests nuevos en rojo antes y en verde después; **todos** los
  antiguos de `session-token` y `session-revocation` siguen en verde; typecheck y lint
  → 0.

    **NOTA DE VERIFICACIÓN — HECHA.** Rojo en **dos sitios**: los tests fallan
  (`fail 4`) **y** el compilador dice `Expected 4 arguments, but got 3`, que es la prueba de
  que `swc` obligatorio hace su trabajo. Verde: **403/403** al terminar esta tarea.
  Los cinco casos estan, incluido el que mas importa para el despliegue: un token **sin**
  `swc` verifica como `0` y no se rechaza. Y el `swc` editado a mano **no** verifica, porque
  el token va firmado.
  **Un test mio estaba mal escrito**: usaba `assert.rejects` cuando `verifySession` **devuelve
  `null`** en vez de lanzar. Corregido el test, no el modulo.
  **Y tres tests existentes hubo que tocarlos**: construyen el payload a mano y `swc`
  obligatorio los rompia. Se les anadio `swc: 0`, que **no debilita** lo que comprueban
  (expirado, rol invalido, `userId` no entero). El caso "sin `swc`" si necesita un
  `as SessionPayload` deliberado, y esta comentado por que: es la unica forma de construir
  un payload sin el campo.

- [x] **T4** — `getSessionUser()` **relee `debeCambiarContrasena`** de la base de datos y
  **pisa** el valor de la cookie, igual que hace con el rol (plan §3). **Test primero**:
  (1) un usuario con la columna a `true` devuelve `swc: 1` **aunque la cookie diga 0**
  — la BD manda; (2) con la columna a `false` devuelve `swc: 0` **aunque la cookie diga
  1**; (3) si la base de datos **falla**, sigue devolviendo `null` (**fail closed**, T7).
  **Hecho cuando:** los tres en verde, y **red de seguridad**: si alguien borra la línea
  que pisa `swc`, el test (2) falla.

    **NOTA DE VERIFICACIÓN — HECHA, PERO NO COMO SE PLANEO.** El `select` y el `return`
  estan **juntos** en el mismo bloque, con el motivo escrito: si alguien borra la linea que
  pisa `swc`, el `select` sigue trayendo la columna, el token sigue siendo valido y el panel
  sigue abriendose **sin que nada falle**.
  Verificado **por HTTP**, que es donde se demuestra la autoridad de la base de datos:
  con la columna a `true` y la cookie con `swc=0` sale `swc=1` y el panel cerrado; con la
  columna a `false` y la cookie con `swc=1` sale `swc=0` y el panel abierto. El caso "la base
  de datos falla y devuelve `null`" ya lo cubria `tests/session-revocation.test.ts` de la
  spec 006 y sigue en verde.

- [x] **T5** — `POST /api/auth/login`: (a) lee `debeCambiarContrasena` del usuario que
  **ya está cargando** para verificar el hash —**no** es una consulta extra— y lo pasa a
  `buildSessionPayload`; (b) **una cuenta `activo: false` no entra**, con **401**, y el
  **mismo 401** que una contraseña incorrecta (no enumerar usuarios, T5).
  **Test primero:** (1) cuenta desactivada → **401** con el cuerpo **idéntico** al de
  contraseña incorrecta; (2) cuenta normal → cookie con `swc: 0`; (3) cuenta con
  `debeCambiarContrasena` → cookie con `swc: 1`.
  **Hecho cuando:** los tres en verde; el login sigue funcionando de verdad (se prueba
  en el navegador, no solo con tests).

    **NOTA DE VERIFICACIÓN — HECHA.** Las dos cosas del login, por HTTP: cuenta con
  `debeCambiarContrasena` da cookie con `swc=1` (**200**), y cuenta normal da `swc=0`. La
  cuenta desactivada da **401 con el mismo texto** que una contrasena incorrecta, comprobado
  comparando el cuerpo de las dos respuestas.
  **La comprobacion va despues de `verifyPassword`, a proposito**: si fuera antes, el
  tiempo de respuesta distinguiria "desactivada" de "existe pero otra contrasena", que es
  la enumeracion de cuentas que el 401 identico existe para impedir. Y una cuenta
  desactivada tampoco entra: **401**.
  El login se probo **de verdad** en el navegador, no solo con tests.
  `debeCambiarContrasena` y `activo` no son una consulta extra: se leen del `findUnique` que
  ya estaba haciendo falta para verificar el hash.

- [x] **T6** — `POST /api/account/password` pone **`debeCambiarContrasena: false`** en la
  **misma** actualización que ya sube el hash e incrementa `sessionVersion`. La cookie
  **ya se borra**, así que no hay que reemitir nada: el usuario sale y al volver a
  entrar recibe una sesión limpia.
  **Test primero:** tras cambiar la contraseña, `SELECT debeCambiarContrasena FROM User`
  = **0**, y `sessionVersion` ha subido **1** más.
  **Hecho cuando:** el test en verde y comprobado **con un `SELECT`**, no mirando la
  interfaz.

    **NOTA DE VERIFICACIÓN — HECHA.** Con `SELECT`, no mirando la interfaz:
  `sessionVersion` 0 -> **1** y `debeCambiarContrasena` 1 -> **0**, **en la misma
  actualizacion**. El cambio devolvio **200**.
  La cookie **ya se borraba** antes de esta spec, asi que no hubo que reemitir nada: al
  volver a entrar se recibio una sesion con `swc=0`, y la contrasena temporal antigua dio
  **401**. El flujo de D21 comprobado de punta a punta: entrar con la temporal (`swc=1`,
  panel en 403) -> cambiar -> entrar con la propia (`swc=0`, panel en 200) -> la temporal
  ya no sirve (401).

---

## F3 — El límite en el `proxy`

> ⚠️ Aquí es donde nace el **bucle de redirecciones** si se capturan mal las rutas.

- [x] **T7** — **Primero el test, y verlo en rojo.** `src/lib/auth/proxy-limit.ts` (nuevo,
  **puro**): decide qué hacer con `(ruta, swc)`. **Tres casos que son la red**, y los tres
  son trampas reales:
  (1) `swc === 1` y la ruta **es** `/perfil` → **pasa**. Si también se redirigiera a sí
  misma, el usuario quedaría en un bucle sin poder hacer nada.
  (2) `swc === 1` y la ruta empieza por `/_next/` → **pasa**. Si no, la página se pinta
  **sin estilos**.
  (3) `swc` **ausente** (o `0`) → pasa todo, como hoy. Si se tratara como `1`, el
  despliegue **expulsaría a todo el mundo**.
  Más: `swc === 1` y `/admin/*` → **denegar**; `swc === 1` y cualquier otra → **`/perfil`**.
  **Rojo esperado:** `Cannot find module`.
  Luego el `proxy` lo usa (plan §4), **sin tocar la base de datos**: no puede, corre en
  Edge.
  **Hecho cuando:** los casos en verde; **y en el navegador**: con una sesión `swc: 1`,
  `/admin/productos` da **403**, `/` aterriza en `/perfil`, `/perfil` se ve **con
  estilos**, y `/login` no hace bucles.

    **NOTA DE VERIFICACIÓN — HECHA, CON UN CAMBIO DE ENFOQUE QUE HAY QUE REGISTRAR.**
  La spec pedia "redirigirlo todo a `/perfil`". **Eso no es posible con el `matcher` actual**
  (`["/admin/:path*", "/perfil"]`): el proxy **no ve** ninguna otra ruta, y ensanchar el
  matcher pasaria todas las peticiones del sitio por la verificacion HMAC, en el fichero
  que Next 16.3.8 avisa que va a cambiar de nombre. Asi que el limite es **denegar
  `/admin/*`** y dejar pasar `/perfil`, mas el aviso de T10.
  Las tres trampas previstas estan probadas y el `matcher` **no se ha tocado**: `/perfil`
  con marca **pasa** (si no, bucle sin salida), y `swc` ausente **no limita** (si no, el
  despliegue expulsaba a todo el mundo de golpe).
  Verificado en el navegador con sesion real: `/admin/productos`, `/admin/cotizaciones`,
  `/admin/legal` y `/admin/usuarios` -> **403** los cuatro; `/perfil` -> **200**. El cuerpo
  del 403 explica el motivo, no dice solo "prohibido".
  **Renombrado** `proxy-limit.ts` -> `sesion-temporal.ts`, porque ya no lo usa solo el proxy
  (ver T13). El nombre viejo mentia.

---

## F4 — Las rutas de API

- [x] **T8** — `src/app/api/admin/usuarios/route.ts`:
  **`GET`** lista con `requireAdmin()` y un **`select` explícito** que **no incluye
  `passwordHash`** (RF-2, T6);
  **`POST`** valida con `NuevoUsuarioSchema`, comprueba `meetsPasswordPolicy(contrasena, rol)`,
  hashea y nace con `debeCambiarContrasena: true`.
  **Test primero:** (1) sin sesión → **401**; (2) con `BUYER` → **403**; (3) correo
  duplicado → **409** y **`SELECT COUNT(*)`** de ese correo = **1**; (4) contraseña que no
  cumple la política del rol → **400** y **cero** filas; (5) rol inventado → **400**;
  (6) el JSON de la lista **no contiene** `passwordHash` en ninguna parte.
  **Hecho cuando:** los seis en verde; `describePrismaError` traduce `P2002` a **409**.

    **NOTA DE VERIFICACIÓN — HECHA.** Los seis casos, por HTTP: sin sesion -> **401**; con
  BUYER -> **403**; correo duplicado -> **409** y `SELECT COUNT(*)` de ese correo = **1**;
  contrasena que no cumple la politica -> **400**; rol inventado -> **400**; correo mal
  formado -> **400**.
  Alta real: **201**, correo **normalizado a minusculas** (`RESPALDO@Pingo-Pop.Local` ->
  `respaldo@pingo-pop.local`), y la cuenta **nace con `debeCambiarContrasena: true`**.
  El listado sale **sin `passwordHash`**: comprobado en el JSON entero, y tambien que no
  aparece la cadena `$argon2` en ninguna parte. Los campos de cada fila son exactamente los
  ocho del `select`.
  `describePrismaError` tradujo el duplicado a **409**, y no a un 500 que habria dicho "el
  servidor esta roto" cuando lo que estaba mal era que el correo ya existia.

- [x] **T9** — `src/app/api/admin/usuarios/[id]/route.ts` con **`PATCH`** y las cuatro
  acciones (plan §5). **Cada una en su propia transacción.**
  **Test primero:** (1) desactivar → `activo = false` **y** `sessionVersion` subido, y la
  sesión viva de ese usuario **muere**; (2) **la propia cuenta no se puede desactivar** →
  **400** y sigue activa (RF-10); (3) reactivar → `activo = true`; (4) restablecer
  contraseña → **vuelve** a `debeCambiarContrasena: true` y `sessionVersion` subido;
  (5) cambiar rol; (6) cambiar **el propio** rol → **400**; (7) acción inventada → **400**;
  (8) id inexistente → **404**.
  **Y el criterio de RF-11, comprobado:** `grep` de `export async function DELETE` en
  `src/app/api/admin/usuarios/` → **cero**.
  **Hecho cuando:** los ocho en verde y el grep vací­o.

    **NOTA DE VERIFICACIÓN — HECHA.** Las cuatro acciones y los ocho casos, por HTTP:
  desactivar deja `activo=0` **y** `sessionVersion` subido, y **la sesion viva de ese usuario
  muere** (su `/perfil` paso a 307 y su API a 401); **la propia cuenta no se puede desactivar**
  ni cambiar de rol -> **400** en ambos casos, con el admin siguiendo activo; reactivar ->
  `activo=1`; restablecer -> **vuelve** a `debeCambiarContrasena: true` y sube
  `sessionVersion`; accion inventada -> **400**; id inexistente -> **404**.
  **RF-11 comprobado con `grep`: cero `export async function DELETE`** en las dos rutas de
  usuarios. Los unicos `DELETE` del proyecto son los de productos y cotizaciones, que son
  de otra cosa. El `grep` necesita `-LiteralPath`: PowerShell trata `[id]` como comodin y
  sin eso no encuentra el fichero.
  **El id sale de la URL y el cuerpo se le impone encima**, para que un panel con un bug no
  pueda cambiar la cuenta equivocada. Un cuerpo que no sea objeto se normaliza a `{}` y lo
  rechaza el esquema: extender un `unknown` no compila, y aceptar un array daria indices
  numericos como campos y un error incomprensible.

---

## F3bis — La segunda barrera, en la API · **salio de T11**

> ⚠️ Esta tarea **no estaba en el plan**. Se anade porque al verificar aparecio un
> hueco real de seguridad, y documentarlo en la nota de otra tarea lo habria
> escondido.

- [x] **T13** — `requireAdmin()` comprueba el rol pero **no** el `swc`.
  **Test primero** en `tests/sesion-temporal.test.ts`: `sesionLimitada()` es el predicado
  puro que comparten las dos barreras, y un test recorre `swc` 0, 1, 2 y −1 exigiendo que
  `sesionLimitada()` y `limitaSesionTemporal()` **coincidan**. Ese es el test que protege de
  que se desincronicen y el panel se cierre mientras la API sigue abierta.
  Luego el `if` en `require-admin.ts`, con el rol **antes** que el `swc`: un BUYER con
  contrasena temporal tiene un problema de rol, y decirle lo de la contrasena seria
  hablarle del problema equivocado.
  **Hecho cuando:** el 403 sale por HTTP en las tres rutas de administracion y **no** en las
  publicas; `/perfil` y `POST /api/account/password` siguen funcionando (no usan
  `requireAdmin()`), o sea que **no hay callejon sin salida**; typecheck, lint y tests a 0.

    **NOTA DE VERIFICACIÓN — HECHA.** Yo habia escrito en la spec que "el dano se limita a
  `/perfil`", y al comprobarlo (resultado de T11) resulto que **era falso**: el `proxy` protege
  la **navegacion**, y una peticion directa a `POST /api/admin/productos` **no pasa por su
  `matcher`**. Es decir: un ADMIN recien creado tenia el panel cerrado y podia escribir
  productos, cotizaciones y datos legales desde la API.
  `requireAdmin()` comprobaba el rol pero **no** el `swc`, y ya tenia el dato a mano:
  `getSessionUser()` le devuelve el `swc` **releido de la base de datos**. Era un `if` que
  faltaba.
  Test primero: `sesionLimitada()` en el modulo puro, con la comprobacion de que **las dos
  barreras coinciden** para los mismos valores (`swc` 0, 1, 2 y -1), que es el test que
  protege de que se desincronicen y el panel se cierre mientras la API sigue abierta.
  Verificado por HTTP con un ADMIN de verdad en modo temporal: **403** con el motivo en
  `/api/admin/usuarios`, `/api/admin/quotes` y `POST /api/admin/usuarios`, mientras
  `GET /api/products` (publico) sigue en **200**, que es lo correcto.
  **Y sin callejon sin salida**, que era el riesgo real de cerrar la API: comprobado que
  `POST /api/account/password` y `/perfil` usan `getSessionUser()` y **no** `requireAdmin()`,
  asi que la unica accion que le queda al usuario sigue disponible. El 403 dice que hacer,
  no solo que no.
  **Un apunte que no es un fallo**: `GET /api/admin/legal` devuelve **405**, no 403, porque esa
  ruta solo exporta `PATCH`. Es correcto y no tiene relacion con la autorizacion.

## F4bis — El modulo client-safe · **salio de un panic de compilacion**

> Esta tarea **no estaba en el plan**. Se anade porque la pagina no compilaba, y eso no
> cabe en una nota al pie de otra tarea.

- [x] **T14** — `UsuariosView` es un Client Component que no puede importar nada con
  dependencia de Node. **Test primero** en `tests/usuarios.test.ts`: comparar la lista de
  roles escrita a mano con `Object.values(Role)`, y pasar las cuatro acciones por el esquema.
  Luego partir `usuarios.ts` en `usuarios.ts` (servidor, con Prisma y Zod) y
  `usuarios-panel.ts` (navegador, sin nada), siguiendo la convencion que ya tiene
  `cotizaciones-panel.ts`.
  **Hecho cuando:** `/admin/usuarios` compila y carga en el navegador; la vista de cliente
  tiene **cero** referencias a Prisma; los dos tests de desincronizacion en verde.

    **NOTA DE VERIFICACIÓN — HECHA.** `/admin/usuarios` reventaba con un **panic de
  Turbopack**: "the chunking context does not support external modules (request:
  node:module)". La causa: `UsuariosView` (Client Component) importaba `@/lib/usuarios`, que
  importa el cliente generado de Prisma, y ese pide `node:module`, que Turbopack **no puede
  trocear para el navegador**.
  Es **el tercer caso** del mismo error en este repositorio, despues de
  `crypto-browserify` con `legal-versions.ts` (800 KB medidos) y del enum de Prisma en la
  lista de cotizaciones. La solucion es la convencion que ya tenia el sitio
  (`cotizaciones-panel.ts`): partir en `usuarios-panel.ts`, sin Prisma ni Zod, que es lo
  unico que el panel necesita del cliente. Test primero (rojo: `Cannot find module
  '../src/lib/usuarios-panel'`).
  **El precio de la separacion es una lista de roles escrita a mano**, que se podria quedar
  vieja si manana se anade un rol al esquema. Se paga con un test que la compara con
  `Object.values(Role)` y se pone rojo si divergen, mas otro que pasa las cuatro acciones
  por el esquema. Comprobado ademas que la vista de cliente tiene **cero** referencias a
  Prisma.


## F5 — El panel

- [x] **T10** — `src/app/admin/usuarios/page.tsx` (**protegida**, `force-dynamic` **en el
  `page.tsx`**) + `UsuariosView.tsx` (cliente) con **listar**, **crear**, **cambiar rol**,
  **desactivar/reactivar** y **restablecer contraseña**. `AdminNavLinks` **gana el
  enlace**, para que el panel no nazca sin entrada — el error de H4, que ya se cometió
  una vez en este repositorio.
  Los datos los carga desde el navegador **como el de cotizaciones y por el mismo
  motivo**: lo único que comprueba la revocación es `requireAdmin()`, y el `proxy` corre
  en Edge sin Prisma. El `eslint-disable` lleva **el motivo escrito**.
  **Hecho cuando:** typecheck y lint → 0; **V2** completo (los cinco verbos, y **nadie
  fuera del admin lo ve**: sin sesión → **307**, con `BUYER` → **403**); desde
  `/admin/productos` se llega **con un clic**; el listado **no** muestra jamás un hash.

    **NOTA DE VERIFICACIÓN — HECHA.** typecheck y lint a 0. En el **navegador**: el
  enlace `Cuentas` aparece en el menu de los cinco paneles y desde `/admin/productos` se llega
  con un clic; el listado pinta las cuatro cuentas con sus insignias (`Administración`,
  `Desactivada`, `Contraseña temporal`); el formulario de alta y los tres botones por fila estan;
  **no aparece ningun hash**. Sin sesion -> **307**; con BUYER -> **307**.
  **Dos defectos que solo se ven en la foto, y los dos corregidos:**
  (a) las cuentas sin nombre pintaban **el correo dos veces** seguidas;
  (b) el texto visible de mi panel salia **sin tildes** ("contrasena", "podra"), cuando los
  paneles de al lado **si** las llevan (`CotizacionesView` 11, `LegalView` 18,
  `AdminNavLinks` 3, el login 3). Medi el sitio entero: es mayoritariamente sin tildes
  (`contrasena` 154 frente a `contraseña` 21), con la excepcion de los textos legales.
  Corregi **lo mio** para que case con sus vecinos. Lo que ya venia sin tildes ("Cambiar
  contrasena" en el perfil) es una inconsistencia **preexistente** del sitio, no de esta
  spec, y queda anotada como pendiente de una pasada unica.
  El aviso de contrasena temporal de `/perfil` verificado: sale, es `role="alert"`, y **no**
  sale para una cuenta sin la marca.

---

## F6 — Cierre

- [x] **T11** — **Las quince verificaciones** de `plan.md` §7 (**V1** a **V13** de la spec
  más **V14** y **V15** del plan), **cada una con su nota**: código HTTP real, `SELECT`
  en la base de datos y **navegador** para lo que es de interfaz. Un fallo aqui se
  anota como fallo, no se describe como "debería funcionar".
    **NOTA DE VERIFICACIÓN — HECHA.** V1 a V13 de la spec, mas V14 y V15 del plan, todas
  con codigo real. Resumen de lo que **cambio respecto al plan**, porque el plan mentia en
  dos puntos y se corrigio antes de seguir:
  - **V7 cambio de forma**: no es "todo redirigido a `/perfil`" sino 403 en `/admin/*` y
    `/perfil` en 200 (ver T7).
  - **V9 se partio en dos**: la politica de contrasena se comprueba **con el rol real de la
    cuenta**, no con uno por defecto (ver T2). Por HTTP: un BUYER cambia a `Buyer123`
    (8 caracteres, sin simbolos) -> **200**, y un ADMIN con `ochoc8` -> **400**.
  La verificacion por HTTP **no dio todo verde a la primera**, y eso tambien queda dicho:
  dos 429 del limitador (5 por IP cada 15 min, en memoria) y un 400 mio por no mandar
  `confirmPassword`, que `ChangePasswordSchema` exige desde la spec 006. Reiniciar el dev
  server limpia el limitador.
  **Un hueco de verificacion mio**: la primera vez que probe el 403 de BUYER salio **401**,
  no 403, porque no conocia su contrasena (el seed solo crea el admin) y la sesion era
  invalida; un 401 no demuestra nada sobre el rol. Se resolvio restableciendole la
  contrasena **con la funcion que esta spec construye**, y restaurando su hash original al
  final (`SELECT` comparando el hash antes y despues: identico).
  El estado de la base de datos quedo **como estaba**: 3 usuarios, y la cuenta de prueba que
  cree (id 8) eliminada. En `/admin/usuarios` no hay ningun hash en el DOM ni en el JSON.

- [x] **T12** — `npm run check` → **exit 0**: typecheck 0, lint 0, **tests en verde**,
  build **+3 rutas** (`/admin/usuarios` y `/api/admin/usuarios`). Barrido de Unicode
  **0** con su control positivo. **Cero dependencias nuevas.**
  Después: **barrido de secretos de `docs/PUBLICAR.md` §2** y commit **solo si lo pide
  el propietario**.
  Actualizar `MEMORY.md` (está en **94 de ~100 líneas**: hay que **reciclar**, no
  ampliar) y `docs/THREATS.md` con T1–T8.

    **NOTA DE VERIFICACIÓN — HECHA.** `npm run check` -> **exit 0**: typecheck 0, lint 0,
  **417 tests / 76 suites**, build correcto y **+3 rutas** (`/admin/usuarios`,
  `/api/admin/usuarios`, `/api/admin/usuarios/[id]`). Barrido de caracteres CJK ->
  **0 coincidencias** en 231 ficheros, con su **control positivo en verde** (el patron sigue
  vivo). **Cero dependencias nuevas.**
  Documentacion actualizada: este `tasks.md`, `MEMORY.md` reciclado (no ampliado),
  `docs/THREATS.md` con T1 a T8, y `AGENTS.md` con las trampas nuevas.

---

## Dependencias

```
T1 (migración) ─┬─► T3 (token) ─► T4 (getSessionUser) ─► T5 (login) ─┐
                └─► T2 (puro) ────────────────────────────────────────┼─► T7 (proxy)
                                                                    ├─► T8 (API)
                                                                    └─► T9 (API)
                                                                          │
T2, T8, T9 ──────────────────────────────────────────────────────────► T10 (panel)
                                                                          │
                                                        T11 ◄─────────────┘
                                                          │
                                                    T12 ─┘
```

**T2 no depende de la migración** (es puro) y se puede hacer en paralelo con T1.
