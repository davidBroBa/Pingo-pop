# Spec: Pingo POP — Perfil de cuenta y cambio de contraseña (006-user-profile)

> Estado: **BORRADOR** (pendiente de aprobación final del usuario).
> Fecha: 2026-10-05. Specs base: `001-pingo-rework`, `003-quote-cart-persistence`.
> **La creación de administradores desde el panel va en la spec 007**, no aquí.
> Decisiones ya tomadas por el usuario: perfil con datos extra para ADMIN, el cambio
> de contraseña **cierra todas las sesiones**, contraseña relajada para usuarios
> (8+) y estricta para admins (12+ con mayúscula, minúscula, dígito y puntuación).

## 1. Problema

La cuenta es una caja fuerte con una sola puerta, y sin manivela para cerrarla bien:

- **No hay perfil.** No existe `/perfil`. El campo `name` está en el modelo `User`
  desde la spec 001 y **no se usa en ningún sitio**: ni se lee, ni se escribe, ni se
  muestra.
- **No se puede cambiar la contraseña.** Quien sospeche de una filtración no tiene
  ninguna acción: solo esperar 8 horas a que caduque la sesión.
- **Un BUYER no puede cerrar sesión.** El botón "Cerrar sesión" solo existe dentro de
  `AdminProductsView`, o sea que un usuario normal tendría que borrar cookies a mano.
- **Las sesiones no se pueden revocar**, y esto es la causa de los otros tres puntos.

### 1.1 El hallazgo que condiciona el diseño

`src/lib/auth/session-token.ts` firma un payload **sin estado**:

```ts
export type SessionPayload = {
  userId: number;
  role: "BUYER" | "ADMIN";
  iat: number;
  exp: number;
};
```

La cookie es `base64url(payload).base64url(hmac)` y **solo se validan firma y
fecha**. No hay identificador de sesión ni número de versión, así que **toda cookie
firmada sigue valiendo hasta 8 horas** (`SESSION_TTL_MS`), aunque se cambie la
contraseña. Sin tocar esto, "cambiar la contraseña" no revocaría nada.

De paso, hoy ya se cumple esta consecuencia: si a un ADMIN se le baja el rol en la
base de datos, su cookie sigue diciendo `role: "ADMIN"` y `requireAdmin()` le sigue
dando el panel hasta que caduque.

## 2. Objetivo

1. Una página `/perfil` para ver y editar los datos de la cuenta, y **cerrar sesión
   desde cualquier rol**.
2. **Cambiar la contraseña** pidiendo la actual, y que eso **revoke todas las sesiones**.
3. Que el perfil de un **ADMIN** muestre datos que un usuario normal no ve.
4. Dos **políticas de contraseña distintas según el rol**, para no obligar a un
   cliente a inventar una contraseña con símbolos y no exigirSymbols a quien solo
   quiere un pin de 8 dígitos.

## 3. Alcance

**Incluye:**
- Migración: `User.sessionVersion Int @default(0)`.
- `sv` en el payload de sesión, comparado contra la BD donde ya se consulta la BD.
- `POST /api/account/password`: actual + nueva + confirmación, con la política del rol.
- `PATCH /api/account/profile`: editar `name`.
- Página `/perfil`, protegida, con bloque extra para ADMIN.
- Enlace "Mi perfil" en el navbar y en el panel.
- Cambiar la contraseña del admin local para que cumpla la política estricta.
- Tests nuevos y ampliación de los existentes.

**No incluye (specs futuras):**
- **007 — crear administradores desde `/admin/usuarios`.** Es un sistema aparte, con
  su propia superficie de seguridad (escalada de privilegios). Decidido por el usuario
  partirlo.
- **Recuperación de contraseña por correo:** no hay servicio de correo saliente en el
  proyecto. Sería un sistema entero (SMTP o proveedor, tabla de tokens, expiración).
- Editar el `email` de la cuenta.
- Avatar, y ventana de "sesiones activas" (ver/listar dispositivos).

## 4. Requisitos funcionales (EARS)

**Perfil**
- **RF-1:** Con sesión válida, `/perfil` muestra los datos de la cuenta.
- **RF-2:** Sin sesión, `/perfil` redirige a `/login?next=/perfil`.
- **RF-3:** El usuario puede editar su `name` (2–120 caracteres, sin caracteres de control).
- **RF-4:** El `email` **no** se puede editar por esta vía.
- **RF-5:** El perfil tiene **cerrar sesión** disponible para cualquier rol.
- **RF-6:** Si el rol es ADMIN, se muestra además: **id interno, `role`, `createdAt`,
  `updatedAt`** y los datos de la sesión actual (emitida y caduca).
- **RF-7:** El perfil **no** muestra `passwordHash` ni ningún dato de la contraseña,
  a ningún rol.

**Contraseñas (dos políticas)**
- **RF-8:** Un **BUYER** puede tener contraseña de **8 caracteres o más**, sin exigir
  mayúsculas, minúsculas, dígitos ni signos de puntuación. Se admiten números y
  cualquier carácter normal.
- **RF-9:** Un **ADMIN** debe tener contraseña de **12 caracteres o más** y cumplir
  **mayúscula + minúscula + dígito + al menos un signo de puntuación**.
- **RF-10:** Ambas políticas rechazan contraseñas de más de **200 caracteres** (el mismo
  tope que acepta el login) y las que contienen **caracteres de control**.
- **RF-11:** El login acepta las dos: su mínimo es 8, así que una contraseña de admin
  entra sin problema.

**Cambio de contraseña**
- **RF-12:** El cambio exige la **contraseña actual**. Si no es correcta, responde
  **401 con el mismo texto** que si la cuenta no existiera (no enumeración).
- **RF-13:** La nueva contraseña **debe ser distinta de la actual**.
- **RF-14:** Si no cumple la política del rol, devuelve **400** con el motivo concreto.
- **RF-15:** Al cambiar, **se invalidan todas las sesiones, incluida la del
  dispositivo que cambió la contraseña**. La cookie se borra y se redirige a `/login`
  con aviso: hay que entrar otra vez con la nueva.
- **RF-16:** El endpoint lleva **rate limit**, como el login.

**Revocación (el núcleo)**
- **RF-17:** Una cookie firmada cuyo `sv` no coincida con el `sessionVersion` de la BD
  se **rechaza** en toda ruta que consulte la BD.
- **RF-18:** Una cookie antigua **sin `sv`** se trata como versión **0**, para no
  expulsar a nadie al desplegar esto.

## 5. Decisiones

**D1 — `sessionVersion` en `User`, no tabla `Session`.** Columna `Int @default(0)` que
se incrementa al cambiar la contraseña, y cuyo valor viaja en el payload como `sv`.

- *Por qué:* es el mecanismo estándar de revocación sin estado, cabe en una columna y
  no obliga a tocar todo el modelo de sesión.
- *Alternativa descartada:* tabla `Session` con hash del token y `expiresAt`, que
  permitiría revoke exacto y listar dispositivos. Descartada **ahora** porque el
  middleware corre en **Edge** y no puede usar Prisma: la revocación solo aplicaría en
  el lado Node, con el mismo resultado observable y mucha más superficie.

**D2 — El middleware no revoca; revoca la puerta real.** El middleware de Edge solo lee
la cookie, no la BD. La comparación de `sv` ocurre en `requireAdmin()` y en la página
de perfil, que ya son **la barrera fiable** según su propio docstring.

- *Consecuencia honesta:* una cookie revocada todavía puede renderizar el *shell* de
  `/admin` y recibe un 401/403 limpio al pedir datos. Se documenta como límite
  conocido, no se disimula.

**D3 — El cambio cierra también el dispositivo actual.** Al incrementar `sv` mueren
todas las sesiones, y no se emite cookie nueva. Pedido explícito del usuario; además
es lo coherente con "cerrar sesión" como operación de seguridad.

**D4 — Dos políticas, no una.** La estricta solo para ADMIN. La relajada mantiene un
**suelo de 8**, no menos: `LoginSchema` ya rechaza menos de 8, así que permitir 6 sería
ofrecerle al usuario una contraseña que luego no puede usar. Se relaja la
*complejidad*, no la *longitud*.

**D5 — El login no cambia.** Sigue validando con `min(8)`/`max(200)`: es el mínimo
común de las dos políticas. Unificar aquí no aporta nada y tocaría el camino más
delicado del auth.

**D6 — Cerrar sesión sigue borrando la cookie** (`maxAge: 0`) y **no** incrementa
`sv`: cerrar sesión es de un dispositivo; cambiar la contraseña es de todos.

**D7 — La política estricta se aplica también al crear la cuenta.** Cuando llegue la
spec 007, un admin creado desde el panel tendrá que cumplir la política estricta.

## 6. Modelo de datos

```prisma
model User {
  // ... lo existente, sin cambios
  sessionVersion Int @default(0)   // revocacion de sesiones
}
```

Solo **una** columna. `lastLoginAt` queda **descartado** por decisión del usuario: no se
crea y el perfil no lo muestra.

**Trampa conocida:** MariaDB en Linux distingue mayúsculas (`lower_case_table_names=0`).
La migración debe conservar el nombre `User`.

## 7. Diseño técnico

- `src/lib/auth/session-token.ts`: `SessionPayload` gana `sv: number`.
  `verifySession` lo valida como entero `>= 0`; **ausente → 0** (RF-18).
  `buildSessionPayload(userId, role, sessionVersion)`.
- `src/lib/auth/session.ts`: nueva `getSessionUser()` que carga el usuario y
  **compara `sv`**; `null` si no coincide (RF-17).
- `src/lib/auth/require-admin.ts`: usar `getSessionUser()` en vez de `getSession()`.
  Coste: una consulta extra por llamada de admin. Es el precio de poder revocar.
- **Nuevo** `src/lib/account-schema.ts`, puro y sin DOM ni BD:
  `UpdateProfileSchema`, `ChangePasswordSchema` y
  `passwordPolicyProblems(password, role): string[]` (vacío = válida).
- **Nuevos** `src/app/api/account/password/route.ts` y `.../profile/route.ts`.
- **Nueva** `src/app/perfil/page.tsx` + componentes co-ubicados.
- `src/middleware.ts`: `/perfil` al `matcher`.
- Navbar: enlace "Mi perfil" cuando hay sesión. `AdminProductsView`: enlace junto a
  "Cerrar sesión".
- `src/app/api/auth/login/route.ts`: al leer el usuario, seleccionar también
  `sessionVersion` para emitir la cookie con el `sv` correcto.

## 8. Tests (test-first: escritos y vistos en rojo antes del código)

- `tests/account-schema.test.ts` (nuevo):
  - `name`: válido, de 1, de 2, de 120, de 121, con carácter de control.
  - BUYER: 7 caracteres rechaza, 8 acepta, sin mayúsculas acepta, solo dígitos
    acepta, con acentos y ñ acepta, 201 caracteres rechaza, con `\n` rechaza.
  - ADMIN: 11 rechaza, 12 sin mayúscula rechaza, sin dígito rechaza, sin signo
    rechaza, `Pingo.Admin2026!` acepta.
- `tests/session-token.test.ts` (ampliar): `sv` en el payload; ausente → 0; no entero
  o negativo → `null`; **el resto de los tests actuales siguen pasando sin tocarlos**.
- `tests/session-revocation.test.ts` (nuevo): función pura `isSessionCurrent(sv, userSv)`
  con su matriz completa.

**Lo que NO se testea aquí, y por qué:** los componentes de React y los route
handlers. El runner es `node:test` **sin jsdom**. La revocación se verifica además en
navegador: iniciar sesión, cambiar la contraseña, y comprobar con **la cookie
anterior** que el panel ya no responde.

## 9. Verificación

- `npm run check` → exit 0, **107+N tests**, build OK.
- Migración aplicada y verificada contra la BD local.
- Navegador: perfil de BUYER, perfil de ADMIN con el bloque extra, cambio correcto,
  cambio con actual incorrecta (401), contraseña corta (400), y **la cookie anterior
  rechazada** tras el cambio.

## 10. Riesgos

| Riesgo | Mitigación |
|---|---|
| Olvidar `sv` en algún `buildSessionPayload` | Parámetro obligatorio; lo detecta el typecheck |
| Bajar un rol no corta la sesión del middleware | D2 documentado; `requireAdmin` sí revoca |
| Exponer el hash por error | RF-7: el `select` del perfil nunca incluye `passwordHash` |
| Enumeración por el endpoint nuevo | Rate limit + mismo 401 + no confirmar si la cuenta existe |
