# Spec: Pingo POP — Gestión de cuentas de usuario (007-crear-usuarios)

> **Estado: BORRADOR. Pendiente de aprobación del propietario.**
> Fecha: 2026-10-06. Specs base: 001-pingo-rework, 006-user-profile, 009-legal-compliance-privacy.
>
> **El número 007 estaba reservado en prosa dentro de la spec 006** ("crear
> administradores desde `/admin/usuarios`"). La 008 y la 009 se numeraron aparte y
> la 007 quedó libre, así que aquí se respeta la reserva.

---

## 1. Problema

**Hoy no existe ninguna forma de gestionar cuentas de usuario desde el sitio.**

Evidencia, comprobada en el repositorio:

| Hecho | Dónde |
|---|---|
| La **única** cuenta `ADMIN` la crea `prisma/seed.ts` leyendo `ADMIN_PASSWORD` de `.env` | `prisma/seed.ts` |
| **No hay ninguna ruta de API de usuarios.** Ni una. | `src/app/api/` → 14 rutas, ninguna de usuarios |
| **No hay ningún panel de usuarios** | `src/app/admin/` → 3 paneles: productos, categorías, apariencia |
| Las cuentas `BUYER` las crea un **script manual** pensado para un comprador de prueba | `prisma/make-buyer.ts` |
| El README ya lo declara como límite: *"No existe registro de BUYER: solo el seed y scripts crean ese rol"* | `README.md` §Límites conocidos |

Consecuencias concretas:

1. **Si se pierde la cuenta de administración, la recuperación es por SSH**: entrar al
   servidor y ejecutar un script. Para un negocio de una persona eso significa que un
   Forget de contraseña el martes te deja el sitio sin panel hasta el fin de semana.
2. **No se puede quitar acceso** a quien ya no debería tenerlo, más que borrando la
   fila a mano.
3. **No se puede ver quién tiene cuenta.** El `User` existe desde la spec 001 y
   nadie lo lista nunca.

### Lo que esta spec NO viene a arreglar

- **No hay registro de compradores desde el público.** El formulario de cotización
  no pide cuenta y no debería empezar a pedirla: eso es un producto distinto, con su
  propia spec. Aquí la creación de `BUYER` existe **para que un ADMIN pueda crear
  otro ADMIN y tener una cuenta de respaldo**, y para recuperar los `BUYER` de
  prueba si se pierden.
- **No hay restablecimiento por correo.** El proyecto **no tiene proveedor de correo**
  (ni Resend ni SMTP ni nada: `legal-versions.test.ts` prohíbe incluso nombrar uno).
  Cualquier flujo que dependa de enviar un correo es inviable hoy, y esta spec no
  finge lo contrario.

---

## 2. Objetivo

Que un administrador pueda, **desde el navegador y sin tocar el servidor**:

1. **Ver** quién tiene cuenta, con su rol y cuándo se creó.
2. **Crear** una cuenta `ADMIN` o `BUYER` con una contraseña temporal.
3. **Obligar** a que esa contraseña se cambie en el primer acceso, de modo que el
   administrador que la creó **nunca conozca una contraseña que sobreviva**.
4. **Desactivar** una cuenta sin borrarla, lo que además invalida sus sesiones.

Y que todo esto **no existiera antes de decidirse**: la spec se aprueba antes de
escribir código.

---

## 3. Alcance

### Incluye

- **Una migración**: dos columnas nuevas en `User`, `debeCambiarContrasena` y `activo`.
- **`POST /api/admin/usuarios`**: crear. **`GET`**: listar.
- **`PATCH /api/admin/usuarios`**: cambiar rol, desactivar/reactivar, restablecer
  contraseña (lo que pone `debeCambiarContrasena` otra vez a `true`).
- **`/admin/usuarios`**: panel con las tres operaciones.
- **El cambio obligatorio**: el token de sesión lleva un distintivo y el `proxy`
  limita la sesión mientras siga puesto.
- **`src/lib/usuarios.ts`**: lógica pura (normalización de correo, política de
  contraseña por rol al crear, texto de confirmación) con sus tests.

### No incluye

- **Registro público.** Ni auto-alta ni "crear mi cuenta".
- **Restablecimiento por correo.** No hay proveedor, y añadir uno es otra spec.
- **Avatar, foto de perfil, apodo, preferencias.** Nada de eso.
- **Permisos finos.** Solo los dos roles que ya existen. No hay un tercero.
- **Auditoría de quién creó a quién.** Se anotará como deuda, no se inventa aquí.
- **Envío de correos de ningún tipo.**

---

## 4. Requisitos funcionales (EARS)

- **RF-1:** EL SISTEMA **debe** exponer `/admin/usuarios` **solo** a un `ADMIN`
  autenticado; sin sesión responde **307** a `/login`, y con un rol distinto de
  `ADMIN` responde **403**.
- **RF-2:** EL SISTEMA **debe** listar en `/admin/usuarios` el correo, el nombre, el
  rol, la fecha de creación y el estado (`activo` / `desactivado` /
  `debe cambiar la contraseña`) de **todas** las cuentas, **sin** contraseñas ni
  hashes.
- **RF-3:** EL SISTEMA **debe** permitir a un `ADMIN` autenticado crear una cuenta
  `ADMIN` o `BUYER` con correo, nombre opcional y una contraseña que **cumpla la
  política del rol** (ver §5.3).
- **RF-4:** Si el correo ya existe, el sistema **debe** responder **409** y **no**
  crear una segunda cuenta. El correo es la identidad de la cuenta y ya es `@unique`
  en el esquema, así que esto no es una decisión de diseño sino dejar de convertir un
  error de base de datos en un 500.
- **RF-5:** Toda cuenta creada desde el panel **debe** nacer con
  `debeCambiarContrasena = true`, y **no** con una contraseña que el administrador
  conserve.
- **RF-6:** EL SISTEMA **no debe** emitir una sesión con permisos administrativos
  mientras `debeCambiarContrasena` sea `true`: la sesión queda **limitada a
  `/perfil`** y **`/admin/*` le responde 403**.
- **RF-7:** Al cambiar la contraseña desde `/perfil`, el sistema **debe** poner
  `debeCambiarContrasena = false`, **debe** cerrar la sesión actual —como ya hace
  hoy `POST /api/account/password`— y al volver a entrar la cuenta **ya no** queda
  limitada.
- **RF-8:** EL SISTEMA **debe** permitir **desactivar** una cuenta sin borrarla.
  Desactivar **debe** impedir el inicio de sesión y **debe** invalidar las sesiones
  vivas de esa cuenta.
- **RF-9:** EL SISTEMA **debe** permitir **reactivar** una cuenta desactivada y
  **debe** permitir **restablecer** su contraseña, lo que **vuelve a poner**
  `debeCambiarContrasena = true`.
- **RF-10:** Un administrador **no debe** poder desactivar ni borrar **su propia**
  cuenta. Es el error que deja el sitio sin nadie que pueda administrarlo.
- **RF-11:** El sistema **no debe** exponer ninguna operación que borre físicamente
  una cuenta en esta spec. Desactivar es la operación de retirada.
- **RF-12:** Si el proceso **no puede** comprobar la revocación de la sesión, **debe**
  denegar (**fail closed**), igual que ya hace `getSessionUser()`.

---

## 5. Decisiones

### 5.1 — **D21: contraseña temporal con cambio obligatorio**

**Decidido por el propietario.** El administrador escribe una contraseña al crear la
cuenta y se la dice de viva voz a la persona. Al entrar por primera vez, el sistema
**le obliga** a cambiarla.

**Alternativas descartadas:**

- *El administrador fija la contraseña final.* Sin migración, pero el administrador
  conserva una contraseña que funciona para siempre, y nada obliga a que el usuario la
  cambie. Rompe la intención de fondo.
- *Invitar por correo con token.* **Imposible**: no hay proveedor de correo.
- *Cuenta sin contraseña.* Deja una ventana en la que existe una cuenta que nadie
  puede usar.

**Consecuencia asumida:** el administrador conoce una contraseña *temporal* que
funciona hasta que el usuario entre. Por eso **RF-6** le quita el acceso a
`/admin/*`: con una contraseña temporal no se tocan cotizaciones ni datos legales.
El daño se limita a `/perfil`.

### 5.2 — **D22: cualquier `ADMIN` puede crear otro `ADMIN`**

**Decidido por el propietario.** Quien llega al panel ya es de fiar; en un negocio de
una o dos personas, un segundo administrador no es una amenaza.

**Alternativa descartada:** *solo el `ADMIN` del seed puede crear `ADMIN`*. Deja la
superficie de escalada mínima, pero **conserva exactamente el problema que se viene a
arreglar**: si se pierde esa cuenta, se vuelve a SSH.

### 5.3 — La política de contraseña es la que ya existe

`meetsPasswordPolicy(password, rol)` de `src/lib/account-schema.ts`:

| Rol | Longitud | Complejidad |
|---|---|---|
| `BUYER` | **8+** | ninguna |
| `ADMIN` | **12+** | mayúscula, minúscula, dígito y puntuación |

**No se inventa una política nueva.** Se reutiliza la de la spec 006, y por eso crear
una cuenta **no** baja el suelo: un `ADMIN` nuevo nace con 12+ símbolos, no con 8.

### 5.4 — **D23: desactivar, no borrar**

`User` **no tiene ninguna relación**: nada en el esquema referencia `userId`, así que
borrar la fila no rompe nada técnicamente. Aun así, esta spec **no borra cuentas**
(RF-11), por dos razones: se pierde el registro de que la cuenta existió, y no hay
ningún log de auditoría que lo reconstruya.

Desactivar **no** es solo una bandera: **invalida las sesiones vivas**, porque al
desactivar se incrementa `sessionVersion` y toda cookie emitida antes queda en una
versión anterior. Es el mecanismo que ya usa el cambio de contraseña.

### 5.5 — **D24: la sesión limitada viaja marcada en la cookie, y se revalida en servidor**

Cómo se entera el sistema de que una sesión está limitada, sin correo y sin base de
datos en el `proxy` (que corre en **Edge**):

- Al iniciar sesión, si `debeCambiarContrasena` es `true`, el token lleva `swc: 1`.
- El **`proxy`** lee `swc` de la cookie (que va firmada) y **manda a `/perfil`**
  cualquier página que no sea `/perfil`, y responde **403** a `/admin/*`.
- **`getSessionUser()` relee `debeCambiarContrasena` de la base de datos** y **pisa**
  el valor de la cookie, exactamente igual que ya hace con el rol. La cookie manda
  para la decisión rápida del `proxy`; **la base de datos manda** para la autoridad.

Un `swc` ausente se interpreta como `0`, igual que se hace hoy con `sv`: al desplegar,
las cookies ya emitidas no deben expulsar a nadie.

### 5.6 — Límite conocido y aceptado

**El `proxy` corre en Edge y no puede revocar.** Con una cookie marcada `swc: 1` y
`sv` correcto, el `proxy` **no puede saber** que la cuenta se desactivó después. La
revocación real llega al pedir datos (`getSessionUser()`). Esto es **el mismo límite
que ya arrastra `/admin/*`** y está documentado como tal: no se amplía, no se oculta.

---

## 6. Modelo de amenazas (lo que aplica de STRIDE)

| # | Amenaza | Mitigación |
|---|---|---|
| T1 | **Escalada de privilegios**: un `ADMIN` crea otro `ADMIN` y hay dos donde debía haber una | **Aceptado por decisión del propietario (D22)**. Se deja escrito para que sea una decisión consciente y no un descuido |
| T2 | ** robo de identidad por correo**: alguien crea una cuenta con el correo de otra persona | El sistema **no envía correo** (no hay proveedor), así que la suplantación no tiene Vector de ataque: nadie recibe nada. Se anota el riesgo para cuando haya correo |
| T3 | **Contraseña temporal que nunca se cambia** | RF-5 obliga el cambio; RF-6 quita `/admin/*` mientras siga puesta; el `proxy` no deja salir de `/perfil` |
| T4 | **Denegación de servicio por autoexclusión** | RF-10: nadie puede desactivar su propia cuenta |
| T5 | **Puerta trasera por `GET`**: que exista un listado público de cuentas | RF-1 y RF-2: el listado es de `ADMIN`, y **no** hay ninguna ruta pública de usuarios |
| T6 | **Fuga de hashes** | RF-2: el listado **no** incluye `passwordHash`. Un hash de argon2id en una respuesta HTTP es una fuga aunque no se pueda revertir |
| T7 | **Fallo abierto** | RF-12: si no se puede comprobar la revocación, se deniega |
| T8 | **Correo duplicado que se traga un error de base de datos** | RF-4: `P2002` se traduce a **409**, no a 500 |

**Fuera de modelo, y dicho**: el límite de intentos de login sigue siendo **5 por IP
cada 15 minutos, en memoria**. Esta spec **no lo cambia** porque ya está anotado como deuda
(F8/T16) y porque un rate limit en memoria no reparte entre instancias.

---

## 7. Verificación

| # | Qué se comprueba | Cómo |
|---|---|---|
| **V1** | `/admin/usuarios` sin sesión | **307** a `/login` (navegador, no `fetch`) |
| **V2** | Con `BUYER` | **403**, y la página no pinta el formulario |
| **V3** | El listado **no** contiene `passwordHash` | Se busca la cadena en el HTML y en el JSON de la API |
| **V4** | Correo duplicado | **409**, y `SELECT COUNT(*)` de usuarios con ese correo = **1** |
| **V5** | Correo inválido o contraseña que no cumple la política | **400**, y **cero** filas creadas |
| **V6** | Cuenta nueva nace con `debeCambiarContrasena = true` | `SELECT` de la columna, no mirando el panel |
| **V7** | Login con la temporal → sesión **limitada** | Navegador: `/admin/productos` da **403**, `/` rebota a `/perfil`, `/perfil` **funciona** |
| **V8** | Tras cambiar la contraseña, la cuenta queda libre | Entrar con la nueva: `/admin/productos` da **200** |
| **V9** | Desactivar invalida las sesiones vivas | Con la sesión abierta, desactivar y luego pedir datos → **401** |
| **V10** | No se puede desactivar la propia cuenta | **400** y la cuenta sigue activa |
| **V11** | **No existe ninguna ruta que borre una cuenta** | `grep` de verbos `DELETE` en `src/app/api/admin/usuarios` |
| **V12** | El `proxy` no filtra el `passwordHash` ni el correo en ninguna respuesta | Inspección del HTML servido |
| **V13** | Los dos ADMIN pueden verse mutuamente en el panel | Navegador, dos sesiones |

---

## 8. Riesgos de la implementación

1. **Tocar `session-token.ts** afecta a **todas** las sesiones del sitio.** Un error
   ahí cierra el panel entero. Los tests de `session-token.test.ts` son la red: **no
   se toca ese fichero sin correrlos antes y después**.
2. **Tocar el `proxy` tiene el mismo riesgo.** Un `swc` mal leído manda a un usuario
   legítimo a un bucle de redirecciones.
3. **La migración toca `User`, que tiene datos.** Con `STRICT_TRANS_TABLES` activo, se
   comprueba el `COUNT(*)` **antes y después**, y se usa
   `migrate diff` + `migrate deploy`, no `migrate dev` a pelo.
4. **`getSessionUser()` relee el rol.** Añadir una columna más a ese `select` es
   barato, pero si se olvida el `swc` en el `return`, el límite se pierde en silencio.

---

## 9. Lo que sigue fuera, y no es un olvido

- **Log de auditoría** de quién creó a quién y quién desactivó a quién. Es un
  requisito real de un panel de administración, y **esta spec no lo cubre**. Se anota
  como spec propia.
- **Rate limit en el panel de usuarios.** Hereda el límite de login en memoria.
- **Envío de credenciales.** Sin proveedor de correo.
- **Recuperación de la cuenta propia** si se olvida la contraseña estando dentro. Hoy
  el cambio de contraseña pide la actual; forgotten esa, es SSH otra vez.

---

## 10. Pendiente de tu confirmación antes de escribir una línea

1. **¿El flujo de cambio obligatorio es el del §5.5** —cookie marcada `swc`, `proxy`
   limitando a `/perfil` y a nada más, con la base de datos mandando en
   `getSessionUser()`? La alternativa descartada era no emitir **ninguna** sesión
   hasta cambiar la contraseña, que es más estricto pero necesita un token nuevo y
   rompe el login actual.
2. **¿Migración de dos columnas** (`debeCambiarContrasena` y `activo`) o solo la
   primera? Lo segundo deja sin forma de quitar acceso sin borrar.
3. **¿Se incluye el panel completo** (listar, crear, desactivar, restablecer) o se
   recorta a lo mínimo —crear y listar— y el resto se deja para después?

**Refs**: `specs/006-user-profile` (políticas de contraseña y revocación),
`specs/009-legal-compliance-privacy` (patrón de panel y de `requireAdmin()`).
