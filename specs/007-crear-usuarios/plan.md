# Plan de implementación — 007-crear-usuarios

> Spec: `spec.md` (aprobada 2026-10-06, D21/D22/D23/D24).
> Regla: **el test se escribe antes que el código y se ve en rojo.**
> Orden de las secciones: **§1 migración, §2 lo puro, §3 sesión, §4 proxy, §5 API,
> §6 panel, §7 verificación.**

---

## §0 Lo que hay que tener claro antes de empezar

| Hecho comprobado | Consecuencia de diseño |
|---|---|
| `User` **no tiene ninguna relación** | Borrar una cuenta no rompe nada. Aun así **no se borra** (RF-11) |
| `POST /api/account/password` **ya borra la cookie** | El cambio de contraseña **manda fuera de sesión**. El flujo de D21 reutiliza eso: no hay que inventar reemisión de cookie |
| `getSessionUser()` **relee el rol de la base de datos** | `debeCambiarContrasena` se relee igual. La cookie es la vía rápida del `proxy`, **la BD es la autoridad** |
| El `proxy` corre en **Edge**, sin Prisma | No puede revocar ni consultar. Solo lee la cookie firmada |
| `sv` ausente se trata como `0` a propósito | `swc` ausente se trata como `0`, por el mismo motivo: al desplegar, las cookies vivas no expulsan a nadie |
| No hay proveedor de correo | Ninguna parte de esto puede depender de enviar un correo |

---

## §1 La migración

**Un solo fichero**, `<ts>_add_usuario_estado` con **dos columnas**:

```prisma
// User
debeCambiarContrasena Boolean @default(false)
activo                Boolean @default(true)
```

**Por qué una sola migración y no dos**: las dos columnas son el mismo concepto —el
estado de una cuenta— y separarlas dejaría un estado intermedio donde una cuenta está
activada y sí tiene que cambiar la contraseña, o al revés.

**Cómo se genera**: `migrate diff --from-config-datasource --to-schema` y se revisa el
SQL **antes** de aplicar. **No** `migrate dev` a pelo: pide `CREATE` y `ALTER` para su
*shadow database* y se niega a seguir en modo no interactivo cuando toca columnas con
datos. La tabla `User` **tiene** datos.

**Las tres comprobaciones, en este orden:**

1. `SELECT COUNT(*) FROM User` → anotar **N**
2. `npx prisma migrate diff ...` → revisar el SQL a ojo: **solo** dos `ADD COLUMN`, nada
   de `DROP` ni de `ALTER` de una columna existente
3. `npx prisma migrate deploy` → `npx prisma migrate status` → **up to date**
4. `SELECT COUNT(*) FROM User` → tiene que ser **N**. Y `SELECT activo, debeCambiarContrasena FROM User`
   → **`0` en las dos** en toda cuenta que ya existía (los `DEFAULT` valen, pero se
   comprueba, no se supone)

**Después**: `npx prisma generate` y **reiniciar el dev server**.

**Trampa**: `STRICT_TRANS_TABLES` está activo. Una columna `Boolean NOT NULL` sin
`DEFAULT` sobre una tabla con filas **falla**, y con razón. Los dos `DEFAULT` existen
justo por eso.

---

## §2 Lo puro: `src/lib/usuarios.ts`

Sin Prisma, sin React, sin reloj. **Es lo único que se puede probar sin navegador**, así
que lo comprobable vive aquí.

| Exporta | Qué hace |
|---|---|
| `normalizarEmail(entrada)` | minúsculas y `trim`. El correo **es** la identidad y es `@unique`; dos escrituras de "Ana@x.com" y "ana@x.com" tienen que ser la misma cuenta |
| `EmailSchema` | Reutiliza el mismo criterio que `legal-data.ts`: `""` y espacios son ausencia, y el formato se valida |
| `NuevoUsuarioSchema` | `{ email, nombre?, rol, contrasena }`. **La contraseña se valida con `meetsPasswordPolicy(contrasena, rol)`, no con una regla nueva** (§5.3 de la spec) |
| `CambioUsuarioSchema` | `{ id, accion }` donde `accion` es una unión: cambiar rol, desactivar, reactivar, restablecer contraseña |
| `textoConfirmacion(accion, email)` | El aviso antes de una acción que deja de dar acceso |

**Dos decisiones:**

- **El rol lo valida el enum de Prisma generado**, igual que `api/admin/quotes` valida
  `QuoteStatus` contra `Object.values()`. Un rol inventado sale **400**, no llega a la BD.
- **`CambioUsuarioSchema` no tiene un campo libre `accion: string`**. Es una unión
  cerrada. Un `PATCH { id, accion: "cualquiera" }` tiene que ser un **400**, no un
  `switch` que cae en un `default` silencioso.

---

## §3 La sesión: el distintivo `swc`

### `src/lib/auth/session-token.ts`

Un campo más en `SessionPayload`:

```ts
/** 1 si la contraseña sigue siendo la temporal y hay que cambiarla. */
swc: number;
```

Tres sitios, y **los tres importan**:

1. **`buildSessionPayload(userId, role, sessionVersion, swc, now)`** — recibe el
   distintivo. Con `swc` obligatorio, TypeScript obliga a cada llamador a decidir.
2. **`verifySession`** — lee `swc` del payload. **Si viene ausente se trata como `0`**,
   con el mismo comentario y el mismo motivo que `sv`: un despliegue no debe expulsar a
   las cookies ya emitidas.
3. `SessionPayload` incluye `swc: number` (no opcional, para que no se pueda olvidar).

**El token va firmado**, así que un `swc` editado a mano no vale: es HMAC. Esto no es
decorativo, es lo que hace que el `proxy` pueda fiarse de él sin base de datos.

### `src/lib/auth/session.ts`

`getSessionUser()` relee el campo y **pisa** el de la cookie, igual que hace con el rol:

```ts
select: { sessionVersion: true, role: true, debeCambiarContrasena: true }
…
return { ...session, role: usuario.role, swc: usuario.debeCambiarContrasena ? 1 : 0 };
```

**Si se olvida esa última línea, el límite se pierde en silencio** y nada falla. Por eso
el `select` y el `return` van juntos, y hay un test que lo comprueba.

### `POST /api/auth/login`

Lee `debeCambiarContrasena` del usuario **que ya está cargando** para verificar el hash
(no es una consulta extra) y lo pasa a `buildSessionPayload`.

### `POST /api/account/password`

En la misma actualización donde ya sube `passwordHash` e incrementa `sessionVersion`:

```ts
data: { passwordHash, sessionVersion: { increment: 1 }, debeCambiarContrasena: false },
```

La cookie **ya se borra**, así que el usuario sale de sesión y al volver a entrar recibe
una sesión sin `swc`. **No hay que reemitir nada.**

---

## §4 El `proxy`: donde vive el límite

`src/middleware.ts`, dentro de la cadena que ya protege `/admin/*`:

1. Si `payload.swc === 1`:
   - `/admin/*` → **403**, sin tocar la base de datos
   - cualquier ruta que **no** sea `/perfil` → **redirect a `/perfil`**
   - `/perfil` y sus assets → **pasa**
2. El resto de la cadena, igual que ahora.

**Las tres trampas, y las tres se evitan con un test cada una:**

| Trampa | Cómo se manifiesta | Red |
|---|---|---|
| **Bucle de redirección** | Si `/perfil` **también** se redirige a sí misma, el usuario queda en un bucle y no puede hacer nada | El test afirma que `/perfil` con `swc: 1` **no** redirige |
| **Assets bloqueados** | Si se captura `/_next/*` y las imágenes, la página se pinta **sin estilos** | El test afirma que `/_next/...` con `swc: 1` **pasa** |
| **`swc` ausente** | Si se trata como `1`, un despliegue **expulsa** a todo el mundo | El test afirma que un token **sin** `swc` se comporta como `swc: 0` |

**Nada de esto consulta la base de datos.** El `proxy` no puede, y por eso `RF-6` se
complementa con el relectura de §3: la cookie decide la redirección, la BD decide la
autoridad.

---

## §5 Las rutas de API

**`src/app/api/admin/usuarios/route.ts`**

| Verbo | Qué hace | Errores |
|---|---|---|
| `GET` | Lista: `id`, `email`, `name`, `role`, `createdAt`, `updatedAt`, `activo`, `debeCambiarContrasena`. **Un `select` explícito y nada más: `passwordHash` no sale** (RF-2, T6) | 401 / 403 |
| `POST` | Crea: valida, `meetsPasswordPolicy(contrasena, rol)`, `hashPassword`, `debeCambiarContrasena: true` | 400 cuerpo · **409** correo duplicado · 401 / 403 |

**`src/app/api/admin/usuarios/[id]/route.ts`**

| Verbo | Qué hace |
|---|---|
| `PATCH` | `{ id, accion }`. Cuatro acciones, **cada una en su propia transacción** |
| **`DELETE`** | **NO EXISTE.** No se escribe. `grep` lo comprueba (RF-11, V11) |

**Acciones de `PATCH`:**

- `cambiar_rol` — **no** se permite cambiar el propio rol (§D22 y RF-10: nadie se quita a sí mismo el panel por error)
- `desactivar` — `activo: false` **y** `sessionVersion: { increment: 1 }`, para invalidar
  las sesiones vivas (RF-8, D23). **Rechaza la propia cuenta** con **400** (RF-10)
- `reactivar` — `activo: true`
- `restablecer_contrasena` — nueva contraseña validada con la política del rol, hash
  nuevo, **`debeCambiarContrasena: true`** de nuevo y **`sessionVersion` incrementado**
  (RF-9). Vuelve a pasar por el flujo D21

**`POST /api/auth/login` además**: una cuenta `activo: false` **no entra**. **401**, y
el **mismo 401** que una contraseña incorrecta, por el mismo motivo que ya tiene el login:
no enumerar usuarios (T5).

---

## §6 El panel

- `src/app/admin/usuarios/page.tsx` — protegida con `getSession()` + 307, **`force-dynamic`**
  en el `page.tsx`, y `AdminNavLinks` **con el enlace nuevo**
- `src/app/admin/usuarios/UsuariosView.tsx` (cliente) — listar, crear, cambiar rol,
  desactivar/reactivar, restablecer contraseña
- **`src/lib/usuarios.ts`** pone los textos de confirmación, para que sean probables

**Este panel carga los datos desde el navegador**, como el de cotizaciones y **por el
mismo motivo**: lo único que comprueba la revocación es `requireAdmin()`, y el `proxy`
corre en Edge sin Prisma. Una página que consultara Prisma por su cuenta serviría el
HTML a una sesión invalidada. El coste es un `eslint-disable` **con el motivo escrito**.

---

## §7 Verificación, en orden

Las de la spec (§7): **V1** a **V13**. Con dos añadidos que la spec no pedía y que
salieron de mirar el código:

- **V14**: `GET /api/admin/usuarios` **con BUYER → 403**, y la **página** → 307
- **V15**: el `proxy` con `swc: 1` **no entra en bucle** en `/perfil` y **sí** deja pasar
  `/_next/*`

**Y al final, obligatoriamente:**

```
npm run check   → exit 0
npm run build   → 0 errores
npx tsx scripts/barrido-caracteres.ts → 0, con su control positivo
npm run typecheck / lint → 0
```

Y el **barrido de secretos de `docs/PUBLICAR.md` §2** antes de cada commit.

---

## §8 Lo que este plan NO hace

- **No toca `docs/`, ni `README.md`, ni `MEMORY.md`** hasta F10 de la spec 009 y el
  cierre de esta. Se anotan entonces.
- **No añade dependencia.** Ni una. Todo con `zod`, `argon2` y Prisma, que ya están.
- **No toca los paneles existentes** salvo `AdminNavLinks`, que gana **un** enlace.
- **No arregla H5** (el navbar dice "Iniciar sesión" aun con sesión). Es otro punto.
