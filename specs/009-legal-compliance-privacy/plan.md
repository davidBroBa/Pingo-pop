# Plan: Pingo POP — Cumplimiento legal, privacidad, seguridad y accesibilidad (009-legal-compliance-privacy)

> Spec con **D14–D19 cerradas** por el usuario el 2026-10-06. Un solo bloque de trabajo
> (D17), **once fases F0–F10**. **No se hace commit.**
> Este plan no escribe código: dice qué se toca, en qué orden y con qué criterio se
> comprueba. La implementación es de otra fase.
>
> ⚠️ **El encabezado de `spec.md` sigue diciendo "BORRADOR".** Lo cambia quien lo
> aprueba, no este plan. Hasta que diga lo contrario, este documento es un plan
> **no aprobado**.
> Nota menor: la carpeta `templates/` **no existe** en el repositorio, así que el
> formato es el de `specs/008-site-and-category-images/plan.md`, que es la referencia
> de estilo del proyecto.

## 1. Estrategia en una frase

Primero todo lo que se puede probar **sin base de datos y sin navegador** (cinco módulos
puros y sus cinco suites, cada una vista en rojo antes de existir), después las **dos**
migraciones —que son la dependencia dura y lo único que puede romper el proyecto— y solo
entonces las capas que las necesitan: API, paneles, páginas legales, y al final la
verificación y la documentación.

## 2. Orden de ejecución y por qué ese orden

| Fase | Qué | Por qué aquí y no antes |
|---|---|---|
| **F0** | Baseline: `npm run check` en verde y **los tres números anotados** | Si el proyecto ya está rojo, no se puede distinguir "lo ha roto esta spec" de "ya estaba roto". Y los números hay que medirlos **antes** de cambiarlos |
| **F1** | **Cinco módulos puros** (`legal-data`, `legal-versions`, `consent`, `retention`, `quote-idempotency`) con sus cinco suites | Lo único testeable sin `jsdom`, sin BD y sin reloj. Va primero y **se ve en rojo antes de existir** |
| **F2** | ⚠️ **`LegalData`, `LegalAcceptance` y `QuoteRequest.status` como enumeración** + `prisma generate` + reiniciar dev | **Dependencia dura.** Sin esto el cliente de `src/generated/prisma/` no conoce los modelos y sale `Unknown field`. Bloquea F3, F4 y F5 |
| **F3** | Rutas de API: `PATCH /api/admin/legal`, `GET`+`PATCH /api/admin/quotes`, `GET`+`DELETE /api/quotes/[id]`, e idempotencia en `POST /api/quotes` | Depende de F2: sin los modelos el cliente no compila |
| **F4** | Paneles `/admin/legal` y `/admin/cotizaciones`, más los enlaces en `AdminNavLinks` | Depende de F3: los paneles no escriben por su cuenta, hablan con esas rutas |
| **F5** | **Siete páginas legales** nuevas y `/contacto` reescrita | Depende de F2 (leen `LegalData`) y de F3 (`PATCH` para rellenarlo). Es la fase más grande de escritura |
| **F6** | Infraestructura de consentimiento (**condicional**: hoy no se pinta nada) y enlace en el `Footer` | No depende de la migración. Se puede hacer antes, pero se hace después de que el Footer tenga los enlaces legales queRF-7 exige |
| **F7** | `robots.ts` y `sitemap.ts` + `SITE_URL` | Depende de que las rutas ya existan: un sitemap queliste páginas que no están es peor que no tener sitemap |
| **F8** | Rate limit en las lecturas públicas y comprobación de cabeceras en respuestas de error | Toca dos ficheros que **no** son de esta spec (`categories/route.ts`, `products/route.ts`, `next.config.ts` solo se mira). Va después de que su propio trabajo esté verde, para no mezclar un fallo de esa tercera parte con una regresión propia |
| **F9** | Verificación completa: `npm run check`, V1–V18 y **auditoría de accesibilidad** | Solo cuando todo está montado |
| **F10** | Documentación, incluido **reciclar `MEMORY.md`** | Al final: los números se cuentan cuando ya no cambian |

**Las migraciones van en F2, no al principio.** Es tentador hacerlas las primeras, pero si
después algo falla en F1 se tiene un modelo nuevo en la base de datos sin una sola tarea que
lo use, y el radio de "deshacer" es mucho más ancho.

## 3. El principio que manda

**La lógica comprobable va en módulos puros de `src/lib/`.** El runner es `node:test` **sin
jsdom** y `docs/constitution.md` §6 prohíbe añadir dependencias. Por eso:

- El marcador, los campos que faltan, la interpolación de los datos legales, las cuatro
  categorías de consentimiento, el recuento de clases del botón "rechazar", los 12 meses de
  retención, los estados terminales y la validación del token de idempotencia son
  **funciones puras**, no lógica enterrada en un componente.
- Los componentes de React y los route handlers **no se testean**: se comprueban en
  navegador con los criterios V1–V18 de la spec §7.2, que tienen criterio exacto.
- **Ningún módulo puro lee el reloj.** `hoy` es **siempre parámetro** (F1 `retention`,
  F1 `consent`, y el `hoy` que pasan las páginas y el panel). El reloj se lee en el
  servidor, en un solo sitio, y se pasa. Por eso el test puede fijar la fecha y no hay
  pruebas que fallen un día de mes.

**Lo que sí toca disco o red, no se testea aquí:** la base de datos (migraciones), la
escritura en `public/uploads/` y los route handlers. Se verifican con V1–V18, y **cada
comprobación se anota con lo que salió de verdad**.

## 4. Ficheros creados

| # | Fichero | Responsabilidad única |
|---|---|---|
| 1 | `src/lib/legal-data.ts` | **Puro.** `MARCADOR_PENDIENTE`, `CAMPOS_LEGALES`, `LegalDataSchema` (Zod), `leerLegal()`, `camposFaltantes()`, `interpolar()`. Ni React, ni BD, ni DOM |
| 2 | `src/lib/legal-versions.ts` | **Puro.** `DOCUMENTOS` (los siete, con versión, fecha y huella), `documentoDe()`, `versionDe()`, `sonVersionesValidas()`. El módulo único del que salen versión y fecha (RF-6) |
| 3 | `src/lib/consent.ts` | **Puro.** `TECNOLOGIAS_NO_ESENCIALES` (**vacía**), `CATEGORIAS_CONSENTIMIENTO`, `hayQuePedirConsentimiento()`, `crearRegistro()`, `leerRegistro()`, `pideConfirmacion()`, `botonClases()`, `contarClases()` |
| 4 | `src/lib/retention.ts` | **Puro.** `MESES_RETENCION = 12`, `ESTADOS_TERMINALES`, `mesesTranscurridos()`, `esVencida()`, `marcarParaRevision()`, `contarAntiguas()` |
| 5 | `src/lib/quote-idempotency.ts` | **Puro.** `FORMATO_TOKEN`, `normalizarToken()`, `esTokenValido()`, `decisionDeIdempotencia()`. El formato del token y qué hacer según exista ya la fila |
| 6 | `src/lib/legal-settings.ts` | **Servidor.** `readLegalData()` (**tolerante a fallos**: si la BD cae devuelve `{}` y salen los marcadores) y `writeLegalData()` con `upsert` sobre la fila única |
| 7 | `src/lib/site-url.ts` | **Puro.** `siteUrl()`: lee `SITE_URL` y la normaliza. Existe porque lo necesitan **dos** ficheros (`robots.ts` y `sitemap.ts`) y duplicar la lectura de una variable es justo lo que `constitution.md` §6 penaliza |
| 8 | `src/lib/legal-content/index.ts` + 7 ficheros `<slug>.ts` | **Puro.** El texto de cada documento como dato (`Seccion[]`), no como JSX. Existe por tres razones concretas: §7.1 exige un test que falle si el contenido cambia sin subir la versión; RF-9 obliga a que `/politica-de-cookies` sea verificable contra `session-token.ts`; y RF-7/RF-8 se comprueban con `grep` sobre el texto |
| 9 | `src/components/legal/LegalDocument.tsx` | **Servidor, sin estado.** Pinta `Seccion[]`, aplica `interpolar()` y muestra la marca `REQUIERE REVISIÓN DE PROFESIONAL LEGAL` cuando la sección la declara |
| 10 | `src/components/legal/LegalVersion.tsx` | **Servidor.** La línea "Versión X · Actualizado el Y" de RF-6, leída del registro. Un componente para que la fecha **no** se escriba a mano en siete páginas |
| 11 | `src/app/api/admin/legal/route.ts` | `PATCH`: guarda los seis datos legales. `requireAdmin()` + `LegalDataSchema` + `describePrismaError` |
| 12 | `src/app/api/admin/quotes/route.ts` | `GET` lista para el panel (con el recuento de vencidas) y `PATCH` cambio de estado. `requireAdmin()` en ambos |
| 13 | `src/app/api/quotes/[id]/route.ts` | `GET` detalle y `DELETE` **transaccional** de la solicitud y sus partidas. **`requireAdmin()` también aquí**: la ruta cuelga de `/api/quotes`, pero no es pública (RF-28, R2) |
| 14 | `src/app/admin/legal/page.tsx` + `LegalView.tsx` | Formulario de los seis datos y **aviso de los que faltan** (RF-3) |
| 15 | `src/app/admin/cotizaciones/page.tsx` + `CotizacionesView.tsx` | Listado, detalle, cambio de estado y borrado (RF-24, RF-25) |
| 16 | `src/app/terminos-y-condiciones/page.tsx` | Documento legal, versión visible |
| 17 | `src/app/aviso-de-privacidad/page.tsx` | Documento legal, versión visible |
| 18 | `src/app/politica-de-cookies/page.tsx` | Documento legal, versión visible |
| 19 | `src/app/politica-de-envios/page.tsx` | Documento legal, versión visible |
| 20 | `src/app/cambios-y-devoluciones/page.tsx` | Documento legal, versión visible |
| 21 | `src/app/informacion-legal/page.tsx` | Documento legal, versión visible |
| 22 | `src/app/accesibilidad/page.tsx` | Estándar objetivo y cómo reportar. **No** declara conformidad (RF-29) |
| 23 | `src/components/consent/ConsentPanel.tsx` | **Cliente.** El panel de las cuatro categorías y las tres vías. **Condicional**: si `hayQuePedirConsentimiento()` es `false`, devuelve `null` y no escribe nada (RF-15) |
| 24 | `src/components/consent/ConsentProvider.tsx` | **Cliente.** Abre y cierra el panel; es lo que hace funcionar el enlace del `Footer` (RF-18) |
| 25 | `src/app/robots.ts` y `src/app/sitemap.ts` | Metadata routes de Next. `robots.txt` prohíbe `/admin`, `/api`, `/perfil`, `/login` |
| 26 | `docs/ACCESSIBILITY.md` | **Artefacto de la auditoría** (RF-30, RF-31): lista de hallazgos con gravedad. **No** es un sello |
| 27 | `prisma/migrations/<ts>_add_legal_models/migration.sql` | **Generado** por `prisma migrate dev`. No se escribe a mano |
| 28 | `prisma/migrations/<ts>_quote_status_enum/migration.sql` | **Generado**. `String` → enumeración + columna de idempotencia |
| 29 | `tests/legal-data.test.ts` | Suite de los datos legales |
| 30 | `tests/legal-versions.test.ts` | Suite del registro de versiones y su huella |
| 31 | `tests/consent.test.ts` | Suite del consentimiento |
| 32 | `tests/retention.test.ts` | Suite de la retención |
| 33 | `tests/quote-idempotency.test.ts` | Suite del token de idempotencia |

## 5. Ficheros modificados

| # | Fichero | Qué cambia y por qué |
|---|---|---|
| 1 | `prisma/schema.prisma` | **+ `model LegalData`** (fila única), **+ `model LegalAcceptance`**, **+ `enum LegalDocType`**, **`+ `enum QuoteStatus`**, y `QuoteRequest.status` de `String` a `QuoteStatus` **+ `idempotencyKey String? @unique`** |
| 2 | `src/app/api/quotes/route.ts` | Idempotencia por token (RF-27), registro de aceptación en la misma transacción (RF-19) y el nuevo campo de aceptación en `CreateQuoteSchema` |
| 3 | `src/lib/quote-schema.ts` | `+ aceptacion` en `CreateQuoteSchema`: `acepta: z.literal(true)`, `terminos` y `privacidad` con la versión mostrada. Sin la casilla afirmativa no hay registro (RF-19) |
| 4 | `src/components/sections/QuoteCartForm/QuoteCartForm.tsx` | Token de idempotencia en estado del componente (**no** en `localStorage`, §9), casilla de aceptación con enlaces a los dos documentos y aviso de que enviar **no** es comprar (RF-10) |
| 5 | `src/app/cotizacion/page.tsx` | Aviso de que es una **solicitud, no un pago**, y de que el precio es el de catálogo hasta confirmar (RF-10) |
| 6 | `src/app/contacto/page.tsx` | **Hoy está vacía de datos de contacto.** Pasa a mostrar los reales o el marcador (RF-5, RF-13, V13). Ver §5.2 |
| 7 | `src/components/layout/Footer/Footer.tsx` | Enlaces a las políticas y botón de "preferencias de cookies" (RF-18, V7), y monta `ConsentProvider` + `ConsentPanel`. **No** es `MainLayout` (§5.1) |
| 8 | `src/app/admin/AdminNavLinks.tsx` | Los dos paneles nuevos, para que `/admin/cotizaciones` **no** nazca sin enlace entrante (mismo error que H4) |
| 9 | `src/app/admin/apariencia/page.tsx` y `src/app/admin/categorias/page.tsx` | **Solo** el `AdminNavLinks`, que ya importa la lista. Ni una línea más |
| 10 | `src/app/api/categories/route.ts` y `src/app/api/products/route.ts` | Rate limit en el `GET` público (RF-33). **Se cambia la firma** a `GET(request: Request)` porque las cabeceras llegan ahí. Nada más del fichero |
| 11 | `.env.example` | `+ SITE_URL` con su propósito. Sigue **sin** variables para los datos legales (D18, RF-4) |
| 12 | `docs/SDD.md`, `docs/THREATS.md`, `docs/GATES.md`, `docs/PUBLICAR.md`, `docs/DEPLOY.md`, `README.md`, `AGENTS.md`, `CHANGELOG.md`, `MEMORY.md` | Modelos, puntos de entrada, recuentos, despliegue y reciclaje de `MEMORY.md`. Ver `tasks.md`, F10 |

### 5.1 Por qué `MainLayout` **no** se toca

Es la razón de que F6 monte el consentimiento en el `Footer` y no en `MainLayout`: si
`MainLayout` se volviera `async` con `cookies()`, las páginas prerenderizadas dejarían de
poder generarse y el build falla (`AGENTS.md`, R5, P6 del plan 008). `Footer` es un
componente **de presentación** al que se le pueden añadir enlaces y un provider sin que
eso afecte al prerenderizado. **Verificación: `git diff -- src/components/layout/MainLayout/MainLayout.tsx` → salida vacía.**

### 5.2 `/contacto` y las páginas légale **serán dinámicas** ⚠️

`/contacto` pasa a leer `LegalData` de la base de datos (RF-5, RF-13). Una página que lee
la BD **no** se puede prerenderizar en el build, porque el dato todavía no existe cuando
se compila: el administrador lo rellena **después** de desplegar (D18). Lo mismo pasa con
las siete páginas legales.

Consecuencias, y son las que hay que verificar en F9:

| Página | Antes | Después | Por qué |
|---|---|---|---|
| `/contacto` | `○` estática | **`ƒ` dinámica** | Lee `LegalData` (RF-5) |
| Las 7 legales nuevas | — | **`ƒ` dinámica** | Leen `LegalData` y el registro de versiones |
| `/novedades` | `○` estática | **`○` estática** | No se toca. **Es la que demuestra que `MainLayout` sigue intacto** |
| `/` (portada) | `ƒ` | `ƒ` | Ya es `force-dynamic` |

Esto choca con la letra de **V18** ("`/contacto` y las páginas de contenido siguen `○`").
Ver §15, duda **B**: lo que V18 protege de verdad es que **`MainLayout` no lea cookies**, y
eso se comprueba de otra forma.

`force-dynamic` va **en `page.tsx`**, nunca en un componente (`AGENTS.md`).

## 6. Aritmética: rutas del build y migraciones

### 6.1 Rutas del build

Base medida en F0: **22** (las documentadas en `MEMORY.md` y en la nota de T12 de la spec
008). **Si el build dice otra cosa, manda el build.**

| Tarea | Bloque | Qué añade | Recuento |
|---|---|---|---|
| — | F0 | base | **22** |
| **T9, T10** | F3 | `PATCH /api/admin/legal`, `GET`+`PATCH /api/admin/quotes`, `GET`+`DELETE /api/quotes/[id]` | **+3 → 25** |
| **T11, T12** | F4 | `/admin/legal`, `/admin/cotizaciones` | **+2 → 27** |
| **T13** | F5 | las siete páginas legales nuevas | **+7 → 34** |
| **T15** | F7 | `robots.txt` y `sitemap.xml` | **+2 → 36** |
| T2–T7 | F1 | módulos, texto legal y suites: **no** cambian el recuento | 36 |
| T8 | F2 | migraciones: **no** crean ruta | 36 |
| T16 | F8 | rate limit y cabeceras: **no** crean ruta | 36 |
| T17, T18 | F9, F10 | verificación y documentación: **no** | **36** |

`POST /api/quotes` y `/contacto` **ya existen**: se modifican, no suman. Si el usuario
aclara la duda **A** de §15 y son **seis** páginas nuevas en vez de siete, el total es
**35**.

### 6.2 Migraciones: **dos**

| # | Nombre | Qué | Riesgo |
|---|---|---|---|
| 1 | `<ts>_add_legal_models` | `CREATE TABLE LegalData`, `CREATE TABLE LegalAcceptance`, `CREATE TABLE LegalDocType`, `CREATE TABLE QuoteStatus` | **Bajo.** Tablas nuevas: no toca ninguna fila existente |
| 2 | `<ts>_quote_status_enum` | `ALTER TABLE QuoteRequest`: `status` de `VARCHAR` a `QuoteStatus`, **+ `idempotencyKey VARCHAR(191) NULL`** e índice único | **Alto.** Toca una tabla con datos. Es el único punto de la spec capaz de perder información, y por eso va **sola** y es su propia tarea |

Se hacen **dos, no una**, para que un fallo de la segunda no deje el esquema legal a medias:
la que no toca datos es la primera, y la que sí los toca es la última, con las dos
comprobaciones de §8 escritas antes de ejecutarla. Total de migraciones en el repo: **6 → 8**.

## 7. Los cinco módulos puros

### 7.1 `src/lib/legal-data.ts`

```
MARCADOR_PENDIENTE = "[REQUIERE DATO DEL PROPIETARIO]"   # RF-2: constante exportada, única
NOMBRE_COMERCIAL    = "Pingo POP"                        # §3: el único dato que ya se conoce
CAMPOS_LEGALES = ["razonSocial","rfc","domicilioFiscal",
                  "correoContacto","telefono","responsablePrivacidad"]

LegalDataSchema = Zod({
  razonSocial:        texto(120),
  rfc:                rfc(),            # trim, 12-13, sin espacios; NO se calcula el digito
  domicilioFiscal:    texto(300),
  correoContacto:     correoOpcional(),
  telefono:           texto(40),
  responsablePrivacidad: texto(120),
})   # "" y "   " -> ausente (preprocess), igual que imagePath

leerLegal(entrada):
    para cada campo de CAMPOS_LEGALES:
        v = trim(entrada[campo] ?? "")
        resultado[campo] = (v === "") ? MARCADOR_PENDIENTE : v
    return resultado

camposFaltantes(entrada):
    return CAMPOS_LEGALES.filter(campo => trim(entrada[campo] ?? "") === "")

interpolar(plantilla, datos):
    para cada token {{CLAVE}} de la plantilla:
        clave en datos  -> sustituir por datos[clave]
        clave desconocida -> sustituir por MARCADOR_PENDIENTE    # nunca "{{CLAVE}}" visible
    return texto resultante
```

| Entrada | Salida |
|---|---|
| `leerLegal({})` | Los seis campos con `MARCADOR_PENDIENTE` |
| `leerLegal` con los seis rellenos | Los seis valores |
| Un campo con `"   "` | `MARCADOR_PENDIENTE`: se trata como ausente |
| `camposFaltantes({})` | Los seis, **en el orden de `CAMPOS_LEGALES`** |
| `camposFaltantes` con todo relleno | `[]`: no lista un campo que sí está |
| `interpolar("Razón social: {{RAZON_SOCIAL}}", leerLegal({}))` | `"Razón social: [REQUIERE DATO DEL PROPIETARIO]"` |
| `interpolar("Marca: {{NOMBRE_COMERCIAL}}", datos)` | `"Marca: Pingo POP"` |

**La comprobación que de verdad importa** (la pide §7.1): un test recorre `src/` con
`node:fs` y falla si el texto literal del marcador aparece en **cualquier** fichero que no
sea `src/lib/legal-data.ts`. Es lo que convierte "una constante única" en algo verificable y
no en una intención.

### 7.2 `src/lib/legal-versions.ts`

```
DOCUMENTOS = [
  { slug, titulo, version, actualizadoEn, huella, contenido }, ... 7
]
#   huella     = sha256 del fichero `contenido`, 12 primeros hex
#   contenido  = ruta del módulo de texto, relativo a la raíz del proyecto

documentoDe(slug)   -> Documento | null       # null si el slug no existe (404 en la pagina)
versionDe(slug)     -> string | null
sonVersionesValidas(entrada: { [slug]: version }) -> boolean
DOCUMENTO_POR_TIPO = { TERMINOS: "terminos-y-condiciones",
                       PRIVACIDAD: "aviso-de-privacidad",
                       COOKIES: "politica-de-cookies" }
```

**La huella es lo que hace verificable RF-6.** §7.1 pide "un test que falle si alguien
sube el contenido sin subir la versión", y eso **no** se puede comprobar sin algo que
cambie cuando el texto cambia. Se calcula con `node:crypto`, que ya está en Node, sin
dependencias:

```
node -e "const c=require('node:crypto'),f=require('node:fs');
  console.log(c.createHash('sha256').update(f.readFileSync('src/lib/legal-content/aviso-de-privacidad.ts')).digest('hex').slice(0,12))"
```

Editar el texto sin subir `version` **y** `huella` deja el test en rojo. Subir `version` sin
cambiar el texto **también** lo deja en rojo, porque la huella no ha cambiado: es la
comprobación de que la versión significa algo.

### 7.3 `src/lib/consent.ts`

```
TECNOLOGIAS_NO_ESENCIALES = [] as const   # D14: hoy no hay ninguna. El motivo va escrito
                                          # en el comentario del propio modulo (RF-15)
CATEGORIAS_CONSENTIMIENTO = ["necesarias","analiticas","marketing","preferencias"]
CLAVE_CONSENTIMIENTO = "pingo-consentimiento"
VERSION_DECISION = 1

hayQuePedirConsentimiento() -> longitud(TECNOLOGIAS_NO_ESENCIALES) > 0
crearRegistro(tipo, decision, hoy: Date) -> { version: 1, tipo, decision, decidedAt: ISO(hoy) }
leerRegistro(texto: string) -> Registro | null      # Zod; si no cuadra -> null
pideConfirmacion(previa, nueva) -> boolean          # true solo si habia decision previa distinta
BOTON_BASE = "cartoon-border cartoon-focus inline-flex h-12 items-center rounded-2xl font-semibold"
botonClases(variante) = BOTON_BASE + " " + acento(variante)     # unico sitio donde se decide
contarClases(variante) -> numero de clases de botonClases(variante)
```

**RF-17 se comprueba contando clases, no mirando la pantalla.** El test dice
`contarClases("aceptar") === contarClases("rechazar")` **y** que las dos valen
`contarClases(BOTON_BASE) + 1`. "Se ven iguales" a ojo es un requisito que una prueba de
Node no puede cumplir; "el mismo número de clases desde la misma base" sí.

**`consent.ts` no toca `localStorage`**: recibe y devuelve texto. El componente escribe, y
**solo** si `hayQuePedirConsentimiento()` es `true` (RF-15). Es el mismo patrón que
`quote-cart-storage.ts`.

### 7.4 `src/lib/retention.ts`

```
MESES_RETENCION    = 12                                          # D15, constante con nombre
ESTADOS_TERMINALES = ["ACCEPTED","REJECTED","CANCELLED"]         # RF-26

mesesTranscurridos(createdAt: Date, hoy: Date) -> numero entero
esVencida(solicitud: { createdAt, status }, hoy: Date, meses = MESES_RETENCION):
    si meses <= 0            -> false      # "con plazo 0 no se marca ninguna" (§7.1)
    si status NO terminal    -> false      # RF-23: una solicitud en curso no se marca nunca
    si mesesTranscurridos >= meses -> true
marcarParaRevision(lista, hoy, meses) -> [{ id, status, meses, creadaEl }]
contarAntiguas(lista, hoy, meses) -> numero                       # RF-24
```

Los cuatro casos de §7.1, y el borde que no aparece en la spec pero que también se
comprueba: **exactamente 12 meses sí se marca**, y 11 meses y 30 días no.

### 7.5 `src/lib/quote-idempotency.ts`

```
FORMATO_TOKEN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/   # UUID v4
normalizarToken(token: unknown) -> string | null    # trim + minusculas; null si no cumple el formato
esTokenValido(token: unknown)    -> boolean
decisionDeIdempotencia(token: unknown, existente: { id } | null) ->
    { reutilizar: false }                          # token invalido se RECHAZA antes: 400
    si normalizarToken(token) === null -> { error: "token invalido" }
    si existe fila con esa clave     -> { reutilizar: true, id }
    si no                            -> { reutilizar: false }
```

**Lo que esta suite NO puede demostrar, y hay que decirlo en la nota de verificación:** que
la base de datos **no** duplique la solicitud es cosa del **índice único** de la migración
(§8) y de la transacción, y se comprueba en **V9**. La prueba unitaria demuestra la otra
mitad: que el token se valida, se normaliza y decide correctamente. Un test que afirma lo
que no comprueba es peor que no tener test.

El token lo genera el **cliente** con `crypto.randomUUID()`, que ya existe en el navegador:
no hay ninguna dependencia nueva y **tampoco una función nueva que nadie llama**.

## 8. Las dos migraciones, con el SQL esperado

**El SQL lo genera `prisma migrate dev`. No se escribe a mano.** Lo que va aquí es lo que
hay que **esperar**, para poder decir "esto no es lo que debía" si el generador hace otra
cosa.

### 8.1 `<ts>_add_legal_models`

```prisma
model LegalData {                    // Fila unica, como SiteSettings: id fijo a 1
  id                    Int     @id @default(1)
  razonSocial           String?
  rfc                   String?
  domicilioFiscal       String?  @db.Text
  correoContacto        String?
  telefono              String?
  responsablePrivacidad String?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}

enum LegalDocType { TERMINOS PRIVACIDAD COOKIES }

model LegalAcceptance {               // RF-20: exactamente cuatro campos
  id             Int            @id @default(autoincrement())
  tipo           LegalDocType
  version        String
  aceptadoAt     DateTime       @default(now())
  quoteRequestId Int?
  quoteRequest   QuoteRequest?  @relation(fields: [quoteRequestId], references: [id], onDelete: Cascade)
}
```

`onDelete: Cascade` es deliberado (R9): al borrar una solicitud se borran sus registros de
aceptación, y no queda ninguna fila apuntando a una solicitud que ya no existe. **No** se
guarda IP, ni nombre, ni correo, ni identificador de usuario (D16).

**No hay paso de siembra.** `writeLegalData()` usa `upsert` sobre `id: 1` y la fila aparece
sola la primera vez, igual que `SiteSettings`.

### 8.2 `<ts>_quote_status_enum` — ⚠️ la que toca datos

```prisma
enum QuoteStatus { PENDING QUOTED ACCEPTED REJECTED CANCELLED }

model QuoteRequest {
  // ...
  status          QuoteStatus @default(PENDING)
  idempotencyKey  String?     @unique
}
```

SQL esperado (MariaDB; **el orden y el texto exactos los pone Prisma**):

```sql
-- CreateEnum
CREATE TABLE `QuoteStatus` AS SELECT 'PENDING' AS `value`;
ALTER TABLE `QuoteStatus` MODIFY `value`
  ENUM('PENDING','QUOTED','ACCEPTED','REJECTED','CANCELLED') NOT NULL;

-- AlterTable
ALTER TABLE `QuoteRequest` MODIFY `status` `QuoteStatus` NOT NULL DEFAULT 'PENDING';
ALTER TABLE `QuoteRequest` ADD COLUMN `idempotencyKey` VARCHAR(191) NULL;
CREATE UNIQUE INDEX `QuoteRequest_idempotencyKey_key` ON `QuoteRequest`(`idempotencyKey`);
```

**Las tres comprobaciones que la rodean, en este orden y sin saltarse ninguna:**

```
SELECT COUNT(*) FROM QuoteRequest;                  -- ANOTAR: N  (hoy 2 filas de prueba)
SELECT DISTINCT status FROM QuoteRequest;           -- SOLO PENDING es aceptable
-- (si aparece cualquier otro valor: PARAR y preguntar. No se inventa un mapeo.)

... migrate dev --name quote_status_enum ...
... prisma generate ...

SELECT COUNT(*) FROM QuoteRequest;                  -- DEBE SER N. "No borra ninguna fila"
SELECT DISTINCT status FROM QuoteRequest;           -- todos dentro del enum
SELECT COUNT(*) FROM LegalData;                     -- 0: la fila se crea con el primer guardado
```

**Por qué el `SELECT DISTINCT` antes de migrar es obligatorio:** en modo no estricto,
MariaDB **trunca** a `''` el valor que no cabe en el enum en vez de fallar. Ese es
exactamente el modo en que "no se borró ninguna fila" y "no se perdió información" dejarían
de ser lo mismo. `MEMORY.md` ya avisa de que MariaDB en Linux distingue mayúsculas de
minúsculas (`lower_case_table_names=0`): los nombres son **`LegalData`**,
**`LegalAcceptance`**, **`LegalDocType`**, **`QuoteStatus`** y **`QuoteRequest`**, con mayúscula
exacta.

## 9. Idempotencia: dónde vive el token

```
Cliente (QuoteCartForm)
    al montar:      token = crypto.randomUUID()     # en memoria, NO en localStorage
    al enviar:      POST /api/quotes { ..., idempotencyKey: token }
    si exito:       token = crypto.randomUUID()     # el siguiente envio es una solicitud nueva

Servidor (POST /api/quotes)
    1. rate limit (5 / ventana), igual que hoy
    2. normalizarToken(body.idempotencyKey) -> null  => 400      # vacio o manipulado
    3. CreateQuoteSchema.safeParse -> 400 si falla (incluye la casilla de aceptacion)
    4. transaccion:
         existente = tx.quoteRequest.findUnique({ where: { idempotencyKey: token } })
         si existe  -> devolver esa MISMA solicitud con 200
         si no:
             quote = tx.quoteRequest.create({ ..., idempotencyKey: token })
             tx.legalAcceptance.createMany({ data: tipos.map(t => ({ tipo: t, version: v, quoteRequestId: quote.id })) })
             devolver quote con 201
    5. catch: si es violacion de indice unico (dos envios en el MISMO frame):
         releer por idempotencyKey -> devolver 200 con esa solicitud
       si no: describePrismaError, como hoy
```

**Por qué el token va en memoria y no en `localStorage`.** Dos razones concretas: un token
guardado en disco bloquearía una solicitud legítima hecha **al día siguiente** con el mismo
formulario, y `RF-15` va justo en sentido contrario (no recolectar nada que no se necesite).
`V5` lo comprueba: en `localStorage` solo puede haber `pingo-quote-cart`.

**Lo que se acepta como consecuencia, y hay que escribir en la nota de verificación:** si el
visitante **recarga la página** entre dos envíos, hay un token nuevo y, por tanto, una
solicitud nueva. RF-27 habla de "dos envíos seguidos del mismo navegador", que es el doble
clic: eso sí queda cubierto.

**Por qué no se deduplica por contenido** (nombre + correo + teléfono + partidas): así una
persona que manda dos solicitudes idénticas legítimas en dos semanas se le comería la
segunda. La clave la genera el cliente, que es lo que dice RF-27.

## 10. Orden **test-first**

Cada bloque va precedido por su test **escrito y ejecutado en rojo**. La salida del rojo se
anota en `tasks.md`; un test que nunca se vio rojo no demuestra nada.

| Orden | Test | Se ve en rojo con | Código que lo hace pasar |
|---|---|---|---|
| 1 | `tests/legal-data.test.ts` | `Cannot find module '../src/lib/legal-data'` | **`src/lib/legal-data.ts`** |
| 2 | `tests/legal-versions.test.ts` | `Cannot find module '../src/lib/legal-versions'`; y, con el registro ya escrito pero sin los ficheros de contenido, `ENOENT` sobre `src/lib/legal-content/...` | **`legal-versions.ts` + `legal-content/`** |
| 3 | `tests/consent.test.ts` | `Cannot find module '../src/lib/consent'` | **`src/lib/consent.ts`** |
| 4 | `tests/retention.test.ts` | `Cannot find module '../src/lib/retention'` | **`src/lib/retention.ts`** |
| 5 | `tests/quote-idempotency.test.ts` | `Cannot find module '../src/lib/quote-idempotency'` | **`src/lib/quote-idempotency.ts`** |
| 6 | — | — | Migraciones (no testeables: se verifican con `migrate status` y las tres consultas de §8) |
| 7 | — | — | Rutas de API, paneles, páginas, `robots`/`sitemap` (sin jsdom; se verifican con V1–V18) |

**Mínimo de casos nuevos, derivado de §7.1 y de los contratos de §7:** 12 en
`legal-data`, 7 en `legal-versions`, 7 en `consent`, 9 en `retention`, 9 en
`quote-idempotency` → **44**. Es un **mínimo**, no una promesa: F9 apunta el número real de
la salida.

## 11. Gates exactos y en qué orden

### 11.1 Puerta de Prisma (F2) — antes de tocar nada que use los modelos nuevos

```
P1  npx prisma migrate status          # "up to date" ANTES de migrar
P2  SELECT COUNT(*) FROM QuoteRequest; SELECT DISTINCT status FROM QuoteRequest;   # §8.2
P3  npx prisma migrate dev --name add_legal_models
P4  npx prisma generate                # OBLIGATORIO: src/generated/ no se actualiza solo
P5  <reiniciar el dev server>          # OBLIGATORIO: si no, "Unknown field 'legalData'"
P6  npx prisma migrate status          # limpio
P7  P2 de nuevo, con --name quote_status_enum
P8  npx prisma generate
P9  <reiniciar el dev server>
P10 npx prisma migrate status          # limpio, 8 migraciones
P11 las tres consultas de §8.2         # recuento identico, enum dentro, LegalData a 0
```

**Tres trampas, las tres ya mordidas en este proyecto:**

- `prisma migrate dev` **necesita `CREATE` y `ALTER`** para su *shadow database*. Sale
  **P3014**. Concederlos **solo en la base de datos local**, nunca en producción sin que lo
  pida el usuario.
- **Cambiar el esquema obliga a reiniciar el dev server** (si no, `Unknown field`), y
  **`npm run build` hace panic de Turbopack si compila con el server vivo**.
- `prisma migrate reset` está **prohibido** sin permiso: borra los datos.

### 11.2 Gate de código (F9)

`npm run check` ya encadena los cuatro en orden. Para depurar, por separado:

```
npm run typecheck      # tsc --noEmit
npm run lint           # ESLint
npm test               # node --import tsx --test "tests/**/*.test.ts"
npm run build          # SOLO con el dev server parado
```

Criterio: **exit 0 en los cuatro**, y **los 190 tests previos sin tocar** siguen en verde.

### 11.3 Gate de verificación manual (V1–V18)

Los criterios están en la spec §7.2. **Tres avisos al ejecutarlos**, todos aprendidos a
golpes:

- `browser.navigate` **devuelve antes de que React hidrate**. Hay que **esperar dentro de la
  página** con `requestAnimationFrame` antes de leer nada, o sale un falso positivo.
- `Invoke-WebRequest` **no manda bien la cookie**: el login se prueba en el navegador.
- El barrido de CJK con el patrón correcto, y **"No files found" es un fallo del barrido**,
  no un resultado limpio (F9 y F10).

## 12. Puntos de corte de las migraciones

| Punto | Situación | Qué hacer |
|---|---|---|
| **A** | `migrate dev` falla **antes** de aplicar (P3014) | **No ha aplicado nada**: la transacción revierte. Conceder permisos en local y reintentar |
| **B** | Migración aplicada, cliente viejo → `Unknown field 'legalData'` | **Síntoma, no daño.** `npx prisma generate` + reiniciar el dev server |
| **C** | La migración aplicada no es la que se quería | **Prohibido `prisma migrate reset`.** Camino seguro: `npx prisma migrate resolve --rolled-back <nombre>`, borrar el fichero, `npx prisma generate`, volver a aplicar |
| **D** | La tabla quedó a medias | `npx prisma migrate diff --from-url $DATABASE_URL --to-schema-datamodel prisma/schema.prisma --script` para **ver** el delta. Decidir antes de ejecutar nada |
| **E** | Duda sobre si el cliente está al día | `npx prisma generate` y reiniciar. Es gratis y no tiene efectos secundarios |

**Regla que manda:** en los puntos C y D, **parar y preguntar**. Y en la migración 2, si el
`SELECT DISTINCT status` de §8.2 devuelve un valor que no está en el enum, también: se
pregunta, no se inventa un mapeo.

## 13. Riesgos del plan

| # | Riesgo | Cómo lo mana este plan |
|---|---|---|
| P1 | **La migración 2 rompe o pierde datos de cotizaciones** | Va sola, en su propia tarea, con las tres consultas de §8.2 **antes** y **después**, y con el enum declarado en el propio esquema (R26) |
| P2 | **Publicar un aviso con un dato inventado** (R1, el riesgo número uno de la spec) | Un solo módulo produce los valores, `interpolar()` convierte lo que falte en el marcador y un test **recorre `src/`** y falla si el literal aparece en otro fichero |
| P3 | **Que el panel de cotizaciones exponga datos personales** (R2) | `requireAdmin()` **más** middleware, y `/api/quotes/[id]` es de admin aunque no lo parezca (§14, P4). Verificado con 401 sin sesión y 403 con BUYER |
| P4 | **Una ruta de escritura cuelga de un prefijo que parece público** | `/api/quotes/[id]` **solo** admite `GET` y `DELETE` **con `requireAdmin()`**, y no existe ningún `GET` que liste. Se documenta en `docs/THREATS.md` como ruta no pública. Ver §15, duda **C** |
| P5 | **El rate limit de lecturas rompe el panel de productos** (T16) | El límite de lectura es **alto** y se comprueba que `/admin/productos` sigue cargando tras varias operaciones |
| P6 | **`MainLayout` tocado por comodidad** (R5) | El consentimiento se monta en el `Footer`. Verificación mecánica: `git diff` de `MainLayout` vacío |
| P7 | **`MEMORY.md` pasa de 100 líneas** | F10 **recicla**, no amplía. Los candidatos que salen están escritos en la tarea, no improvisados |
| P8 | **Recuentos de documentación que mienten** | Se cuentan en F9 leyendo la salida real y se documentan en F10 |
| P9 | **Un doble clic duplica una cotización** (R8) | Índice único + transacción + recuperación del `P2002`, y **V9** |
| P10 | **El borrado deja filas hijas huérfanas** (R9) | `QuoteRequest`, `QuoteRequestItem` y `LegalAcceptance` en la misma operación |
| P11 | **El texto legal se queda viejo al cambiar el código** (R4) | `/politica-de-cookies` se construye con los valores de `SESSION_COOKIE` y `STORAGE_KEY`; la huella de §7.2 falla si el contenido cambia sin versión |
| P12 | **Un panel nuevo nace sin enlace entrante** (H4) | `AdminNavLinks` se toca en F4, en la misma tarea que crea los paneles |

## 14. Decisiones técnicas

**P1 — El texto legal vive en módulos de datos, no en JSX.** *Alternativa descartada:*
escribir los siete textos dentro de las siete `page.tsx`. *Coste aceptado:* siete ficheros
más de contenido y un componente `LegalDocument`. *A cambio:* §7.1 puede exigir que la
versión cambie cuando cambia el contenido, `/politica-de-cookies` es verificable contra
`session-token.ts` (RF-9) y RF-7/RF-8 se comprueban con un `grep` sobre el texto.

**P2 — Los datos legales entran por token `{{CLAVE}}` y salen por `interpolar()`.**
*Alternativa descartada:* que cada página importe `leerLegal()` y coloque los valores en el
JSX, uno a uno. *Coste aceptado:* un paso de interpolación y la regla de que un token
desconocido se convierte en el marcador. *A cambio:* ninguna página puede escribir un dato
legal a mano sin que el barrido lo note, y ningún `{{...}}` puede quedar visible.

**P3 — `legal-data` (puro) y `legal-settings` (servidor) son dos ficheros.** *Alternativa
descartada:* un solo fichero con Prisma. *Coste aceptado:* uno más. *A cambio:* el módulo
puro se testea con `node:test` sin base de datos, y `readLegalData()` puede ser tolerante a
fallos (`try/catch` → `{}` → todos los marcadores) como `readHeroImage()`.

**P4 — `/api/quotes/[id]` existe y es de administración.** Es la ruta que pide el bloque F3.
*Alternativa descartada:* `/api/admin/quotes/[id]`, que es más coherente con el prefijo.
*Coste aceptado:* una ruta fuera de `/admin` que **parece** pública. Se compensa con
`requireAdmin()` en los dos verbos, sin ningún `GET` que liste, con la comprobación 401/403
en la nota de verificación y con una línea en `docs/THREATS.md`. Ver §15, duda **C**.

**P5 — Un solo `PATCH /api/admin/quotes` con `{ id, status }` en el cuerpo.** *Alternativa
descartada:* `PATCH /api/admin/quotes/[id]`, que obligaría a un cuarto fichero de ruta para
un cambio de un solo campo. *Coste aceptado:* el `id` viaja en el cuerpo y no en la ruta.
*A cambio:* el límite de estado vive en un único esquema Zod (RF-26).

**P6 — Se registran los documentos que el visitante **ve**, no los siete.** La casilla de
aceptación de `/cotizacion` enlaza a Términos y Aviso de privacidad, y a Cookies **solo** si
hubiera tecnologías no esenciales. *Alternativa descartada:* registrar los siete siempre.
*Coste aceptado:* el conjunto de tipos depende de `DOCUMENTO_POR_TIPO`. *A cambio:* el
registro es **prueba** y no una afirmación: no dice que alguien aceptó un texto que no vio.

**P7 — El token de idempotencia vive en memoria.** *Alternativa descartada:* guardarlo en
`localStorage` para sobrevivir a una recarga. *Coste aceptado:* recargar la página entre dos
envíos crea una solicitud nueva. *A cambio:* `V5` sigue siendo cierto y un envío de ayer no
bloquea el de hoy.

**P8 — `MESES_RETENCION = 12` es una constante, y el plazo se pasa como parámetro.**
*Alternativa descartada:* `12` escrito en la lógica. *Coste aceptado:* un parámetro más.
*A cambio:* "con plazo 0 no se marca ninguna" es un caso de prueba, y nadie puede cambiar
la política sin tocar la constante.

**P9 — `robots.ts` y `sitemap.ts` leen `SITE_URL` con valor de reserva.** *Alternativa
descartada:* `requireEnv("SITE_URL")`, que **rompería el build** en cualquier entorno que no
la tenga (R7 y §3.1). *Coste aceptado:* sin `SITE_URL` el sitemap dice
`http://localhost:3000` y se avisa por log. *A cambio:* el build nunca depende de una
variable que el despliegue aún no tiene.

**P10 — El límite de las lecturas públicas es alto y explícito, no el de por defecto.**
*Alternativa descartada:* reutilizar `DEFAULT_MAX = 10` de 15 minutos, que **rompería**
`/admin/productos`: `AdminProductsView.refresh()` llama a `GET /api/products` después de
cada escritura. *Coste aceptado:* un tope más alto, es decir, menos protección contra un
raspador. *A cambio:* el panel de administración no se bloquea a sí mismo.

## 15. Dudas que bloquean (`[NECESITA ACLARACIÓN]`)

Estas cuatro no se resuelven con un supuesto. Las tres primeras cambian lo que se
implementa; la cuarta solo cambia una frase de un criterio de verificación.

**A — ¿Cuántas páginas legales hay: siete u ocho?**
`RF-5` enumera **siete** slugs (`/terminos-y-condiciones`, `/aviso-de-privacidad`,
`/politica-de-cookies`, `/politica-de-envios`, `/cambios-y-devoluciones`,
`/informacion-legal`, `/accesibilidad`) **y además** dice que se reutiliza `/contacto`. Son
**ocho** superficies. Pero V1 y V18 hablan de "las **7** páginas legales". El plan asume
**los siete slugs de RF-5 más `/contacto` reescrita** (ocho superficies, **+7** rutas en el
build, §6.1). Si la respuesta es "seis nuevas más contacto", el total de rutas es 35 en
vez de 36. *Efecto en el plan:* una ruta de menos y un fichero de menos.

**B — `/contacto` con datos reales ya no puede ser `○`.**
`RF-5` y V13 exigen que `/contacto` muestre los datos legales reales, y eso obliga a leer la
base de datos en el momento de la petición, así que la página pasa a `ƒ` (§5.2). V18 espera
que siga siendo `○`. **Mi recomendación:** aceptar que `/contacto` y las siete legales sean
`ƒ`, y comprobar el invariante que V18 quiere proteger de otra forma: que
`MainLayout` **no** lee cookies (`git diff` de `MainLayout` vacío y `/novedades` sigue
`○`). La alternativa, que `/contacto` siga estática, obligaría a que el contacto se pidiera
desde el cliente con una ruta pública nueva, que es más superficie por un beneficio que no
es legal. *Efecto en el plan:* una frase de V18 que hay que corregir en `spec.md`.

**C — `RF-19` exige registrar la aceptación en "el alta de una cuenta", y `RF-20` prohíbe
guardar identificador de usuario.** Hoy **no existe ninguna ruta que cree cuentas**: las
crea `prisma/seed.ts`, y el alta desde el panel es la spec 007, que no está hecha. Sin un
identificador, un registro de alta **no se puede vincular a esa cuenta**, así que la prueba
no probaría nada. *Mi recomendación, si no hay respuesta:* **no** registrar en el alta,
dejar `registrarAceptacion()` lista y reutilizable para la 007, decirlo así en
`docs/THREATS.md` y dejarlo anotado como pendiente. Las alternativas son (a) meter
`userId`, que contradice `RF-20` y D16, o (b) hacerlo en `seed.ts`, que es una tarea
técnica y no un acto afirmativo de la persona. *Efecto en el plan:* una rama de F3 que hoy
no se implementa, y una línea en `MEMORY.md`.

**D — V18 cuenta "11 módulos puros nuevos" y §7.1 nombra cinco suites.** Con el diseño de
este plan hay **cinco** módulos puros con suite (§7), más `legal-content/` (7 ficheros de
texto, sin suite propia) y `site-url.ts`; `legal-settings.ts` es de servidor y no se testea.
No se puede derivar un "11" de §7.1. *Mi recomendación:* cambiar el criterio de V18 a "las
**cinco** suites de §7.1 en verde, más las que se hayan añadido", y anotar el recuento
real. *Efecto en el plan:* una frase del criterio V18.

## 16. Mapa de requisitos a fases

| Fase | Requisitos que cubre |
|---|---|
| F0 | — (solo deja los gates en verde y los números anotados) |
| F1 | `RF-1`, `RF-2`, `RF-6`, `RF-15`, `RF-16`, `RF-17`, `RF-22`, `RF-23`, `RF-27` (su parte pura) |
| F2 | `RF-1`, `RF-20`, `RF-26` |
| F3 | `RF-3`, `RF-14`, `RF-19`, `RF-21`, `RF-24`, `RF-27`, `RF-28` |
| F4 | `RF-3`, `RF-14`, `RF-21`, `RF-22`, `RF-24`, `RF-25` |
| F5 | `RF-5`, `RF-7`, `RF-8`, `RF-9`, `RF-10`, `RF-11`, `RF-12`, `RF-13`, `RF-29`, `RF-37`, `RF-40`, `RF-41` |
| F6 | `RF-15`, `RF-16`, `RF-17`, `RF-18` |
| F7 | `RF-4` (la variable), `RF-37` (solo envío en México, coherente con `robots`) |
| F8 | `RF-32`, `RF-33` |
| F9 | `RF-30`, `RF-31`, `RF-34`, `RF-35`, `RF-36`, `RF-38`, y **todos** los anteriores con V1–V18 |
| F10 | `RF-34`, `RF-39` (anotado), `RF-40` (documentado). El resto es documentación |

`RF-12` y `RF-13` **no tienen botón**: se cumplen por **ausencia**, y F9 lo comprueba
comprobando que no existe ninguna acción de "borrar mi cuenta" ni de "descargar mis datos"
en `/perfil`, ni ninguna ruta que lo haga. Es el mismo truco que `RF-24` en el plan 008.

## 17. Fuera de esta spec

- **Pagos, checkout, tokenización** (`RF` fuera de alcance §5): no hay pasarela.
- **Envío de correo** (§25): no hay proveedor. `RF-7` obliga a no mencionar ninguno.
- **Recuperación de contraseña** (§17): requiere correo. Deuda anotada, y el aviso de
  privacidad **dice que no existe**.
- **Registro público** (§5, §38): no hay. Los derechos ARCO son por escrito (`RF-12`).
- **Reseñas, comentarios o fotos de clientes** (§37): no hay.
- **Envíos internacionales** (§2): México. `RF-36` y `RF-38` son **no hacer** cosas.
- **Módulo de jurisdicción**: `RF-39` dice que queda **anotado en `MEMORY.md`, no
  implementado**. F10 lo anota.
- **Redis para el rate limit**: `RF-33` acepta la pérdida al reiniciar y lo documenta.
- **Rediseño visual**: `docs/DESIGN.md` y la paleta **no se tocan**. Si el renderizado de
  las páginas legales metiera un hex nuevo, F10 lo documenta; el plan no espera que ocurra.