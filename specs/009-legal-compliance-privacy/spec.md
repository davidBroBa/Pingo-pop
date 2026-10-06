# Spec: Pingo POP — Cumplimiento legal, privacidad, seguridad y accesibilidad (009-legal-compliance-privacy)

> **Estado: BORRADOR** (pendiente de aprobación del usuario).
> Fecha: 2026-10-06. Specs previas: `001-pingo-rework`, `002-cartoon-visual`,
> `006-user-profile` (sesiones y revocación), `008-site-and-category-images` (imágenes).
> **Origen:** el usuario aportó un documento de 50 secciones ("Compliance Legal, Privacidad,
> Seguridad y Protección Internacional"), que ordena explícitamente inspeccionar el proyecto
> antes de modificar nada y no inventar información legal.
>
> **D20 (2026-10-06, decisión del usuario): los documentos legales son un
> ENTREGABLE, no un borrador.** Se eliminó la marca `REQUIERE REVISIÓN DE PROFESIONAL
> LEGAL` de todas las páginas. Los textos son definitivos y describen **lo que el
> negocio realmente hace**, verificado contra el código. El usuario es quien decide
> su propia exposición legal.
>
> **El único límite que se mantiene** (RF-8): ninguna página afirma **cumplimiento
> total** de ninguna legislación. Donde la ley obliga, el texto expresa un
> **compromiso concreto y comprobable** del negocio, no una declaración de que se
> cumple la norma. Un compromiso se puede cumplir; una declaración de cumplimiento
> no se puede comprobar, y por eso no se escribe.

---

## 1. Diagnóstico inicial (§1 del documento del usuario, exigido ANTES de implementar)

La inspección se hizo sobre el árbol real, no sobre documentación. Resultado por requisito:

| # | Requisito del documento | ESTADO | ARCHIVOS | RIESGO | CAMBIO NECESARIO |
|---|---|---|---|---|---|
| 4 | Datos del responsable | **FALTANTE** | — | **Crítico** | **Bloqueante**: no hay razón social, RFC, domicilio, correo ni teléfono en el repositorio |
| 8 | Inventario de cookies y tracking | **COMPLETO** | — | — | Ninguno: ver §2 |
| 9 | Términos y condiciones | **FALTANTE** | — | Alto | Crear página y versionado |
| 10 | Comercio electrónico (checkout) | **NO APLICA** | — | — | Ver §2.2 |
| 13 | Información legal | **FALTANTE** | — | Alto | Crear página; datos bloqueados |
| 14 | Contacto y reclamaciones | **FALTANTE** | `src/app/contacto/page.tsx` | **Crítico** | La página existe **vacía**: sin correo ni teléfono |
| 15 | Seguridad del frontend | **COMPLETO** | `next.config.ts` | Bajo | Ninguno; ver §2.1 |
| 16 | Seguridad del backend | **COMPLETO** | `src/lib/validation.ts`, `prisma-error.ts`, `require-admin.ts` | Bajo | Ninguno |
| 17 | Autenticación | **PARCIAL** | `src/lib/auth/*` | Medio | Sin recuperación de contraseña (§2.3) |
| 18 | Autorización / IDOR | **COMPLETO** | todas las rutas `admin` y de cuenta | Bajo | Ninguno |
| 19 | Rate limiting | **PARCIAL** | `src/lib/rate-limit.ts` | Medio | 3 rutas cubiertas, 8 sin cubrir |
| 20 | Logging | **COMPLETO** | 14 `console.*` | Bajo | Ninguno: no se loggea ninguna credencial |
| 21 | Auditoría de consentimientos | **FALTANTE** | - | Medio | Modelo nuevo, ver RF-19 y RF-20 |
| 22 | Versionado de documentos | **FALTANTE** | - | Medio | Modelo nuevo, ver RF-6 y RF-20 |
| 23 | Pagos | **NO APLICA** | — | — | No hay pasarela de pago |
| 25 | Email transaccional / marketing | **NO APLICA** | — | — | No se envía ningún correo |
| 26 | Accesibilidad (objetivo WCAG 2.2 AA) | **PARCIAL** | CSS co-ubicado | Medio | Hay foco visible y landmarks; **no hay auditoría ni declaración** |
| 30 | Retención y eliminación | **FALTANTE** | — | Alto | `QuoteRequest` se guarda indefinidamente; no hay forma de borrar |
| 32 | Secretos | **COMPLETO** | `.gitignore`, `.env` | Bajo | Ninguno |
| 33 | Errores sin fuga de información | **COMPLETO** | `src/lib/prisma-error.ts` | Bajo | Ninguno |
| 34 | Dependencias | **COMPLETO** | `package.json` | Bajo | `npm audit`: 8 altas residuales ya justificadas |
| 36 | Propiedad intelectual | **PARCIAL** | `public/images/`, fuentes | **Alto** | **No hay/licencias de origen de las imágenes ni de las fuentes sin documentar** |
| 37 | Contenido de usuarios | **NO APLICA** | — | — | No hay reseñas ni comentarios |
| 38 | Menores | **NO APLICA** | — | — | No hay registro público; solo el admin crea cuentas |
| 40 | API y mínimo privilegio | **COMPLETO** | todas las rutas | Bajo | Ninguno: nunca se devuelve `passwordHash` |
| 41 | Base de datos | **PARCIAL** | `schema.prisma` | Bajo | Correcta; falta política de retención |
| 42 | Checkout e idempotencia | **NO APLICA** | — | — | No hay checkout |
| 45 | Pruebas | **PARCIAL** | `tests/` | — | 11 de las 25 pruebas listadas **no aplican** |

---

## 2. Hallazgos que cambian el alcance

### 2.1 Lo que ya está completo (y no hay que tocar)

Estos requisitos del documento ya están resueltos. **Reescribirlos sería una regresión.**

- **Cero cookies no esenciales.** No hay analytics, ni píxeles, ni SDK, ni scripts de
  terceros, ni CDN, ni fuentes externas. La **única cookie** es `pp_session`
  (`src/lib/auth/session-token.ts:231`) con `httpOnly: true`, `secure` en producción,
  `SameSite: "Lax"`, `path: "/"` y caducidad de 8 horas. La **única clave** de
  `localStorage` es `pingo-quote-cart` (`src/lib/quote-cart-storage.ts:19`), que es
  **funcional**: sin ella no se puede enviar una cotización.
- **Cabeceras de seguridad completas** (`next.config.ts`): CSP con `frame-ancestors 'none'`
  y `object-src 'none'`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` sin cámara ni
  micrófono, HSTS con `preload`, `COOP`, `CORP` y `X-DNS-Prefetch-Control: off`.
- **Argon2id** para contraseñas; sesión firmada con HMAC-SHA256 **y revocable** (`sv`);
  cambio de contraseña que cierra todas las sesiones.
- **Validación Zod en el borde** en las 11 rutas; **`requireAdmin()`** además del middleware;
  **`describePrismaError`** traduce errores de Prisma a 4xx/5xx sin filtrar SQL ni stack.
- **La IP no se persiste**: `clientKey()` (`src/lib/rate-limit.ts:81`) la lee de
  `x-forwarded-for` solo como clave de un cubo **en memoria**. No va a la base de datos ni
  a los logs. Eso debe decirlo el aviso de privacidad con precisión.

### 2.2 Las políticas de compra y reembolso **sí aplican**, adaptadas (D19)

**Corrección respecto al borrador de esta spec.** Decía que §10, §11 y §42 "no aplican"
porque no hay pago. El usuario lo corregió: **la venta existe**, lo que no existe es el
**cobro en línea**. La venta se cierra por correo electrónico o por el canal que Pingo POP
use, después de responder una cotización.

Eso cambia qué hay que publicar, y lo cambia a mejor: lo que el documento pide es
precisamente lo que un comprador mayorista necesita saber.

**Lo que sí aplica, adaptado:**

| Del documento | Adaptado a Pingo POP |
|---|---|
| §10 Resumen antes de finalizar | La página `/cotizacion` **ya** muestra producto, cantidad, precio unitario, subtotal y total. Se le añade que **es una solicitud, no un pago**, y que el precio es el de catálogo hasta confirmar |
| §11 Reembolsos | **No hay reembolso**: no se ha cobrado nada. Lo que hay es (a) **cancelación** de la solicitud y (b) **garantía** del producto una vez entregado. Las dos van en su propia página |
| §42 Idempotencia de checkout | **Sí aplica y es un riesgo real**: si el visitante pulsa "enviar" dos veces, se crean **dos solicitudes**. Hoy `POST /api/quotes` **no es idempotente**. Ver RF-27 |
| §23 Pagos | **No aplica**: sin pasarela, sin tarjeta, sin CVV. `docs/THREATS.md` lo declarará |

**Lo que sigue sin aplicar:**

- **Envío de correo** (§25): no hay proveedor. La política lo dirá con esas palabras, sin
  mencionar a nadie que no exista.
- **Registro público** (§5, §38): solo el `seed` crea cuentas. No hay vía por la que un
  menor se registre, así que **§38 no aplica**.
- **Contenido de usuarios** (§37): no hay reseñas ni comentarios.

**Aviso importante sobre el estado de una solicitud.** `QuoteRequest.status` es un
`String` libre con valor inicial `PENDING`, y **nadie lo lee ni lo cambia** (ver §2.4). La
política **no puede** prometer un plazo de respuesta ni un estado de seguimiento que el
sistema no tiene. Dirá los estados que existan, y marcará `REQUIERE REVISIÓN DE
PROFESIONAL LEGAL` el plazo de respuesta. **Prometer un plazo que el software no cumple es
justo lo que el §43 del documento prohíbe.**

### 2.4 ⚠️ Hallazgo bloqueante: las cotizaciones se crean y **nadie las ve**

En todo el repositorio, `prisma.quoteRequest` aparece **una sola vez**: en el `create` de
`src/app/api/quotes/route.ts:43`. **No hay ninguna lectura.**

- No existe `/admin/cotizaciones`.
- No existe ninguna ruta de API que **liste** solicitudes.
- El campo `status` es un `String` libre que **nadie escribe ni consulta**: está muerto.

Es decir: el sitio público recoge solicitudes de cotización y el negocio **no puede verlas
por la aplicación**. Hoy solo se verían consultando la base de datos a mano.

**Esto bloquea directamente tres cosas que el documento pide:**

| Requisito | Por qué lo bloquea |
|---|---|
| §11 / D19 · Cancelación de una solicitud | **No se puede cancelar lo que no se ve** |
| §30 / D15 · Retención de 12 meses | **No se puede encontrar ni borrar lo que no se ve** |
| §11 · Aceptar, rechazar o responder | El estado no existe de hecho |

**Por eso esta spec incluye un panel de cotizaciones** (`/admin/cotizaciones`) con listado,
detalle, cambio de estado y borrado. **No es una página legal: es un módulo funcional que
falta**, y es prerrequisito de las políticas legales. Sin él, las políticas de cancelación
y retención serían texto que el sistema no puede cumplir, es decir, exactamente lo que el
§43 del documento prohíbe.

**Este bloque se traduce en RF-25 a RF-28** (§6.7): el panel existe con **estado como
enumeración validada** en vez de `String` libre, y es la **única** vía por la que se borra
una solicitud. La vía pública sigue siendo **solo de creación**, igual que hoy: nadie
puede listar ni leer solicitudes ajenas.

### 2.3 Lo que el documento pide y NO tiene sentido aquí

- **§5 "registro":** no hay registro público. Los derechos ARCO se ejercen **por escrito**,
  no desde la cuenta. La sección de derechos debe decirlo así, no prometer un botón que no
  existe.
- **§27 recuperación de contraseña:** **no existe y no se implementa aquí.** Requeriría un
  proveedor de correo (§25 no aplica hoy), una tabla de tokens y un flujo de caducidad: es
  otro sistema completo. Se documenta como **deuda** y el aviso de privacidad **dice que no
  existe**, en vez de insinuar que sí.

---

## 3. Los datos legales: faltan, pero **no bloquean** (D18)

El documento ordena **no inventar** razón social, RFC, domicilio, teléfono, correo,
proveedor ni plazos. Repitiéndolo: **no voy a inventar ni un solo dato.**

Hoy el repositorio **no contiene ningún dato de contacto**: `siteConfig.links` tiene las
cuatro redes sociales vacías y `/contacto` no muestra ni un correo.

| Campo | Estado | Nota |
|---|---|---|
| Nombre comercial | **CONOCIDO** | "Pingo POP" |
| Razón social | **PENDIENTE DEL PROPIETARIO** | ¿Persona física con actividad empresarial o moral? |
| RFC | **PENDIENTE DEL PROPIETARIO** | |
| Domicilio fiscal | **PENDIENTE DEL PROPIETARIO** | Para el aviso de privacidad la LFPDPPP lo exige |
| Correo de contacto | **PENDIENTE DEL PROPIETARIO** | Puede ser el mismo de las solicitudes de privacidad |
| Teléfono | **PENDIENTE DEL PROPIETARIO** | Opcional si el aviso no lo exige |
| Responsable de privacidad | **PENDIENTE DEL PROPIETARIO** | Nombre y cargo |
| Retención de cotizaciones | **DECIDIDA (D15)** | **12 meses** |

### 3.1 Cómo se rellenan: panel de administración, no variables de entorno

El usuario decidió que el administrador los suba **desde el panel**. Es mejor que la
propuesta original por dos razones concretas: no hace falta SSH para cambiar un dato legal,
y **los datos legales editables por quien administra el sitio es lo normal** en un negocio
real.

- **`LegalData` es de una sola fila** (`id` fijo a `1`), igual que `SiteSettings`: id fijo y
  `upsert`, para que no se acumulen filas ni se lea una al azar. Ver **RF-1**.
- **`/admin/legal` muestra el formulario** con todos los campos y **avisa de cuáles
  faltan** antes de que se publiquen las páginas. Un aviso sin medio de contacto es peor
  que no publicarlo, así que el aviso tiene que verse. Ver **RF-3**.
- **El marcador es una constante única**, `[REQUIERE DATO DEL PROPIETARIO]`, para que no
  pueda quedar escrito a mano en dos sitios distintos. Ver **RF-2**.

**No hay variables de entorno para los datos legales**, y por tanto **no se rompe el build**
si faltan: las páginas se despliegan hoy, con marcadores, y quedan correctas en cuanto el
propietario los rellene desde el panel. Es lo que pidió el usuario (D18) y evita que un
despliegue dependa de un dato que todavía no existe.

**Único dato que sí es responsabilidad del despliegue:** la URL base del sitio, que hoy no
existe en ninguna variable, porque sin ella el sitemap no se puede construir. Se añade
`SITE_URL` a `.env.example`.

---

## 4. Decisiones del usuario (cerradas el 2026-10-06)

El usuario respondió las cinco y además añadió dos. **Ninguna queda pendiente.**

- **D14 (era Q1) — El banner de cookies aparece SOLO cuando hay alguna tecnología no
  esencial.** Hoy no hay ninguna, así que **no se ve nada**. La infraestructura se
  construye igualmente y el panel aparece solo cuando `TECNOLOGIAS_NO_ESENCIALES` tenga
  algo. Un banner que pide permiso para una cookie necesaria y un carrito funcional es
  ruido, y un banner donde "rechazar" queda disabled es justo el patrón que la LFPDPPP
  marca como mala práctica.
- **D15 (era Q2) — La retención de las solicitudes de cotización es de 12 meses.**
- **D16 (era Q3 y Q4) — El registro de aceptación y `robots`/`sitemap` se hacen de la forma
  más sólida legalmente posible.** Lo decidió el modelo; el criterio está en RF-19 a RF-21:
  el registro guarda **tipo, versión y fecha**, y **ni IP ni datos personales propios**,
  porque el vínculo con la persona ya existe a través de `QuoteRequest`. Recoger más sería
  recolectar sin finalidad, que es justo lo que se penaliza.
- **D17 (era Q5) — Una sola spec**, en 11 bloques (F0–F10).
- **D18 (nueva) — Los datos legales NO bloquean el trabajo, y además el administrador
  debe poder **subirlos desde el panel**, no por SSH.** Ver §3.1.
- **D19 (nueva) — Las políticas de compra, cancelación y reembolso **sí aplican**,
  adaptadas a solicitudes de cotización.** Ver §2.2, que estaba mal planteada en el
  borrador de esta spec y queda corregida.

### 4.1 Lo que D14 significa en la práctica

**Cero cookies no esenciales hoy.** El panel se construye y se activa solo; no se enseña
nada mientras `TECNOLOGIAS_NO_ESENCIALES` esté vacío. Verificado con V6.

---

## 5. Fuera de alcance (explícitamente)

- **Pagos, checkout, tokenización de tarjeta** (§10, §23, §42). No hay ni habrá pasarela
  sin otra spec.
- **Envío de correo** (§25). No hay proveedor.
- **Recuperación de contraseña** (§17). Requiere correo.
- **Registro público de usuarios** (§5, §38).
- **Reseñas, comentarios o fotos de clientes** (§37).
- **Envíos internacionales, precios internacionales** (§2 del documento). México.
- **Módulos de bloqueo por IP** (§28). Bloquear por IP es precisamente lo que el documento
  prohíbe por defecto; ver RF-36.
- **Rediseño visual.** No se toca `docs/DESIGN.md` ni la paleta.

---

## 6. Requisitos funcionales (EARS)

### 6.1 Bloque de datos legales (D18)

- **RF-1:** EL SISTEMA obtiene los datos legales del responsable desde el modelo `LegalData`
  (**una sola fila**, `id` fijo a `1`, leída con `upsert`), **nunca** desde literales en el
  código.
- **RF-2:** SI un dato legal no está rellenado, EL SISTEMA muestra el marcador
  `[REQUIERE DATO DEL PROPIETARIO]` en su lugar, y **nunca** un valor inventado. El
  marcador es **una constante única**, no texto escrito a mano en cada página.
- **RF-3:** `/admin/legal` permite **guardar todos los datos legales** y **avisa de cuáles
  faltan** antes de que se publiquen las páginas legales. Ningún otro camino puede
  escribirlos.
- **RF-4:** `.env.example` documenta `SITE_URL` (la **única** variable nueva) con su
  propósito. `.env` sigue ignorada. **No hay variables para los datos legales** (D18).

### 6.2 Documentos legales

- **RF-5:** EL SISTEMA expone **siete** páginas nuevas — `/terminos-y-condiciones`,
  `/aviso-de-privacidad`, `/politica-de-cookies`, `/politica-de-envios`,
  `/cambios-y-devoluciones`, `/informacion-legal` y `/accesibilidad` — y **reescribe
  `/contacto`**, que ya existe pero está **vacía**: pasa a mostrar los datos legales reales.
  Son **ocho superficies legales** en total. Todas leen `LegalData`, así que todas se
  renderizan en cada petición (`ƒ`); ver V18.
- **RF-6:** Cada documento declara su **versión** y su **fecha de última actualización**,
  tomadas de un único módulo, no escritas a mano en cada página.
- **RF-7:** MIENTRAS el proyecto no envíe correo, el aviso de privacidad **dice que no se
  envían comunicaciones electrónicas**, y las políticas **no mencionan** a ningún
  proveedor de correo, de pago o de analítica que no exista.
- **RF-8:** NINGUNA página afirma **cumplimiento total** de ninguna legislación, ni dice
  "cumple todas las leyes" ni "100% conforme". Donde la ley obliga a algo, la página
  expresa un **compromiso concreto y verificable del negocio** ("responde en un plazo
  máximo de 20 días hábiles"), no una afirmación de cumplimiento. Un compromiso se
  puede cumplir y comprobar; una declaración de cumplimiento, no.
- **RF-9:** `/politica-de-cookies` describe **exactamente** lo que el código hace: una
  cookie `pp_session` (necesaria, 8 h, `HttpOnly`, `SameSite=Lax`, `Secure` en producción)
  y una clave `pingo-quote-cart` en `localStorage` (funcional). **Ninguna** entrada
  corresponde a una tecnología que el repositorio no tenga. Se verifica contra
  `src/lib/auth/session-token.ts`, no de memoria.
- **RF-10 (D19):** Las políticas de **compra, cancelación, devolución y reembolso se
  escriben para solicitudes de cotización**, y dicen sin rodeos **que no hay pago en
  línea** y **que el precio mostrado es el de catálogo hasta confirmar la cotización**.
  `/cotizacion` muestra el desglose y advierte de que enviar **no** es comprar.
- **RF-11 (D19):** La política **no promete un plazo de respuesta** que el sistema no
  cumple. Describe los estados que existen (§2.2). Si se fija un plazo de respuesta, es un
  **compromiso del negocio** con una cifra concreta, no una promesa automática.

### 6.3 Derechos del usuario

- **RF-12:** EL SISTEMA documenta en el aviso de privacidad cómo ejercer **acceso,
  rectificación, cancelación, oposición y eliminación**, con el medio de contacto real, y
  dice **explícitamente** que se hace **por escrito** y respondiendo por correo.
- **RF-13:** EL SISTEMA **no ofrece** botón de "borrar mi cuenta" ni de "descargar mis
  datos", y el aviso **no dice** que existan. No hay registro público, así que no hay
  cuenta que borrar desde la web: se borra desde la base de datos, por el administrador.
- **RF-14:** La vía por la que se atiende una cancelación o una eliminación es el **panel de
  cotizaciones** (RF-24), donde el administrador **elimina la solicitud** y sus
  `QuoteRequestItem` en la misma operación.

### 6.4 Consentimiento y versionado (D14)

- **RF-15:** MIENTRAS `TECNOLOGIAS_NO_ESENCIALES` esté vacío, EL SISTEMA **no muestra
  banner** de consentimiento **y no escribe nada** en `localStorage` ni en cookies para
  registrar consentimiento. No se recolecta un dato que no se necesita. El motivo está
  documentado en el código.
- **RF-16:** SI `TECNOLOGIAS_NO_ESENCIALES` declara alguna tecnología, EL SISTEMA muestra un
  panel con las **cuatro** categorías (**necesarias, analíticas, marketing, preferencias**)
  y **tres** vías: **aceptar**, **rechazar** y **configurar**.
- **RF-17:** "Aceptar" y "Rechazar" son **accesibles de la misma manera**: mismo componente,
  mismo tamaño y mismo peso. No hay ninguna variante donde una sea un enlace o un texto
  atenuado. El test lo comprueba **contando las clases**, no a ojo.
- **RF-18:** El panel se puede **reabrir** desde el pie de página, con un enlace visible en
  todas las páginas, y **cambiar una decisión previa pide confirmación** en vez de
  sobrescribir en silencio.

### 6.5 Registro de aceptación (D16)

- **RF-19:** EL SISTEMA registra la aceptación de documentos legales **solo** ante una
  **acción afirmativa con sujeto identificable**, y hoy esa acción es **una sola**: el
  **envío de una cotización**. MIENTRAS el visitante solo navega, NO registra nada.
  **No se registra en el alta de cuenta porque no existe tal alta**: `/api/account/*` solo
  modifica la cuenta del usuario ya identificado, y el alta inicial la hace el `seed`. Si la
  spec 007 crea un alta de usuarios, **esa spec** tiene que decidir si ahí se acepta, y no
  esta.
- **RF-20:** Cada registro guarda exactamente **cuatro** campos: `tipo`, `version`,
  `aceptadoAt` y `quoteRequestId` cuando existe. **No** guarda IP, ni nombre, ni correo,
  ni un identificador de usuario que no haga falta: el vínculo con la persona ya existe a
  través de `QuoteRequest`.
- **RF-21:** EL SISTEMA puede **consultar** qué versión aceptó una solicitud concreta, desde
  el panel de cotizaciones. Es lo que permite demostrar qué texto estaba vigente.

### 6.6 Retención (D15)

- **RF-22:** EL SISTEMA conserva una solicitud de cotización **12 meses** desde su
  `createdAt`. Cumplidos los 12 meses, **queda marcada para revisión**: el sistema **no
  borra sola**, avisa. El borrado lo decide una persona. Motivo: un borrado automático y
  silencioso es irreversible, y una solicitud puede estar en litigio.
- **RF-23:** Una solicitud **en curso** (estado distinto de los terminales) **nunca** se
  marca por antigüedad, aunque tenga más de 12 meses.
- **RF-24:** El panel muestra **cuántas** solicitudes han superado los 12 meses y permite
  borrarlas una a una. El borrado es **de los dos lados**: `QuoteRequest` y
  `QuoteRequestItem`, en la misma operación, en una transacción.

### 6.7 Panel de cotizaciones (§2.4, prerrequisito de RF-14, RF-22 y RF-24)

- **RF-25:** EL SISTEMA expone `/admin/cotizaciones` con **listado**, **detalle** y
  **cambio de estado**. Sin esto, las políticas legales describirían algo que no existe.
- **RF-26:** El estado pasa de `String` libre a **enumeración validada**
  (`PENDING`, `QUOTED`, `ACCEPTED`, `REJECTED`, `CANCELLED`). Los estados terminales son
  `ACCEPTED`, `REJECTED` y `CANCELLED`, y son los que.counting para la retención (RF-23).
  La migración **mapea** el `PENDING` existente y no borra ninguna fila.
- **RF-27:** `POST /api/quotes` es **idempotente**: dos envíos seguidos del mismo
  navegador **no** crean dos solicitudes. Sin esto, un doble clic duplica la solicitud y el
  negocio recibe trabajo duplicado. La clave de idempotencia es un token que genera el
  cliente, **no** la IP (que es del Visitor, no del solicitante).
- **RF-28:** La **vía pública** sigue siendo **solo de creación**. No existe ninguna ruta
  pública que liste o lea solicitudes, y ninguna que las borre.

### 6.8 Accesibilidad

- **RF-29:** `/accesibilidad` declara el **estándar objetivo** (WCAG 2.2 AA), explica cómo
  reportar un problema y **no afirma conformidad**. El texto empieza por "Pingo Pop trabaja
  para mejorar continuamente la accesibilidad de su sitio", tal como indica el documento.
- **RF-30:** La auditoría **documenta el estado real**: navegación por teclado, foco visible,
  contraste de `docs/DESIGN.md`, etiquetas, mensajes de error, alternativas textuales,
  encabezados y estructura. Lo que **no** se comprueba **se dice que no** está comprobado.
- **RF-31:** La auditoría **no declara conformidad AA**. Su resultado es una **lista de
  hallazgos con gravedad**, no un sello.

### 6.9 Seguridad: huecos reales

- **RF-32:** EL SISTEMA aplica los `securityHeaders` ya existentes **también a las
  respuestas de error** de las rutas de API. **Se verifica con una petición real**, no se
  da por supuesto.
- **RF-33:** Las rutas públicas de lectura que hoy **no** tienen rate limit quedan cubiertas
  (categorías, productos). El límite sigue siendo **por IP, en memoria**, y **su pérdida al
  reiniciar el servidor se acepta y se documenta** como límite conocido. Ponerlo en Redis
  es otro sistema: no cabe aquí.
- **RF-34:** `npm audit` se ejecuta y su resultado queda **anotado** con la justificación de
  las altas residuales. **No** se actualizan dependencias masivamente.
- **RF-35:** EL SISTEMA **no registra** contraseñas, tokens completos, cookies ni
  `DATABASE_URL` en ningún `console.*`. Se verifica con un **barrido del código**, no de
  memoria.

### 6.10 Extranjeros y jurisdicción

- **RF-36:** EL SISTEMA **no** bloquea, rechaza ni redirige a nadie por su IP. Un visitante
  extranjero navega con normalidad.
- **RF-37:** El aviso de privacidad **no** afirma que Pingo POP venda fuera de México, y
  `/politica-de-envios` **sí** declara que el envío es **solo en México**.
- **RF-38:** EL SISTEMA **no** usa la IP como criterio para determinar obligaciones legales.
  La IP se usa **solo** como clave de rate limit y **no se persiste**. El aviso lo dice con
  esas palabras.
- **RF-39:** SI algún día Pingo POP vendiera en otro país, hace falta un módulo de
  jurisdicción **antes** de activarlo. Queda anotado en `MEMORY.md`, **no** implementado.

### 6.11 Propiedad intelectual

- **RF-40:** EL SISTEMA documenta el origen y la licencia de **cada** recurso visual y
  tipográfico versionado: imágenes de `public/`, iconos de `lucide-react` y las fuentes. Lo
  que no se sepa identificar queda marcado como **PENDIENTE — VERIFICAR ORIGEN**, y
  **no** se publica nada cuya procedencia esté sin verificar.
- **RF-41:** `/informacion-legal` **no** afirma ser propietario de nada cuya procedencia no
  esté documentada.

---

## 7. Verificación

### 7.1 Tests (test-first, vistos en rojo antes del código)

Suite `tests/legal-data.test.ts` — módulo puro, la lógica de `LegalData` **fuera** del
componente, como manda `docs/constitution.md` §6:
- `leerLegal({})` devuelve **el marcador** para cada campo, y `leerLegal` con datos
  rellenos devuelve esos datos.
- Un campo con **solo espacios** se trata como ausente, igual que `imagePath`.
- `camposFaltantes()` lista **exactamente** los que faltan, y **no** lista los rellenos.
- `MARCADOR_PENDIENTE` es una **constante exportada**: el test falla si alguien escribe el
  texto del marcador a mano en otro fichero.

Suite `tests/consent.test.ts` — módulo puro:
- Con **cero** tecnologías no esenciales: `hayQuePedirConsentimiento()` es `false`.
- Con alguna: las **cuatro** categorías se devuelven, y **"aceptar" y "rechazar" tienen el
  mismo número de clases de estilo**. El test **cuenta las clases**, no comprueba que "se
  vean iguales": es la única forma de que un test de Node lo verifique.
- El registro de una decisión lleva versión, marca de tiempo y valor.
- Cambiar una decisión previa **exige confirmación explícita**.

Suite `tests/retention.test.ts` — módulo puro, **12 meses (D15)**:
- Una solicitud de hace 13 meses en estado **no terminal** **no** se marca.
- Una de hace 13 meses en estado **terminal** **sí** se marca.
- Con plazo `0` **no** se marca ninguna. El plazo viene de una **constante**, no de un
  número escrito en la lógica.

Suite `tests/legal-versions.test.ts`:
- Los siete documentos exponen versión y fecha.
- La versión **cambia** cuando cambia el contenido, y hay un test que falla si alguien sube
  el contenido sin subir la versión.

Suite `tests/quote-idempotency.test.ts` — la clave de idempotencia es **puro**:
- El mismo token dos veces devuelve la **misma** solicitud, no dos.
- Tokens distintos crean solicitudes distintas.
- Un token **vacío o manipulado** se rechaza, no se acepta como "primera vez".

### 7.2 Comprobación manual (criterio exacto)

| # | Pasos | Criterio |
|---|---|---|
| V1 | Las **8** superficies legales (**7 nuevas + `/contacto` reescrita**) en móvil y escritorio | Abren con **200**, con su versión visible |
| V2 | `/aviso-de-privacidad` sin datos rellenados | Muestra `[REQUIERE DATO DEL PROPIETARIO]`, **no** texto inventado |
| V3 | `/politica-de-cookies` contra `src/lib/auth/session-token.ts` | Cada entrada del documento **existe** en el código, con los mismos valores |
| V4 | Navegador: `document.cookie` en la portada | Solo `pp_session`; **cero** cookies de terceros |
| V5 | `localStorage` en la portada | Solo `pingo-quote-cart`; **cero** claves de consentimiento (D14) |
| V6 | Portada con cero tecnologías no esenciales | **No aparece** banner |
| V7 | Pie de página | Enlace visible a las políticas y a "preferencias de cookies" |
| V8 | Enviar una cotización | Se registra la aceptación con versión; **sin** IP ni datos extra |
| V9 | Enviar la misma cotización **dos veces seguidas** | **Una** sola solicitud en el panel (RF-27) |
| V10 | `/admin/cotizaciones` | Lista, detalle, cambio de estado y borrado; **nadie fuera del admin** puede verla |
| V11 | `/admin/legal` | Guarda los datos y **avisa de los que faltan** |
| V12 | `curl -I` a las 8 superficies legales **y** a una ruta de API que devuelve 404 | CSP, `nosniff`, `X-Frame-Options`, `Referrer-Policy` presentes **también en el error** (RF-32) |
| V13 | `/contacto` | Muestra correo y teléfono **reales**, o el marcador si faltan |
| V14 | `/accesibilidad` | **No** dice "cumple WCAG AA"; sí el estándar objetivo y cómo reportar |
| V15 | Visitante con IP extranjera (VPN) | Se sirve **igual**, sin bloqueo ni redirección |
| V16 | `/admin/productos` → `/admin/cotizaciones` | Se llega con un clic; sin sesión, **307** a `/login` |
| V17 | `npm audit` | Sin altas **nuevas** respecto de las 8 justificadas |
| V18 | El build | Las **8** superficies legales salen **`ƒ`**, porque leen `LegalData` de la base de datos: es lo correcto y **no** es una regresión. Lo que **sí** se comprueba es que **`MainLayout` no se ha tocado** (`git diff src/components/layout/` vacío) y que `/contacto` y `/novedades` **no han cambiado de `force-dynamic`** por otra causa. **5 módulos puros nuevos** con sus 5 suites |

### 7.3 Gate

`npm run check` → **exit 0**. Tests: los previos **más** los nuevos. Sin dependencias
nuevas. `MEMORY.md` sigue en **≤ 100 líneas**.

---

## 8. Riesgos

| # | Riesgo | Control |
|---|---|---|
| R1 | **Publicar un aviso con datos inventados** | RF-2: marcador literal en **una constante única**, nunca un valor. Es el riesgo número uno |
| R2 | Que el panel de cotizaciones exponga datos personales | RF-25 y RF-28: `requireAdmin()` **más** middleware, y la vía pública sigue siendo **solo de creación** |
| R3 | El aviso promete algo que el código no cumple | §2.2 y §2.3 declaran lo que **no** existe; `RF-9` y `RF-11` obligan a que las políticas coincidan con el código |
| R4 | Que el texto legal se quede desactualizado al cambiar el código | `RF-9` se verifica contra `session-token.ts`; `RF-6` obliga a versionar cuando cambia el contenido |
| R5 | Regresión en el prerenderizado | `MainLayout` **no** se toca, y V18 comprueba que las páginas sigan `○` |
| R6 | El banner de cookies rompe el diseño | RF-15 lo hace **condicional**: con cero tecnologías **no se pinta**. Cero riesgo visual hoy |
| R7 | Un cambio de `next.config.ts` rompe el CSP | **No se toca el CSP** en esta spec. Los headers ya están (§2.1) |
| R8 | **Doble clic duplica una cotización** | RF-27: idempotencia por token del cliente. Sin esto el negocio recibe trabajo duplicado |
| R9 | El borrado de una solicitud deja filas hijas huérfanas | RF-24: las dos tablas se borran en una **transacción** |
| R10 | Que la retención borre algo que aún se necesita | RF-22: a los 12 meses **se marca**, no se borra solo. Borra una persona |

---

## 9. Resultado esperado al terminar (§49 del documento)

- **A. Auditoría inicial:** es la tabla de §1, con `COMPLETO` / `PARCIAL` / `FALTANTE` /
  `NO APLICA`.
- **B. Cambios:** archivo por archivo, en `CHANGELOG.md`.
- **C. Migraciones:** **dos modelos nuevos** (`LegalData`, `LegalAcceptance`) y **una
  modificación** de `QuoteRequest`: `status` pasa de `String` libre a **enumeración**
  (RF-26). La migración **mapea** los valores existentes y **no borra ninguna fila**.
  `User` **no se toca**.
- **D. Rutas nuevas:** 7 páginas legales, `/admin/legal`, `/admin/cotizaciones`, y las
  rutas de API que hacen falta. `sitemap.xml` y `robots.txt` aparecen en el build.
- **E. Dependencias:** **ninguna**. Todo con lo ya instalado.
- **F. Variables de entorno:** **una sola**, `SITE_URL`. Los datos legales **no** son
  variables: van en la base de datos y los rellena el administrador (D18).
- **G. Pruebas:** `PASS` / `FAIL` / `REQUIERE CONFIGURACIÓN`.
- **H. Pendientes legales (D20):** separado en **implementado técnicamente** y **dato que
  solo tiene el propietario**. Ya **no** hay un grupo "pendiente de abogado": los
  documentos son entregables. Lo único que queda por rellenar son los datos que el
  propietario tiene y el repositorio no (§3).

---

## 10. Lo que esta spec NO promete

- **NO** dice que Pingo POP "cumpla la LFPDPPP", ni que sea "100% conforme", ni que
  "cumpla todas las leyes". Sí dice **qué hace con los datos**, y eso es un documento de
  hechos. Ver RF-8 y D20.
- **NO** dice que el sitio sea accesible conforme a WCAG 2.2 AA. `/accesibilidad`
  declara el **estándar objetivo**, cómo reportar problemas y los hallazgos con su
  gravedad, que es lo que se puede sostener sin auditoría completa.
- **NO** promete un plazo de respuesta a una cotización que el sistema no tiene.
- **NO** convierte a Pingo POP en una plataforma internacional.
- **NO** implementa pagos en línea, envío de correo ni registro público.

El objetivo técnico es el que escribió el usuario:

> Una plataforma Pingo POP orientada al mercado mexicano, con buenas prácticas de
> privacidad, seguridad, comercio electrónico y accesibilidad, y una arquitectura
> preparada para manejar usuarios extranjeros sin asumir automáticamente operaciones
> comerciales internacionales.