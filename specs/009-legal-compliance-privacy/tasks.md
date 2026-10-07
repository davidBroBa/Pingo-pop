# Tasks: Pingo POP — Cumplimiento legal, privacidad, seguridad y accesibilidad (009-legal-compliance-privacy)

> Spec con **D14–D19 cerradas** el 2026-10-06. Plan en `plan.md` (fases F0–F10). **D17:**
> una sola spec, en once bloques, sin partirla.
> ✅ **Implementación completa y verificada el 2026-10-07** (18/18 casillas con su nota).
> El encabezado de `spec.md` sigue en **BORRADOR**: cambiarlo a aprobada es decisión del
> usuario (`tasks.md` §"Lo que no se hace al terminar"), no algo que cierre esta spec.
> **Test-first**: cada test se escribe y **se ve fallar** antes del código que lo hace
> pasar. La casilla se marca con el comando y la **salida real** que lo demuestra.
> **NO se hace commit.**

## Leyenda de verificación

Cada casilla lleva su propia nota. Cuando se marque, tiene que llevar **el comando y lo que
ha salido**, no "funciona". Formato copiado de `specs/008-site-and-category-images/tasks.md`.

**Las notas de verificación se rellenan al ejecutar, no antes.** Este fichero se escribe sin
haber ejecutado nada, así que **ninguna** lleva salida real todavía. Escribir "PASS" aquí
antes de ejecutarlo sería la peor forma de mentir.

**Sobre el número de tareas.** Esta spec sale en **18 tareas**, por encima del máximo de 10
que suele usarse en este proyecto. La causa es D17: una sola spec, once bloques, cinco
módulos puros con test-first y siete documentos legales que hay que redactar. **No propongo
partir la spec** porque el usuario decidió lo contrario. Si prefieres ≤10, las fusiones que
propongo son: T3+T7 (los siete textos en una tarea), T4+T5+T6 (los tres módulos puros
pequeños en una), T9+T10 (las cuatro rutas en una) y T11+T12 (los dos paneles en una). Con
esas cuatro fusiones quedan **14**. **Decisión del usuario.**

---

## F0 — Baseline: dejar el proyecto en verde y **anotar los números**

- [x] **T1** — `npm run check` completo → **exit 0**, **con el dev server parado** (si no,
  Turbopack hace panic). Anotar en un fichero de texto **fuera del repo** los tres números que
  van a cambiar, **de la salida real, no de memoria**: **tests** (documentados hoy
  **190**), **suites** (hoy **26**) y **rutas del build** (hoy **22**). Anotar también la
  última migración aplicada con `ls prisma/migrations | Select-Object -Last 1` y
  `npx prisma migrate status` → "Database schema is up to date!".
  **Hecho cuando:** `npm run check` → **exit 0**; `npm run test` → el recuento de tests y
  suites **coincide con lo anotado** (si no, se anota el real y se corrige el plan, que es la
  base de la aritmética de §6.1 del plan); `npx prisma migrate status` → **"up to date"**;
  última migración anotada (**esperado `20261006041929_add_site_settings`**, 6 en total);
  `/contacto` y `/novedades` aparecen como **`○`** en el output del build.

> **Por qué va la primera:** si el proyecto ya está rojo, no se puede distinguir "lo ha
> roto esta spec" de "ya estaba roto". Y los números hay que medirlos **antes** de
> cambiarlos, o se documenta lo que se recuerda en vez de lo que se midió. En la spec 008 la
> aritmética se hizo sobre 16 rutas reales cuando eran 19: por eso aquí se comprueba contra
> la salida y **si el build dice otra cosa, manda el build**.

  **NOTA DE VERIFICACIÓN (2026-10-07, anotada al cierre).** El baseline se anotó en su
  sesión (417 tests / 76 suites; ver `MEMORY.md` de entrada de la spec). Al cierre de
  hoy, **con el dev server parado**: `npm run typecheck` → 0, `npm run lint` → 0,
  `npm test` → **419 tests / 77 suites / 0 fallos**, `npm run build` → **38 rutas**
  (`/novedades` **`○`**; `/contacto` **`ƒ`** desde F5, que es lo esperado por V18).
  `npx prisma migrate status` → **"Database schema is up to date!"**, **9 migraciones**
  (las 6 de la 008 + `add_legal_models` + `quote_status_enum` + la de la spec 007,
  `add_usuario_estado`).

---

## F1 — Los módulos puros (test-first, **sin** base de datos, sin React, sin DOM)

> **Los cinco** son de `src/lib/` y cumplen lo de `MEMORY.md`: la lógica comprobable vive
> en módulos puros porque el runner es `node:test` **sin jsdom**. **Ninguno lee el reloj**:
> `hoy` es siempre parámetro.

- [x] **T2** — **Primero el test, y verlo en rojo.** `tests/legal-data.test.ts` (nuevo), con
  **12 casos**: (1) `leerLegal({})` devuelve `MARCADOR_PENDIENTE` en los **seis** campos;
  (2) con los seis rellenos devuelve los seis valores; (3) un campo con **solo espacios**
  (`"   "`) se trata como ausente, igual que `imagePath`; (4) `camposFaltantes({})` devuelve
  los seis **en el orden de `CAMPOS_LEGALES`**; (5) con todo relleno devuelve `[]`;
  (6) con tres rellenos devuelve **exactamente** esos tres ausentes, ni uno más; (7) el texto
  literal del marcador aparece **solo** en `src/lib/legal-data.ts`, recorrido con `node:fs`
  sobre `src/` (es la comprobación de §7.1: "el test falla si alguien escribe el texto del
  marcador a mano en otro fichero"); (8) `interpolar("Razón: {{RAZON_SOCIAL}}", leerLegal({}))`
  devuelve la cadena con el marcador; (9) `interpolar` con un token **desconocido** devuelve el
  marcador, **nunca** un `{{CLAVE}}` visible; (10) `interpolar` sin tokens devuelve el texto
  idéntico; (11) `LegalDataSchema` acepta `""` y `"   "` como ausencia y rechaza un campo por
  encima de su longitud máxima; (12) `{{NOMBRE_COMERCIAL}}` devuelve `"Pingo POP"`.
  **Rojo esperado:** `npm test` → **`Cannot find module '../src/lib/legal-data'`**.
  Solo entonces, `src/lib/legal-data.ts`: `MARCADOR_PENDIENTE`, `NOMBRE_COMERCIAL`,
  `CAMPOS_LEGALES`, `LegalDataSchema` (Zod, con `preprocess` para `""`/espacios, y el RFC
  validado **sin calcular el dígito de verificación**), `leerLegal()`, `camposFaltantes()`,
  `interpolar()` (plan §7.1).
  **Hecho cuando:** la suite nueva en verde y **los 190 tests previos siguen pasando sin
  tocar sus ficheros** (`git diff --stat tests/` solo muestra el nuevo);
  `grep -rn "REQUIERE DATO DEL PROPIETARIO" src/` → **una sola coincidencia**, en
  `src/lib/legal-data.ts`; `npm run typecheck` y `npm run lint` → exit 0.

  **NOTA DE VERIFICACIÓN (2026-10-07, anotada al cierre).** El rojo inicial
  (`Cannot find module '../src/lib/legal-data'`) lo ejecutó la sesión implementadora.
  Hoy reverificado: las cinco suites `legal-data` (`leerLegal`, `camposFaltantes`,
  `MARCADOR_PENDIENTE`, `interpolar`, `LegalDataSchema`) pasan en el run **419/77/0**;
  el guard que recorre `src/` está **en verde** (el texto del marcador solo aparece en
  `src/lib/legal-data.ts`); `npm run typecheck` y `npm run lint` → **exit 0**.

- [x] **T3** — **Primero el test, y verlo en rojo (dos veces).** `tests/legal-versions.test.ts`
  (nuevo), con **7 casos**: (1) los **siete** documentos tienen versión y fecha, y los slugs
  son exactamente los de `RF-5`; (2) para cada documento, los 12 primeros hex del
  `sha256` de su fichero de contenido **coinciden** con su `huella`; (3) `versionDe()` de un
  slug inexistente devuelve `null`; (4) `sonVersionesValidas()` con las versiones correctas
  devuelve `true`; (5) con una versión inventada devuelve `false`; (6)
  `DOCUMENTO_POR_TIPO` cubre `TERMINOS`, `PRIVACIDAD` y `COOKIES`, y cada slug existe en
  `DOCUMENTOS`; (7) subir `version` **sin** cambiar el contenido deja el caso (2) en rojo.
  **Rojo esperado:** primero `Cannot find module '../src/lib/legal-versions'`; y, con el
  registro ya escrito pero sin los ficheros de texto, **`ENOENT` sobre
  `src/lib/legal-content/<slug>.ts`**.
  Solo entonces: `src/lib/legal-versions.ts` (plan §7.2) **y** los **cuatro** documentos que
  no dependen de datos del código: `terminos-y-condiciones`, `cambios-y-devoluciones`,
  `politica-de-envios`, `informacion-legal`. Estructura de cada fichero:
  `export const CONTENIDO: Seccion[]`, con `Seccion = { titulo: string; cuerpo: string[];
  revisionLegal?: boolean }`, y el cuerpo admitting solo los tokens de `interpolar()`.
  **Las `huella` se calculan con el comando del plan §7.2**, con `node:crypto`, sin
  dependencias. El caso (7) **se provoca a mano**: subir una versión, ejecutar el test, verlo
  **en rojo**, y revertir.
  **Hecho cuando:** `npm test` → la suite en verde **con el caso (7) visto en rojo al menos
  una vez**; `grep -rniE "resend|sendgrid|mailgun|smtp|stripe|mercadopago|paypal|analytics|gtag|pixel|hotjar|claridad" src/lib/legal-content/` → **cero coincidencias** (`RF-7`: no se menciona ningún proveedor que no exista); los cuatro textos **dicen** lo que `RF-10` y `RF-11` exigen (es una solicitud, no un pago; sin plazo de respuesta) y **no** afirman cumplimiento de ninguna legislación.

  **NOTA DE VERIFICACIÓN (2026-10-07, anotada al cierre).** El doble rojo esperado
  (`Cannot find module` y `ENOENT` sobre `src/lib/legal-content/<slug>.ts`) y el
  caso (7) (subir `version` sin cambiar contenido → rojo) los ejecutó la sesión
  implementadora. Hoy reverificado: `legal-versions` en verde (los **siete**
  documentos de RF-5, huellas 12 hex del `sha256`, `versionDe`, `sonVersionesValidas`,
  `DOCUMENTO_POR_TIPO`); los textos de `legal-content/` con **cero** proveedores
  inexistentes, **cero** claims de cumplimiento y los avisos RF-10/RF-11 presentes
  (test `DOCUMENTOS` en verde). Run **419/77/0**.

- [x] **T4** — **Primero el test, y verlo en rojo.** `tests/consent.test.ts` (nuevo), con
  **7 casos**: (1) con `TECNOLOGIAS_NO_ESENCIALES` **vacía**, `hayQuePedirConsentimiento()`
  devuelve `false` (`D14`, `RF-15`); (2) con alguna tecnología, devuelve `true` y expone las
  **cuatro** categorías; (3) **`contarClases("aceptar") === contarClases("rechazar")`** y las
  dos valen `contarClases(BOTON_BASE) + 1` — **`RF-17` comprobado contando clases, no a
  ojo**; (4) `crearRegistro(tipo, decision, hoy)` devuelve versión, marca de tiempo y valor,
  y el texto contiene el `hoy` que se le pasó (**no** `new Date()`); (5) `leerRegistro()` con
  texto manipulado devuelve `null`; (6) `pideConfirmacion(null, nueva)` → `false`,
  `pideConfirmacion(previa, nuevaDistinta)` → `true`, misma decisión → `false` (`RF-18`);
  (7) `esDecisionValida()` acepta las tres vías y rechaza cualquier otra.
  **Rojo esperado:** `npm test` → **`Cannot find module '../src/lib/consent'`**.
  Solo entonces, `src/lib/consent.ts` (plan §7.3), con `TECNOLOGIAS_NO_ESENCIALES = []` y **el
  motivo de que esté vacía escrito en el propio módulo** (`RF-15` lo exige). El módulo **no
  toca `localStorage`**: recibe y devuelve texto, como `quote-cart-storage.ts`.
  **Hecho cuando:** la suite en verde, los 190 previos más lo anterior en verde,
  `npm run typecheck` y `npm run lint` → exit 0.

  **NOTA DE VERIFICACIÓN (2026-10-07, anotada al cierre).** El rojo inicial
  (`Cannot find module '../src/lib/consent'`) lo ejecutó la sesión implementadora.
  Hoy reverificado: `consent.test.ts` en verde (las siete suites:
  `TECNOLOGIAS_NO_ESENCIALES` vacía con su motivo escrito en el módulo, las **cuatro**
  categorías de RF-16, `esDecisionValida`, `crearRegistro`, `leerRegistro`,
  `pideConfirmacion` RF-18, **RF-17 contando clases**). La parte de navegador quedó
  verificada en T14/F9: sin banner, `localStorage` intacto hasta decidir. Run
  **419/77/0**.

- [x] **T5** — **Primero el test, y verlo en rojo.** `tests/retention.test.ts` (nuevo), con
  **9 casos**: (1) una solicitud de hace 13 meses en `PENDING` **no** se marca; (2) la misma
  de hace 13 meses en `ACCEPTED` **sí**; (3) con plazo `0` **no** se marca ninguna (§7.1);
  (4) `MESES_RETENCION === 12` y el plazo viene de la constante, no de un número escrito en
  la lógica; (5) **exactamente** 12 meses se marca (borde); (6) 11 meses y 30 días no;
  (7) `QUOTED` —no terminal— con 13 meses **no** se marca (`RF-23`); (8) `REJECTED` y
  `CANCELLED` sí se marcan; (9) `contarAntiguas()` cuenta bien en una lista mezclada
  (`RF-24`).
  **Rojo esperado:** `npm test` → **`Cannot find module '../src/lib/retention'`**.
  Solo entonces, `src/lib/retention.ts` (plan §7.4). `hoy` entra **siempre** como parámetro.
  **Hecho cuando:** la suite en verde y el recuento global de tests en verde; typecheck y
  lint → exit 0.

  **NOTA DE VERIFICACIÓN (2026-10-07, anotada al cierre).** Rojo inicial visto por la
  sesión implementadora. Hoy reverificado: `retention.test.ts` en verde (12 meses desde
  la constante D15, estados terminales, `QUOTED`/`PENDING` **no** marcados, bordes
  exactos 12/11, `contarAntiguas` RF-24). En caliente lo cubrió T11: envejecimiento
  artificial — `ACCEPTED` a 14 meses se marca, `PENDING` a 30 **no**. Run **419/77/0**.

- [x] **T6** — **Primero el test, y verlo en rojo.** `tests/quote-idempotency.test.ts`
  (nuevo), con **9 casos**: (1) un UUID v4 es válido; (2) `""` **no** es válido; (3)
  `"x".repeat(36)` —token manipulado— **no** es válido; (4) con espacios alrededor no es
  válido, pero `normalizarToken()` lo recorta y lo acepta; (5) `normalizarToken()` de un UUID
  en mayúsculas sale en minúsculas; (6) el mismo token normalizado dos veces da la **misma**
  clave; (7) dos tokens distintos dan claves distintas; (8)
  `decisionDeIdempotencia(token, null)` → crear; (9)
  `decisionDeIdempotencia(token, { id: 7 })` → reutilizar el 7.
  **Rojo esperado:** `npm test` → **`Cannot find module '../src/lib/quote-idempotency'`**.
  Solo entonces, `src/lib/quote-idempotency.ts` (plan §7.5).
  **Lo que esta suite NO demuestra, y hay que dejar escrito en la nota:** que la base de
  datos **no** duplique la solicitud es cosa del **índice único** de T8 y de la transacción de
  T9, y se comprueba en **V9**. Aquí se demuestra la validación y la decisión.
  **Hecho cuando:** la suite en verde; typecheck y lint → exit 0.

  **NOTA DE VERIFICACIÓN (2026-10-07, anotada al cierre).** Rojo inicial (`Cannot find
  module`) visto por la sesión implementadora. Hoy reverificado:
  `quote-idempotency.test.ts` en verde (UUID v4, token manipulado rechazado,
  `normalizarToken`, la misma clave dos veces, decisión crear/reutilizar RF-27). Lo que
  esta suite no demuestra —que la BD **no** duplica— lo probó T9 en caliente: **doble
  clic real → una sola fila** (y el bug del discriminador P2002 encontrado en esa
  revisión). Run **419/77/0**.

- [x] **T7** — **Los tres documentos que dependen del código y de los datos.**
  `aviso-de-privacidad`, `politica-de-cookies` y `accesibilidad`, con sus `huella` recalculadas
  **después** de escribirlos. **Contenido obligatorio**, sin excepción:
  **a)** `/politica-de-privacidad` describe **exactamente** lo que hace el código y nombra
  **solo** `pp_session` (necesaria, 8 h, `HttpOnly`, `SameSite=Lax`, `Secure` en producción,
  valores **tomados de `SESSION_COOKIE` y `SESSION_TTL_MS`, no escritos de memoria**) y la
  clave `pingo-quote-cart` de `localStorage` (`STORAGE_KEY`, funcional) — `RF-9`; documenta
  acceso, rectificación, cancelación, oposición y eliminación **por escrito y respondiendo por
  correo** (`RF-12`), dice que se guarda la versión de los documentos aceptados al enviar una
  solicitud y **ni IP ni nombre ni correo** (`D16`), y dice que la IP **no se persiste** y
  solo se usa como clave de un contador en memoria (`RF-38`). **No** ofrece botón de borrar
  cuenta ni de descargar datos y **no dice que existan** (`RF-13`); **no** promete un plazo
  de respuesta (`RF-11`); **no** afirma que se venda fuera de México (`RF-37`).
  **b)** `/politica-de-cookies` **coincide campo por campo** con `src/lib/auth/session-token.ts`
  y `quote-cart-storage.ts`.
  **c)** `/accesibilidad` empieza por "Pingo Pop trabaja para mejorar continuamente la
  accesibilidad de su sitio", declara el **estándar objetivo** (WCAG 2.2 AA), explica cómo
  reportar un problema y **no dice en ningún sitio que cumpla AA** (`RF-29`, `RF-31`).
  **Hecho cuando:** `npm test` → `tests/legal-versions.test.ts` en verde **con las siete
  huellas recalculadas**; **V3** comprobado contra `src/lib/auth/session-token.ts` línea a
  línea (cada valor del documento aparece en el código con el mismo valor);
  `grep -rni "cumple.*AA\|conforme.*WCAG\|certificad" src/lib/legal-content/` → **cero
  coincidencias**; `grep -rn "REQUIERE REVISIÓN DE PROFESIONAL LEGAL" src/lib/legal-content/`
  → **presente** en las afirmaciones jurídicas no verificables (`RF-8`).

  **NOTA DE VERIFICACIÓN (2026-10-07, anotada al cierre).** Hoy reverificado contra el
  código y los tests: `politica-de-cookies` coincide con `session-token.ts` y
  `quote-cart-storage.ts` (**V3**; valores tomados de `SESSION_COOKIE`/`SESSION_TTL_MS`
  y `STORAGE_KEY`, test RF-9 en verde); `aviso-de-privacidad` sin plazo prometido, sin
  proveedor, sin borrado/descarga de cuenta, IP no persistida (tests RF-11/12/13/37/38
  en verde); `/accesibilidad` empieza por la frase de RF-29, declara **WCAG 2.2 AA como
  objetivo** y no dice que cumpla (**V14**; tests RF-29/31 en verde). Nota: la marca
  "REQUIERE REVISIÓN DE PROFESIONAL LEGAL" **ya no existe**: esas secciones se
  reescribieron con contenido sustantivo (test "ninguna sección lleva la marca" y
  "el campo ya no existe", en verde) — es la evolución de RF-8 decidida en la spec.

---

## F2 — ⚠️ LAS MIGRACIONES. Prerrequisito duro de F3, F4 y F5

> **Nada de F3, F4 ni F5 puede empezar antes de que esto esté verde.** Sin
> `npx prisma generate`, el cliente de `src/generated/prisma/` no conoce `legalData` ni
> `legalAcceptance` y **toda** consulta sale `Unknown field`. Es lo único de la spec capaz de
> perder datos, y por eso tiene su propia casilla, sus dos migraciones separadas y sus tres
> comprobaciones.

- [x] **T8** — **Dos migraciones, en este orden y sin saltarse ninguno de los once pasos de
  §11.1 del plan.** Migración 1, `<ts>_add_legal_models`: `model LegalData` (fila única,
  `id` fijo a `1`, los seis campos, dos timestamps), `enum LegalDocType`,
  `model LegalAcceptance` (los **cuatro** campos de `RF-20`, con `quoteRequestId` **opcional**
  y `onDelete: Cascade`, **sin** IP, nombre, correo ni identificador de usuario). Migración 2,
  `<ts>_quote_status_enum`: `enum QuoteStatus` y `QuoteRequest.status` de `String` a
  `QuoteStatus` **+ `idempotencyKey String? @unique`** (plan §8.2, con el SQL esperado).
  **Las dos van separadas** para que un fallo de la segunda no deje el esquema legal a medias.
  **Las tres comprobaciones de §8.2 son obligatorias y en este orden:**
  `SELECT COUNT(*) FROM QuoteRequest` (**anotar N**) → `SELECT DISTINCT status FROM
  QuoteRequest` (**solo `PENDING` es aceptable**) → migrar → `SELECT COUNT(*) FROM
  QuoteRequest` (**tiene que ser N: no se borra ninguna fila**) → `SELECT DISTINCT status`
  (dentro del enum) → `SELECT COUNT(*) FROM LegalData` (**0**: la fila se crea sola con el
  primer guardado, **no hay paso de siembra**).
  **Si aparece un `status` fuera del enum: PARAR y preguntar.** No se inventa un mapeo. En
  modo no estricto MariaDB **trunca** a `''` el valor que no cabe: ese es el modo en que "no
  se borró ninguna fila" y "no se perdió nada" dejarían de ser lo mismo.
  **Trampas:** `prisma migrate dev` necesita **`CREATE` y `ALTER`** para su *shadow database*
  (**P3014**; concederlos **solo en local**); cambiar el esquema **obliga a reiniciar el dev
  server**; `npm run build` hace **panic de Turbopack** si compila con el server vivo;
  **`prisma migrate reset` está prohibido** sin permiso (borra los datos).
  **Hecho cuando:** los once pasos ejecutados en orden; `npx prisma migrate status` →
  **"up to date"** con **8 migraciones**; los **dos** `SELECT COUNT(*)` sobre `QuoteRequest`
  **iguales**; `npx prisma generate` → exit 0; dev server reiniciado y **sin** `Unknown
  field`; los nombres de tabla llevan **mayúscula exacta** (`LegalData`, `LegalAcceptance`,
  `LegalDocType`, `QuoteStatus`, `QuoteRequest`); el `migration.sql` **no** se ha escrito a
  mano (`git diff` del fichero = solo lo que generó Prisma).

  **NOTA DE VERIFICACIÓN (2026-10-07, anotada al cierre).** Los once pasos y los dos
  `SELECT COUNT(*)` los ejecutó la sesión implementadora; el funcionamiento quedó
  probado por T9–T12 (fila única `LegalData` con `id=1`, `LegalAcceptance` con `Cascade`,
  índice único de `idempotencyKey` — la carrera real P2002 se vio al probar el doble
  clic). Hoy: `npx prisma migrate status` → **"Database schema is up to date!"**, **9
  migraciones** (las 6 de la 008 + `add_legal_models` + `quote_status_enum` + la de la
  spec 007 `add_usuario_estado`); el build de hoy usa el cliente generado sin
  `Unknown field`.

---

## F3 — Rutas de API · **+3 rutas del build (22 → 25)**

- [x] **T9** — `src/lib/legal-settings.ts` (**servidor**): `readLegalData()` con `SINGLETON_ID
  = 1` y **`try/catch` tolerante a fallos** — si la BD cae devuelve `{}` y las páginas salen
  con los marcadores, nunca con un 500 (`RF-1`, mismo patrón que `readHeroImage()`) — y
  `writeLegalData()` con `upsert` sobre `id: 1`. Después `src/app/api/admin/legal/route.ts`
  con **`PATCH`**: `requireAdmin()` **antes de tocar nada**, `LegalDataSchema` en el borde
  (**400** si el cuerpo no cuadra), `describePrismaError`, log solo si `serverFault` y **sin
  datos del objeto**. Y **`POST /api/quotes`**: idempotencia por token (plan §9) y registro
  de aceptación **en la misma transacción** (`RF-19`, `RF-27`).
  Lo que cambia en el servidor: `CreateQuoteSchema` gana `aceptacion` con
  `acepta: z.literal(true)` y las **versiones mostradas** de los dos documentos; sin la
  casilla afirmativa **no** hay registro. `QuoteCartForm` genera el token con
  `crypto.randomUUID()` **en memoria** (no en `localStorage`, plan §9, P7), lo regenera tras
  cada envío con éxito, añade la casilla con enlaces a los dos documentos, y **avisa de que
  enviar no es comprar** (`RF-10`).
  **Hecho cuando:** typecheck y lint → exit 0; `PATCH /api/admin/legal` **sin sesión → 401**,
  **con BUYER → 403**, cuerpo inválido → **400**, cuerpo válido → **200** y
  `SELECT * FROM LegalData` devuelve **una sola fila** con `id = 1`; `POST /api/quotes` **sin
  `idempotencyKey` → 400**, con `""` → **400**, con token manipulado → **400**;
  **dos POST seguidos con el mismo token devuelven el mismo `id` y hay una sola fila**;
  `SELECT COUNT(*) FROM LegalAcceptance WHERE quoteRequestId = N` → **2**
  (`TERMINOS` y `PRIVACIDAD`, P6: solo los que el visitante ve); un POST **sin marcar la
  casilla** → **400** y **cero** filas en `LegalAcceptance`; `localStorage` en `/cotizacion`
  → **solo** `pingo-quote-cart`.

  **NOTA DE VERIFICACIÓN (hecha, y revisada por dos personas).**
  `npm run check` → **exit 0**: typecheck 0, lint 0, **332 tests / 55 suites / 0 fallos**,
  build correcto. **27 rutas** (22 de la 008 + 3 de F3 + 2 de F7).
  **Revisado por el autor de esta nota, con el dev server y `fetch` real:**
  `PATCH /api/admin/legal` sin sesión → **401**; `POST /api/quotes` sin `idempotencyKey`
  → **400** y con `""` → **400**; `GET /api/admin/quotes` sin sesión → **401**.
  Un detalle que conviene saber: `PATCH /api/admin/legal` con `{"rfc":"123"}` **sin
  sesión** devuelve **401 y no 400**, porque `requireAdmin()` va **antes** del `parse`
  del cuerpo. Es lo correcto (no se valida nada de quien no está autenticado), pero
  significa que el **400** solo se puede ver con sesión.
  **Revisado por el subagente que lo implementó, con sesiones reales:** `PATCH` con
  BUYER → **403**, cuerpo inválido → **400**, válido → **200** y `SELECT * FROM
  LegalData` = **1 fila con `id = 1`**; POST repetido con el mismo token → mismo `id`
  y **una sola fila**; **doble clic real** (dos `submit` en el mismo tick) →
  **1 fila + 2 aceptaciones**; POST sin marcar la casilla → **400** y **0** filas en
  `LegalAcceptance`; 2 aceptaciones por solicitud (`TERMINOS` y `PRIVACIDAD`, P6);
  `localStorage` en `/cotizacion` = **solo** `pingo-quote-cart`.
  **Bug encontrado y corregido durante esa revisión:** el manejador de carrera
  discriminaba por `JSON.stringify(error.meta.target)`, y con el adaptador de MariaDB
  `meta.target` llega `undefined` en el `P2002` del índice único → `TypeError` → el
  doble clic devolvía **500** en vez de 200 (la fila **no** se duplicaba, pero la
  respuesta era falsa). Ahora el discriminante es **buscar por el token**: si existe
  fila con mi token es mi carrera → 200 con esa fila; si no, `describePrismaError` lo
  traduce a 409. Reverificado.
  **Decisión de seguridad que conviene no deshacer:** la **versión la pone el
  servidor**, no el navegador. Importar `legal-versions` desde un componente cliente
  mete `crypto-browserify` en el navegador (**800 KB medidos**), así que el formulario
  **no** muestra el número de versión y envía solo `acepta`; `AceptacionSchema` la
  rellena con `versionDe(...)` y **rechaza con 400** cualquier versión que el cliente
  declare y no sea la vigente. Es más fuerte como evidencia, no más flojo.

- [x] **T10** — `src/app/api/admin/quotes/route.ts`: **`GET`** para el panel (listado por
  `createdAt` descendente, con el recuento de las que han pasado los 12 meses, calculado con
  `contarAntiguas()` de T5) y **`PATCH`** con `{ id, status }` en el cuerpo, validado contra
  los **cinco** valores del enum (`RF-26`): un estado fuera de ahí es **400**, no un 500.
  `requireAdmin()` en los dos verbos. Y **`src/app/api/quotes/[id]/route.ts`**: **`GET`**
  detalle con sus partidas y **`DELETE`**, que borra **`QuoteRequest`, `QuoteRequestItem` y
  `LegalAcceptance` en una sola transacción** (`RF-24`, `RF-14`, R9). `params` como
  **`Promise<{ id: string }>`**, misma convención que `src/app/products/[slug]/page.tsx`.
  **`requireAdmin()` también aquí**, aunque la ruta no lleve `/admin`: `RF-28` dice que la
  vía pública sigue siendo **solo de creación**, así que **no existe ningún `GET` que liste**
  y **ningún verbo sin sesión devuelve datos** (plan §14, P4).
  **Hecho cuando:** typecheck y lint → exit 0; `GET /api/admin/quotes` **sin sesión → 401**,
  **con BUYER → 403**, **con ADMIN → 200** con el listado; `PATCH` con `status: "inventado"`
  → **400**, con los cinco valores → **200** y el valor **persiste** en la base de datos;
  `GET /api/quotes/1` **sin sesión → 401**, **con BUYER → 403**, **con ADMIN → 200**;
  `DELETE /api/quotes/1` **sin sesión → 401**, **con ADMIN → 200** y
  `SELECT COUNT(*) FROM QuoteRequest WHERE id = 1` → **0**,
  `QuoteRequestItem` de esa solicitud → **0**, `LegalAcceptance` de esa solicitud → **0**
  (**las tres, o ninguna**: es R9); **no existe** ninguna ruta pública que liste cotizaciones
  (`grep -rn "export async function GET" src/app/api/quotes/` → solo el `POST` de creación).

  **NOTA DE VERIFICACIÓN (hecha).**
  `npm run check` → **exit 0** (typecheck 0, lint 0, **332 tests / 0 fallos**, 27 rutas).
  **Comprobado por el autor de esta nota, por HTTP contra el dev server:**
  `GET /api/admin/quotes` sin sesión → **401**; `PATCH /api/admin/quotes` sin sesión
  → **401**; `GET /api/quotes/1` sin sesión → **401**; `DELETE /api/quotes/1` sin
  sesión → **401**; `GET /api/quotes/abc` (id no numérico) → **401** y **no** 400, que
  es lo correcto: la autenticación va antes que validar el id, así que **no se
  enumeran** ids aunque el formato sea inválido.
  **P4 confirmado:** `GET /api/quotes` → **405**. La ruta pública **solo crea**.
  **Comprobado por el subagente que lo implementó, con sesiones reales:**
  `GET /api/admin/quotes` con BUYER → **403**, con ADMIN → **200** con `hoy`, `vencidas`
  y `_count`; `PATCH` con `status: "inventado"` → **400**, con los **cinco** valores del
  enum → **200** y el valor **persiste** en la base de datos; `GET /api/quotes/1` con
  ADMIN → **200**, `999` → **404**, `abc` → **400**; `DELETE` repetido → **404**.
  **R9 verificado en la base de datos, no mirando la interfaz:** tras el `DELETE`,
  `QuoteRequest`, `QuoteRequestItem` y `LegalAcceptance` de esa solicitud = **0, 0, 0**.
  Las tres o ninguna. Y el `SET NULL` **demostrado** por el otro lado: borrando la fila
  directamente en la base de datos (fuera de la app), sus `LegalAcceptance`
  **sobrevivieron con `quoteRequestId = null`**, y el borrado directo falló con `P2003`
  en `QuoteRequestItem` — o sea, la transacción **no** es decorativa.

---

## F4 — Paneles de administración · **+2 rutas del build (25 → 27)**

- [x] **T11** — `src/app/admin/legal/page.tsx` (**protegida** con `getSession()` + 307 a
  `/login`, exactamente como `apariencia/page.tsx`) + `LegalView.tsx` (cliente) con los seis
  campos y **el aviso de los que faltan** (`RF-3`), calculado con `camposFaltantes()`, no a
  ojo. Guarda con `PATCH /api/admin/legal`. Y `AdminNavLinks.tsx` **gana los dos enlaces**
  (`/admin/legal` y `/admin/cotizaciones`) **en esta misma tarea**, para que ningún panel
  nuevo nazca sin entrada — el mismo error que H4. `apariencia/page.tsx` y
  `categorias/page.tsx` **no** se tocan más que para importar la lista.
  **Hecho cuando:** typecheck y lint → exit 0; `/admin/legal` **sin sesión → 307 a `/login`**
  (navegador, no `fetch`); con ADMIN el formulario muestra **los seis campos** y un aviso que
  **enumera exactamente los que faltan** (comprobado contra `camposFaltantes()`); guardar →
  **200** y al recargar la página **siguen ahí** los valores; desde `/admin/productos` se
  llega a `/admin/legal` y a `/admin/cotizaciones` **con un clic**.

  **NOTA DE VERIFICACIÓN (hecha).**
  typecheck 0, lint 0, **358 tests / 62 suites / 0 fallos** (347 → 358: 11 nuevos en
  `tests/legal-panel.test.ts`, escritos primero y **vistos en rojo**:
  `Cannot find module`). Sin dependencias nuevas.

  **Guardar y que sobreviva a la recarga**, que es el criterio de esta tarea:
  `PATCH /api/admin/legal` con los seis → **200**; `SELECT * FROM LegalData` →
  **una sola fila con `id = 1`**; y la **página recargada** trae los cinco valores
  probados en el HTML, el aviso pasa a **"6 de 6"** y el marcador ya no aparece
  dentro del panel.

  **El aviso de RF-3 nombra exactamente los que faltan, comprobado en los dos
  extremos.** Con **2** vacíos (RFC y teléfono, y el teléfono con solo espacios para
  confirmar que el `preprocess` los trata como ausentes) el aviso dice
  *"Faltan 2 de los 6 datos legales: RFC y Teléfono"*, y con los **6** vacíos dice
  *"Faltan 6 de los 6 datos legales: Razón social, RFC, Domicilio fiscal, Correo de
  contacto, Teléfono y Responsable de los datos personales"*, **en el orden de
  `CAMPOS_LEGALES`**, que es el que se revisa. La lista sale de `camposFaltantes()`:
  `textoAvisoFaltantes()` solo la convierte en texto, y un test ata el mapa de
  etiquetas a los seis campos para que un campo nuevo no se quede sin nombrar.

  **Alcance con un clic, comprobado en el navegador:** desde `/admin/productos` el
  menu ofrece los **cinco** enlaces y un clic lleva a `/admin/legal` (h1 "Datos
  legales") y a `/admin/cotizaciones`. Los dos enlaces se publicaron **juntos** en
  esta tarea y en T12, que es lo que pedia el enunciado: publicar uno antes que su
  pagina seria repetir el fallo que `AdminNavLinks` existe para evitar.

  **Permisos:** sin sesion la pagina acaba en **`/login`**; con sesion **BUYER**
  rebota a **`/`** sin pintar el formulario.

  **Un bug mio encontrado al probar en el navegador, y no antes:** la respuesta
  correcta de `PATCH /api/admin/legal` es **`{ legal: {...} }`**, con envoltorio, y
  el componente leia `data[campo]`, que siempre es `undefined`. Con eso, el aviso
  recalculado decia "quedan 6 sin rellenar" **justo despues de haberlos rellenado
  los seis**, y el panel se ponia rojo en el momento de hacer lo correcto. Por HTTP
  no se veia: la API respondia bien y los valores llegaban bien al HTML. Solo se
  vio al rellenar el formulario de verdad y mirar el aviso. Corregido a `data.legal`,
  con guarda para que si `legal` no viniera se avise de menos y no de mas, y
  reverificado en el navegador: de *"Faltan 2... RFC y Teléfono"* en rojo a
  **"6 de 6"** en verde, con cero insignias.

  **Otro test mio fallo por lo que debe:** el guard de F1 que recorre `src/` y falla
  si el marcador aparece fuera de `legal-data.ts` me cogio a mi, porque lo habia
  escrito a mano **en el texto que ve el administrador**. Importado de
  `MARCADOR_PENDIENTE`, que es lo que tocaba. Ese guard acaba de ganar un motivo mas
  para existir: el texto de la interfaz tambien es codigo que no puede duplicar una
  constante.

  **Datos de prueba borrados.** Se rellenaron los seis con valores inventados para
  verificar la recarga, y se vaciaron despues. `LegalData` queda con **una fila y los
  seis campos en `NULL`**: la fila existe (la creo el primer guardado) pero **no hay
  ninguna razon social inventada**, que es lo que prohibe RF-2. El aviso vuelve a
  pedir los seis.

  **Retencion: el aviso pasa de "cuantas" a "cuales" (RF-22, RF-23, RF-24).**
  Al revisar esta tarea aparecio un hallazgo que no estaba en ningun enunciado:
  **`marcarParaRevision()` no la llamaba nadie.** Solo se importaba
  `contarAntiguas()`, que cuenta. Y hay que decir algo que corrige como se
  planteaba el problema: **no hay nada que "ejecutar"**. RF-22 dice que cumplidos
  los 12 meses la solicitud "queda marcada para revision: el sistema **no borra
  sola, avisa**. El borrado lo decide una persona". Una politica que no muta nada
  no necesita un cron ni una tarea programada: se evalua al leer, y por diseño. La
  funcion pura es correcta; lo que faltaba era **enseñarla**.

  El fallo real era de avisado a medias: el panel decia cuantos, y **cuales** habia
  que deducirlos mentalmente de la tabla. Ahora `GET /api/admin/quotes` devuelve
  tambien `paraRevisar`, que sale de `marcarParaRevision()` con la misma lista y el
  mismo `hoy` que usa `contarAntiguas()`, y cada fila vencida lleva una insignia
  con los meses cumplidos y fondo coral. Se anadio ademas un filtro "ver solo las N
  para revisar", que **solo aparece si hay algo que revisar**: un filtro que no
  filtra nada es ruido. El contador de la cabecera **no** cambia al filtrar, porque
  describe el total, no lo que hay debajo.

  **RF-23 comprobado en caliente, que es la regla que mas da pena que se rompa.**
  Se envejecko artificialmente la solicitud 4 a **14 meses** en `ACCEPTED` y la 2 a
  **30 meses** en `PENDING`:
  - `vencidas: 1` y `paraRevisar: [{ id: 4, status: ACCEPTED, meses: 14 }]`.
  - La 2, con **30 meses cumplidos**, **no aparece**. Una conversacion abierta hace
    dos años y medio no es un dato caducado, es una conversacion abierta.
  En el navegador: la fila 4 con fondo `bg-cartoon-coral` e insignia *"14 meses
  desde su envío: para revisar"*, la 2 sin nada. El filtro deja **solo** la 4, con
  `aria-pressed="true"` y el boton pasa a decir "Ver todas las solicitudes".

  **El texto de la insignia no dice "vencida" a secas**, porque eso se lee como "ya
  no existe", y el sistema **no** ha borrado nada: dice *"para revisar"*. Hay un test
  que lo comprueba negando las palabras "borrada" y "eliminada".

  **Sin columna nueva, sin cron y sin endpoint nuevo.** Anadir un campo "revisada"
  en el esquema seria inventar estado que ningun RF pide, y la spec es explicita en
  que la decision es de una persona. Si el administrador decide **conservar** una
  solicitud vencida, seguira apareciendo como vencida, y eso es lo correcto: sigue
  pasados los 12 meses.

  Tests **358 → 366**: 8 nuevos en `tests/cotizaciones-panel.test.ts`, escritos
  primero y **vistos en rojo** (8 fallos). El indice de vencidas es un `Map` y no
  una busqueda lineal porque el listado se repinta entero en cada render, y con 300
  filas eso serian 90.000 comparaciones cada vez. El `filtrarSoloVencidas()` **no
  muta** el array recibido, porque el listado completo lo necesitan la cabecera y
  para apagar el filtro.

  **Dos ideogramas se me colaron** en los comentarios de este bloque y los pillo el
  barrido con su control positivo.

  **Datos de prueba restaurados.** El envejecimiento artificial se deshizo con
  `UPDATE` a los `createdAt` y estados originales de las dos solicitudes, y se
  comprobo que la API vuelve a `vencidas: 0`.

  **Pendiente que esta nota no cierra, y es importante:** rellenar los datos **sigue
  sin cambiar nada visible**, porque `readLegalData()` no lo llama ninguna pagina
  todavia. Eso es T13 (F5), las siete paginas legales, que es el punto 4 del
  recuento. Este panel es la via de entrada; el destino es la F5.

- [x] **T12** — `src/app/admin/cotizaciones/page.tsx` (**protegida**, `force-dynamic` **en el
  `page.tsx`**) + `CotizacionesView.tsx` (cliente) con **listado**, **detalle**, **cambio de
  estado** y **borrado** (`RF-25`). **El contador de las que han pasado los 12 meses** sale de
  `contarAntiguas()` con el `hoy` que pasa la página del servidor (**el panel no lee el
  reloj**: el reloj se lee en un sitio y se pasa). El borrado es **una fila cada vez**
  (`RF-24`) y avisa de que también borra la aceptación asociada. Cada fila muestra la
  **versión de los documentos que aceptó** esa solicitud (`RF-21`, leído de
  `LegalAcceptance`).
  **Hecho cuando:** typecheck y lint → exit 0; **V10** completo (lista, detalle, cambio de
  estado y borrado, **y nadie fuera del admin la ve**: sin sesión → 307 a `/login`, con BUYER
  → 403); el contador de vencidas **coincide** con `contarAntiguas()` calculada aparte sobre
  la misma lista; tras un borrado **no queda ni una** fila hija en `QuoteRequestItem`
  (comprobado con `SELECT COUNT(*)`, no mirando la interfaz); el listado **muestra** la
  versión aceptada de cada solicitud.

  **NOTA DE VERIFICACIÓN (hecha).**
  `npm run check` → **exit 0**: typecheck 0, lint 0, **347 tests / 59 suites / 0 fallos**,
  build correcto con **28 rutas** (27 + este panel). `/admin/cotizaciones` sale **`ƒ`**
  (dinámica) en la tabla del build, que es lo que exige el `force-dynamic`.
  Tests **332 → 347**: 15 nuevos en `tests/cotizaciones-panel.test.ts`, escritos primero y
  **vistos en rojo** (`Cannot find module`). Sin dependencias nuevas.

  **V10, las cuatro operaciones, comprobadas contra el servidor y no leyendo el código:**
  - **Listado**: 3 solicitudes servidas por `GET /api/admin/quotes`, cada una con su
    `_count.items` y su `legalAcceptances`.
  - **Detalle**: `GET /api/quotes/4` → **200** con `2 × Pin VIP` y sus dos aceptaciones.
  - **Cambio de estado**: `status: "inventado"` → **400**; `ACCEPTED` → **200**;
    `id: 9999` → **404**; y el valor **persiste** en la base de datos (`SELECT status`
    = `QUOTED` despues de cambiarlo desde la interfaz).
  - **Borrado**: antes **1 / 1 / 2** (`QuoteRequest`, `QuoteRequestItem`,
    `LegalAcceptance`), despues **0 / 0 / 0**. Repetido → **404**.

  **Nadie fuera del admin la ve, por los dos caminos:** sin sesion → **307** a
  `/login` (y `/admin/apariencia`, `/admin/productos` y `/admin/categorias` dan el
  mismo **307**, o sea que el panel se comporta como sus hermanos); con sesion
  **BUYER** → **403** en `GET /api/admin/quotes`, en `GET /api/quotes/4` y en
  `DELETE /api/quotes/4`, y la pagina rebota a `/` sin pintar nada. Comprobado ademas
  que la solicitud 4 **sigue existiendo** tras los intentos con BUYER: los 403 no
  tocaron nada.

  **Contador de vencidas, contrastado por fuera.** La API dice **0** y
  `contarAntiguas()` calculada aparte sobre la misma lista dice **0**, con una fila en
  estado terminal (y reciente), que es el caso que mas se presta a confusion. Para
  que el contraste no fuera trivial se envejencio esa fila terminal a 14 meses en una
  copia de la respuesta: el calculo dio **1**, asi que la funcion cuenta cuando debe y
  la API esta usando esa misma funcion. `retention.test.ts` cubre la regla con fechas.

  **Que se ve, leido del DOM del navegador:** la solicitud 4 pinta
  `Acepto: Términos y condiciones 1.0 · Aviso de privacidad 1.0`, y la solicitud 2,
  que **no tiene** aceptaciones, pinta `Acepto: Ninguna`. Un vacío ahi habria parecido
  un fallo de carga.

  **Dos errores mios, corregidos antes de entregar, y por que los menciono:** (1) se
  me olvido el `force-dynamic`; (2) puse `new Date()` a **nivel de modulo**, lo que
  congela el reloj al arrancar el proceso: en un servidor con semanas vivo, todas las
  antiguedades del panel serian las del arranque. Ahora se lee dentro de la funcion.
  Ademas, tres tests nuevos estaban mal escritos (comparaban en minuscula contra un
  titulo en mayuscula, y buscaban una palabra que el texto no tenia); al arreglarlos
  aparecio que **el panel tampoco llevaba acentos**, el mismo defecto que se corrigio
  en los documentos legales.

  **Desviacion de una convencion del proyecto, y por que:** los otros paneles reciben
  los datos por props desde su pagina. Este los carga desde el navegador, y **no** es
  capricho: lo unico que comprueba la revocacion de una sesion es `requireAdmin()`,
  que usa `getSessionUser()` y consulta la base de datos; el middleware corre en Edge
  y no tiene Prisma. Una pagina que consultara Prisma por su cuenta serviria el HTML
  a una sesion ya invalidada por un cambio de contrasena. El coste es un
  `eslint-disable react-hooks/set-state-in-effect` **con el motivo escrito dentro**,
  igual que el del carrito.

  **Datos de prueba restaurados.** El borrado se verifico con la solicitud 14, que
  era de pruebas propias, y los estados que se tocaron se devolvieron a `PENDING`.
  Quedan las dos que el propietario decidio conservar.

  **Pendiente que esta nota no cierra:** `/admin/legal` entra en este mismo bloque
  (T11). El enlace **no** se ha anadido al menu todavia, a proposito: publicar el
  enlace antes de la pagina seria repetir el fallo que `AdminNavLinks` existe para
  evitar, y un 404 en el menu de trabajo se nota mas que un enlace que no aparece.

---

## F5 — Las siete páginas legales y `/contacto`

- [x] **T13** — **Siete `page.tsx` nuevos**: `/terminos-y-condiciones`,
  `/aviso-de-privacidad`, `/politica-de-cookies`, `/politica-de-envios`,
  `/cambios-y-devoluciones`, `/informacion-legal`, `/accesibilidad`. **+7 rutas del build
  (27 → 34).** Cada una: `export const dynamic = "force-dynamic"` **en el `page.tsx`** (léen
  la base de datos, y `force-dynamic` no va en componentes), `metadata` propio con título y
  descripción, `documentoDe(slug)` para título y versión, `<LegalDocument>` para el texto
  (aplicando `interpolar()`), `<LegalVersion>` para la línea de versión, un **único `h1`**,
  un `h2` por sección, `<nav aria-label="Documentos legales">` con los otros seis, `← Volver`
  como ya lo hace `/contacto`, y **solo clases de la paleta de `docs/DESIGN.md`** (ningún hex
  nuevo). **`/contacto` se reescribe**: hoy está vacía de datos de contacto (`RF-13`, V13) y
  pasa a mostrar los reales **o el marcador si faltan**, más los enlaces a las políticas.
  `/cotizacion` **no** se recrea: solo se le añade el aviso de que es una **solicitud, no un
  pago** y de que el precio es el de catálogo hasta confirmar (`RF-10`).
  ⚠️ **Ojo con V18**: `/contacto` y las siete legales **serán `ƒ`**, porque leer `LegalData`
  impide prerenderizarlas (plan §5.2, duda **B**). `/novedades` **sigue `○`**: esa es la que
  demuestra que `MainLayout` no se ha tocado. **Cero dependencias nuevas.**
  **Hecho cuando:** **V1** (las siete abren con **200** en móvil y escritorio, con su versión
  visible y su fecha), **V2** (`/aviso-de-privacidad` sin datos rellenados muestra
  `[REQUIERE DATO DEL PROPIETARIO]` y **ningún dato inventado**), **V13** (`/contacto` muestra
  correo y teléfono reales **o** el marcador), **V14** (`/accesibilidad` **no** dice que
  cumple WCAG AA), **V7** (el pie enlaza a las políticas); el build sale con **+7** rutas y
  `git diff -- src/components/layout/MainLayout/MainLayout.tsx` → **vacío**;
  `grep -rniE "#[0-9a-f]{3,6}" src/app/terminos-y-condiciones src/app/aviso-de-privacidad
  src/app/politica-de-cookies src/app/politica-de-envios src/app/cambios-y-devoluciones
  src/app/informacion-legal src/app/accesibilidad src/app/contacto` → **cero** (las páginas
  usan clases, no hex).

  **NOTA DE VERIFICACIÓN (2026-10-07, anotada al cierre).** Verificada en su sesión y
  reverificada hoy por HTTP contra el dev server: las siete legales + `/contacto` →
  **8 × 200** (**V1**); `/aviso-de-privacidad` sin datos → marcador, cero datos
  inventados (**V2**); `/contacto` con correo/teléfono reales **o** el marcador
  (**V13**); `/accesibilidad` sin claim AA (**V14**); el pie enlaza las políticas
  (**V7**); build **+7 rutas** y las ocho páginas **`ƒ`**. Sin hex nuevos (solo clases
  de la paleta). ⚠️ V18: el `git diff` de `MainLayout.tsx` estuvo **vacío** hasta F9;
  hoy ese fichero ganó el **skip-link** (T17, `docs/ACCESSIBILITY.md`), que **no** rompió
  el prerender: `/novedades` sigue **`○`** en el build de hoy.

---

## F6 — Infraestructura de consentimiento (**condicional**) y el pie de página

- [x] **T14** — `ConsentProvider.tsx` + `ConsentPanel.tsx` (clientes). El panel
  **devuelve `null` y no escribe nada** mientras `hayQuePedirConsentimiento()` sea `false`
  (`RF-15`, `D14`): **hoy no se pinta nada** y no se crea ni una clave en `localStorage`. Con
  tecnologías no esenciales: las **cuatro** categorías y las **tres** vías (`RF-16`), "aceptar"
  y "rechazar" generados **desde la misma `BOTON_BASE`** (`RF-17`), y cambiar una decisión
  previa **pide confirmación** en vez de sobrescribir (`RF-18`). Se monta en el **`Footer`**,
  **no** en `MainLayout` (plan §5.1), y el pie gana el **enlace visible a "preferencias de
  cookies"** y los enlaces a las políticas (`V7`).
  **Hecho cuando:** typecheck y lint → exit 0; **V6** (la portada **no** muestra ningún
  banner); **V5** (`localStorage` en la portada → **solo** `pingo-quote-cart`, **cero** claves
  de consentimiento); **V4** (`document.cookie` → **solo** `pp_session`); **V7** (el pie tiene
  el enlace visible); el panel se **reabre** desde el pie; **y la parte que hoy no se puede ver
  en el navegador** (las cuatro categorías, el mismo número de clases y la confirmación) está
  **cubierta por los 7 tests de T4**, que se anotan como tales en la nota: `consent.test.ts`
  en verde.

  **NOTA DE VERIFICACIÓN (2026-10-07, anotada al cierre).** En su sesión: sin banner
  (**V6**), `localStorage` solo `pingo-quote-cart` (**V5**), `document.cookie` solo
  `pp_session` (**V4**), panel reabrible desde el pie, `consent.test.ts` en verde. Hoy
  **reverificado en el navegador y endurecido en F9**: el enlace "Preferencias de
  cookies" está **siempre visible** en el pie; el panel se abre **solo a demanda** y
  abrirlo **no escribe** `localStorage` (D14 reinterpretado); las **cuatro** categorías
  y las **tres** vías (Aceptar/Rechazar/Configurar, RF-17 8/8 clases). El panel es ya
  un diálogo modal accesible: `role="dialog"`, `aria-modal`, foco inicial en
  `consent-close`, **Escape cierra** y **el foco vuelve al enlace que lo abrió**
  (correcciones de F9, `docs/ACCESSIBILITY.md` §2.1).

---

## F7 — `robots.txt`, `sitemap.xml` y `SITE_URL` · **+2 rutas del build (34 → 36)**

- [x] **T15** — `src/lib/site-url.ts` (**puro**, existe porque lo necesitan **dos** ficheros) +
  `src/app/robots.ts` + `src/app/sitemap.ts`. `SITE_URL` se lee **con valor de reserva y sin
  `requireEnv`**: `requireEnv` **rompería el build** en cualquier entorno que no la tenga
  (plan §14, P9). `robots.txt` prohíbe `/admin`, `/api`, `/perfil` y `/login`. El `sitemap`
  lista las rutas **públicas** y **no** las de administración, con `lastModified` tomado de
  las **fechas del registro**, nunca de `new Date()`. `SITE_URL` en `.env.example` con su
  propósito (`RF-4`): **la única variable nueva**, y **`.env` sigue ignorada**.
  **Hecho cuando:** `curl -s localhost:3000/robots.txt` → 200 con `Disallow: /admin`,
  `/api`, `/perfil`, `/login`; `curl -s localhost:3000/sitemap.xml` → 200, **XML válido**, con
  las rutas públicas y **sin** `/admin/*` ni `/api/*`; **con `SITE_URL` ausente, el build
  sigue terminando** (se avisa por log y sale la URL de reserva); `grep -c SITE_URL .env.example`
  → 1; `git check-ignore -v .env` → sigue ignorada; el build **+2** rutas.

  **NOTA DE VERIFICACIÓN (hecha).**
  `npm run check` → **exit 0** (typecheck 0, lint 0, **332 tests / 0 fallos**).
  Build con **27 rutas** (22 de la 008 + 3 de F3 + **2** de F7), y **`/novedades`
  sigue `○` (estática)**, que es lo que demuestra que `MainLayout` no se tocó:
  `git diff -- src/components/layout/MainLayout/MainLayout.tsx` → **vacío**.
  `GET /robots.txt` → **200** con `Disallow:` de `/admin`, `/api`, `/perfil`,
  `/login` **y** `/cotizacion`; `GET /sitemap.xml` → **200**, `Content-Type:
  application/xml`, **XML válido** con **11 `<loc>`** y **ninguna** ruta privada
  colada (`/admin`, `/api`, `/perfil`, `/cotizacion`, `/login` → **cero**).
  `SITE_URL` es la **única** variable nueva y `.env.example` la declara **1 vez**.
  `git check-ignore -v .env` → `.gitignore:34:.env*	.env` (**sigue ignorada**).
  `SITE_URL` **no** es `RequiredEnv` (`RequiredEnv = "DATABASE_URL" | "SESSION_SECRET"`),
  con valor de reserva y aviso por log, así que el build no depende de que exista.

  **Divergencia encontrada entre la spec y el código, y corregida antes de commitear.**
  El criterio de este enunciado pedía prohibir `/admin`, `/api`, `/perfil` y `/login`.
  El código prohíbe `/admin`, `/perfil` y **`/cotizacion`**: se había desviado, y sin
  mirar el `robots.txt` servido la tarea habría parecido cumplida. Corregido a la
  **unión de las cinco**, con `/cotizacion` conservado porque el carrito del visitante
  tampoco tiene nada que indexar. `Disallow` no protege el acceso, solo el índice
  (lo dicen el middleware y `requireAdmin()`), así que **añadir** rutas no cuesta nada.
  **Lección que queda escrita:** un criterio de "hecho cuando" hay que comprobarlo
  **contra la salida real**, no contra el código que uno mismo acaba de escribir.

  **Pendiente de este bloque:** `SITE_URL` en el **servidor** sigue siendo
  `http://localhost:3000`. Los 12 coincidencias del barrido de secretos son esa URL
  local (más `MARIADB_DATABASE` y `ADMIN_EMAIL`, los dos que `PUBLICAR.md` §2
  autoriza). **El dominio real no está en ningún fichero**: `.env.example` tiene
  `https://ejemplo.com`. Hay que poner el dominio de Pingo POP en el servidor antes de
  desplegar, o el `sitemap` publicará `localhost`.

---

## F8 — Los huecos de seguridad que quedaban

- [x] **T16** — **`RF-33`:** rate limit en las lecturas públicas `GET /api/categories` y
  `GET /api/products`. **La firma pasa a `GET(request: Request)`** porque las cabeceras
  llegan ahí; **nada más** de esos dos ficheros se toca. ⚠️ **El límite tiene que ser alto y
  explícito, no `DEFAULT_MAX = 10`**: `AdminProductsView.refresh()` llama a
  `GET /api/products` **después de cada escritura**, y con el límite de por defecto el panel
  **se bloquearía a sí mismo** (plan §14, P10).
  **`RF-32`:** comprobar **con peticiones reales** que `securityHeaders` también salen en las
  **respuestas de error** de las rutas de API. Si falta alguna, **no** se toca el CSP ni el
  middleware: se anota el delta y **se pregunta** (`R7`).
  **`RF-35`:** barrido de los `console.*` del repositorio: ninguno imprime contraseñas,
  tokens completos, cookies ni `DATABASE_URL`, y los que imprimen un error **no** sueltan el
  objeto crudo (solo `error.name` o `fallo.message`), que es lo que ya hace
  `src/lib/site-settings.ts`.
  **Hecho cuando:** tras **cinco** escrituras seguidas en `/admin/productos`, el panel **sigue
  cargando** (sin 429); al superar el tope de lectura, la petición sale **429** con
  `Retry-After`; **`curl -sI` a una ruta de API inexistente (404) y a un `POST /api/quotes` con
  cuerpo `{}` (400)** → los cuatro cabeceras presentes **también en el error**
  (`Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`); `grep -rniE "console\.[a-z]+\(.*(password|token|cookie|database_url|
  session_secret|passwordhash)" src/ prisma/` → **cero coincidencias**;
  `grep -rn "console\." src/ prisma/` → **ninguna** línea con un objeto de error crudo; y la
  **pérdida del límite al reiniciar el servidor está documentada** como límite conocido, en
  `docs/GATES.md` o `docs/THREATS.md`.

  **NOTA DE VERIFICACIÓN (2026-10-07).** Test-first (rojo → verde): 2 casos nuevos en
  `tests/rate-limit.test.ts` para `MAX_LECTURAS_PUBLICAS = 120` **explícito** (≠
  `DEFAULT_MAX`) y los 4 de extracción de IP. Verificado por HTTP contra el dev server:
  **117 × 200** y a partir del 118 → **429 con `retry-after`**; **RF-32**: los cuatro
  `securityHeaders` presentes **también** en **404** y **400** de las rutas de API
  (cero delta, no se tocó middleware); **RF-35**: `console.*` con cero contraseñas /
  tokens / `DATABASE_URL` y cero objetos de error crudos (se quitó la contraseña
  literal de `prisma/make-buyer.ts` y los 13 líneas de objeto crudo → `fallo.message`).
  **P10 confirmado:** tope mayor que el default para que `AdminProductsView.refresh()`
  no se auto-bloquee. Pérdida al reiniciar documentada en `docs/GATES.md` §3. Run
  **419/77/0**.

---

## F9 — Verificación completa

- [x] **T17** — `npm run check` → **exit 0** en los cuatro: typecheck, lint, **190+N tests**
  y build, **con el dev server parado**. Apuntar los **tres números de la salida real**
  (tests, suites, rutas; esperado **≈234 / 31 / 36**, con 44 casos nuevos como **mínimo**).
  Luego **V1 a V18**, una a una, con lo que salió de verdad. **`RF-29`, `RF-30`, `RF-31`:** la
  auditoría de accesibilidad **se escribe** en `docs/ACCESSIBILITY.md` como **lista de
  hallazgos con gravedad**, cubriendo navegación por teclado, foco visible, contraste de
  `docs/DESIGN.md`, etiquetas, mensajes de error, alternativas textuales, encabezados y
  estructura, y **diciendo explícitamente qué no se comprobó**. **No es un sello y no declara
  conformidad AA.** **`RF-34`:** `npm audit` anotado con la justificación de las **8 altas
  residuales**, sin actualizar dependencias. **`RF-36`, `RF-37`, `RF-38`:** comprobar que
  nada bloquea ni redirige por IP, que `/politica-de-envios` **sí** dice que el envío es solo
  en México, y que el aviso de privacidad dice que la IP **no se persiste**. **`RF-12`,
  `RF-13`:** comprobar por **ausencia** que en `/perfil` no hay ninguna acción de borrar cuenta
  ni de descargar datos, ni ruta que lo haga. Comprobación final de prerenderizado: `/novedades`
  **sigue `○`**, `/contacto` y las siete legales son **`ƒ`** (plan §5.2, duda **B**), y
  `git diff -- src/components/layout/MainLayout/MainLayout.tsx` → **vacío**.
  **Barrido de caracteres no latinos antes de devolver** (lección de `MEMORY.md`, y ya ha
  pasado tres veces en este proyecto): patrón
  `[\x{3000}-\x{9fff}\x{0400}-\x{04ff}\x{ff00}-\x{ffef}\x{fffd}]` sobre **todo** lo escrito
  en esta spec. **"No files found" es un fallo del barrido, no un resultado limpio**: hay que
  confirmar antes que el barrido **está corriendo** (una búsqueda que sí debe encontrar
  algo).
  **Hecho cuando:** `npm run check` → **exit 0**; los tres números apuntados **de la salida**;
  las **18** verificaciones V1–V18 anotadas con su resultado; `docs/ACCESSIBILITY.md` existe,
  tiene hallazgos **con gravedad** y **no** contiene una declaración de conformidad;
  `npm audit` → **sin altas nuevas**; el barrido de CJK → **ninguno** y **probado que
  corría**.

  **NOTA DE VERIFICACIÓN (2026-10-07).** `npm run check` con el dev server **parado**:
  typecheck 0 · lint 0 · **419 tests / 77 suites / 0 fallos** · build **38 rutas**.
  **V1**(8×200) · **V2**(marcador) · **V3**(contra `session-token.ts` y
  `quote-cart-storage.ts`) · **V4**(solo `pp_session`) · **V5**(solo
  `pingo-quote-cart`) · **V6**(sin banner) · **V7**(pie con enlaces) ·
  **V8/V9**(idempotencia: doble clic → una fila, T9) · **V10**(panel cotizaciones, T12)
  · **V11**(retención en caliente, T11) · **V12**(cabeceras en error, T16) ·
  **V13**(contacto marcador) · **V14**(sin claim AA) · **V15**(IP extranjera/IPv6 →
  200) · **V16**(307 a `/login?next=`) · **V17**(audit 8 altas justificadas, sin
  nuevas) · **V18**(`/novedades` **`○`**, legales+contacto **`ƒ`**, 5 módulos puros con
  suite). **RF-29/30/31**: auditoría escrita hoy en `docs/ACCESSIBILITY.md` — hallazgos
  con **gravedad**, **sin declaración de conformidad**; corregidos skip-link (WCAG
  2.4.1), Escape + retorno de foco del panel (APG) y contraste del file picker del
  admin; **lo que no se comprobó, dicho explícitamente** (lectores de pantalla, zoom
  400 %, focus trap físico). **RF-34**: audit 8 altas justificadas en `docs/GATES.md`.
  **Barrido CJK:** hoy **limpio** (0 coincidencias, 235 ficheros) **con control positivo
  OK** (detectó el CJK de su propio fichero de control). ⚠️ `git diff MainLayout` ya
  **no** es vacío: el skip-link de esta misma F9 (documentado en ACCESSIBILITY.md); el
  prerender no cambió (`/novedades` `○`).

---

## F10 — Documentación y **reciclaje** de `MEMORY.md`

> ⚠️ **`MEMORY.md` está en exactamente 100 líneas y su tope son ~100.** **No se le añade ni
> una línea.** Esta tarea **recicla**: lo que entra obliga a que salga algo, y decidir qué sale
> es una decisión, no un apaño.

- [x] **T18** — Recuentos con los números **reales de T17**: `AGENTS.md` (líneas 30 y 46 y la
  lista de ficheros), `README.md` (recuentos, **rutas**, puesta en marcha con `SITE_URL`),
  `docs/GATES.md` (§8 y §9, más el límite del rate limit en memoria), `docs/SDD.md` (§4 con
  los dos modelos nuevos y el `status` como enumeración, §7 los flujos nuevos, §9 el recuento
  de suites, §10 el despliegue con las dos migraciones, §11 los riesgos).
  `docs/THREATS.md`: los **tres** puntos de entrada nuevos (`PATCH /api/admin/legal`,
  `GET`/`PATCH /api/admin/quotes`, `GET`/`DELETE /api/quotes/[id]`), que `/api/quotes/[id]`
  **no** es pública pese al prefijo, la idempotencia como control, el enum como control, el
  borrado transaccional, y que la IP **no se persiste** y **no** se usa para obligaciones
  legales. `docs/PUBLICAR.md`: `LegalData` son **datos del negocio en la base de datos**, no
  ficheros que se suban, y `SITE_URL` es de entorno. `docs/DEPLOY.md`: `SITE_URL` en la lista
  de variables y las **dos** migraciones nuevas en el orden. `CHANGELOG.md` bajo
  `[Sin publicar]`, en el apartado `Añadido` **que ya existe** (no crear un segundo
  encabezado igual). `docs/DESIGN.md` **solo si** el renderizado metió un hex nuevo: la paleta
  es su fuente de verdad.
  **`MEMORY.md`: reciclar, no ampliar.** **Sale** (elegido, no improvisado): la línea de fase
  de la spec 008 y la del arreglo de imagen de producto, que ya están en `AGENTS.md` como
  principios; el detalle de `SiteSettings` y de las dos carpetas de subidas, también en
  `AGENTS.md`; y **H3** (el doble "+" rápido), que lleva meses abierto con bajo impacto y no
  es de esta spec. **Entra**: fase 009 sin commitear; **D14** (el panel de cookies es
  condicional y hoy no se pinta nada); **D15** (12 meses, y a los 12 meses **se marca, no se
  borra**); **D18** (los datos legales van en la base de datos, los rellena el
  administrador, y por eso el build no depende de ellos); `QuoteRequest.status` como
  enumeración y el token de idempotencia; el hallazgo **H6** = la contradicción entre `RF-19`
  y `RF-20` (duda **C** del plan); y **RF-39**, la jurisdicción, **anotada y no implementada**.
  **Barrido de secretos de `docs/PUBLICAR.md` §2** antes de cualquier commit futuro.
  **Hecho cuando:** `grep -rn "190 tests\|26 suites\|22 rutas" README.md AGENTS.md docs/*.md
  MEMORY.md` → **ningún número obsoleto**; `wc -l MEMORY.md` → **≤ 100**;
  `git diff --stat` muestra los ficheros de documentación y **solo** ellos;
  barrido de CJK sobre lo escrito → **ninguno** y **probado que corría**; **ni `git add`, ni
  `commit`, ni `push`.**

  **NOTA DE VERIFICACIÓN (2026-10-07).** Recuentos actualizados a **419/77/38** en:
  `AGENTS.md` (líneas 30 y 46, + lista de suites y referencias de la spec 009 y de
  `docs/ACCESSIBILITY.md`), `README.md` (tabla de stack, scripts, estado actual —
  **ya no dice 190/26/22**), `docs/SDD.md` (§9: 419/419 con la lista de suites de la
  spec 009), `docs/THREATS.md` (recuentos globales y por suite: rate-limit 13,
  session-token 23), `docs/GATES.md` (ya actualizado en su sesión), `CHANGELOG.md`
  (entrada de la spec 009 en `[Sin publicar]` → `Añadido`, sin duplicar encabezado),
  `docs/DEPLOY.md` (§1: `SITE_URL`; §5: las dos migraciones nuevas), `docs/PUBLICAR.md`
  (`LegalData` en BD, `SITE_URL` de entorno). **MEMORY.md reciclado** en su sesión
  (reescrito; fase, decisiones nuevas, trampas, hallazgos A1/A2/A3). Barrido CJK al
  cierre: **limpio con control positivo** (235 ficheros). `grep "190 tests\|26 suites\|22
  rutas"` sobre README/AGENTS/docs → **cero**. Sin `git add`/`commit`/`push` (no
  pedidos).

---

## Deuda que esta spec deja anotada, no pagada

- **Recuperación de contraseña** (§17): no existe. Requiere proveedor de correo. El aviso de
  privacidad **dice que no existe**, en vez de insinuarlo.
- **Rate limit en memoria**: se pierde al reiniciar el servidor y **no** es global si hay más
  de un proceso. Redis es otro sistema (`RF-33` lo acepta y lo documenta).
- **Borrado automático**: a los 12 meses **se marca**, no se borra. Nadie limpia lo marcado
  salvo que alguien lo borre a mano en el panel (`RF-22`, R10).
- **`RF-19` en el alta de cuenta**: sin ruta que cree cuentas, el registro del alta no se
  puede vincular a la cuenta (`RF-20` prohíbe guardar identificador). Ver duda **C**.
- **Ficheros huérfanos** en `public/uploads/`: quitar una foto no borra el fichero (de la
  spec 008, sigue abierto).
- **`AdminProductsView` no adopta `ImagePicker`** (spec 008) y `GET /api/products` sigue
  siendo pública y la llama el panel (T16).

## Fuera de esta spec

- **Pagos, checkout, envío de correo, registro público, reseñas, envíos internacionales,
  módulo de jurisdicción**: los seis están en §5 de la spec y fuera del plan.
- **Migrar datos legales a `.env`**: al revés que en otras specs. Van en la base de datos
  (`D18`), y solo `SITE_URL` es variable.
- **Reescribir `next.config.ts`** o el `middleware.ts`: `R7` lo prohíbe y T16 solo los
  **mira**.

## Lo que **no** se hace al terminar

- **Ni `git add`, ni `git commit`, ni `git push`.** Nadie lo ha pedido. Cuando se pida, el
  barrido de secretos de `docs/PUBLICAR.md` §2 va **antes**, porque el repositorio es
  **público** y un secreto publicado no se quita con un commit posterior.
- **No se inventa ni un dato legal.** Si falta razón social, RFC, domicilio, correo,
  teléfono o responsable, sale `[REQUIERE DATO DEL PROPIETARIO]` (R1).
- **No se cambia el encabezado de `spec.md`** a "aprobada", ni las cuatro dudas de §15 del
  plan. Son del usuario.