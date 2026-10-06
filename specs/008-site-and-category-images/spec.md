# Spec: Pingo POP — Foto del hero e imágenes de categoría (008-site-and-category-images)

> Estado: **BORRADOR** (pendiente de aprobación del usuario).
> Fecha: 2026-10-05. Specs previas que dan contexto: `001-pingo-rework` (nació
> `Category.image`), `002-cartoon-visual` (paleta y reservas), `006-user-profile`
> (patrón "módulo puro + test sin DOM").
> **Petición del usuario, con sus palabras:** "primero deja que el admin suba una foto
> en el hero donde ahora está pingo, luego haz lo mismo con el apartado del catálogo".
> Aclarado por el usuario: por "el apartado del catálogo" se entiende **imágenes de
> categoría**, una foto por categoría en `/admin/categorias`.
> **El usuario pidió explícitamente NO hacer commit todavía.**

## 1. Problema

Hay dos fotos que el administrador quiere cambiar y hoy no puede cambiar ninguna.

### 1.1 El hero: no hay dónde guardar la foto

`src/components/sections/Hero/Hero.tsx` **no recibe props**. En su tarjeta decorativa
(líneas 89-101) hay un `<span>` con el texto `Pingo` escrito a mano, al lado de un
`<Star/>` y una píldora "Catálogo". No hay ninguna lectura de datos en ese componente:
la foto no existe como concepto en el proyecto.

Peor: **`prisma/schema.prisma` no tiene ningún modelo de ajustes del sitio**. No hay
ni tabla, ni campo, ni fichero donde deje de estar una foto del hero. Guardarla exige
una decisión de modelo de datos, no solo un formulario.

La portada **sí puede** resolver esto: `src/app/page.tsx` es un Server Component con
`export const dynamic = "force-dynamic"` (línea 19), así que ya se renderiza en cada
petición y puede leer la base de datos y pasarle la foto al hero como prop.

### 1.2 Las categorías: el campo existe y nadie lo lee

- **`Category.image String?` ya existe** en `prisma/schema.prisma` (línea 35), desde la
  spec 001. No hace falta migración para esto.
- **Nadie lo usa**: ni el formulario, ni la API, ni la sección pública.
- `CreateCategorySchema` (`src/lib/validation.ts:105-109`) solo valida `name`, `slug`
  opcional y `description`. **No acepta `image`**, aunque `CreateProductSchema` sí lo
  hace con el mismo `imagePath` (línea 90).
- `/api/categories` solo expone `GET` y `POST`. **No existe ruta de actualización.**
- `src/app/admin/categorias/page.tsx` es un panel de **solo alta**: no lista, no edita,
  no borra. Su título es literalmente "Agregar categoría" y solo monta
  `<AdminCategoriesForm />`.
- Consecuencia: **una categoría creada no se puede volver a tocar jamás**. Subir una foto
  "después" es imposible sin construir antes la ruta de actualización.
- **`src/components/sections/Categories/Categories.tsx` tiene las 4 categorías escritas a
  mano** en un array literal (líneas 5-30), con su `number`, su `title`, su
  `description` y un array `accents` de 4 clases de color cartoon indexado por posición.
  **No consulta la base de datos.** Si no se conecta a los datos, una foto de categoría
  no se vería en ningún sitio público.

### 1.3 Hallazgo nuevo que bloquea el uso: la página no se puede abrir

`/admin/categorias` **no tiene ningún enlace entrante en la interfaz**: el navbar no
enlaza a ninguna ruta de administración y `AdminProductsView` solo enlaza a `/perfil`.
La página existe y responde, pero **no hay forma de llegar a ella desde la web**. Hay
que arreglarlo en esta spec o el usuario no podrá usar ni una cosa ni la otra.

## 2. Objetivo

1. Que el ADMIN suba **una foto para el hero**, en el hueco donde hoy está el texto
   `Pingo`, y que se vea en la portada.
2. Que el ADMIN suba **una foto por categoría** desde `/admin/categorias`, y que se vea
   en la sección pública del catálogo.
3. Que el texto `Pingo` **se quede como reserva** cuando no hay foto, en los dos sitios.

## 3. Alcance

**Incluye:**
- Modelo `SiteSettings` de una sola fila con `heroImage`, **más su migración**.
- Esquema `siteImagePath` (propio, con su regex) y su carpeta
  `public/uploads/site/`.
- Página de administración para la foto del hero, con subida y vista previa.
- `CreateCategorySchema` acepta `image`; el alta de categoría pasa a aceptar foto.
- Ruta `PATCH /api/categories/[id]` con `requireAdmin()`, Zod en el borde y
  `describePrismaError`.
- `/admin/categorias` pasa de **solo alta** a **alta + listado con edición** de imagen,
  nombre y descripción.
- `Categories.tsx` pasa a ser **data-driven**, conservando el contenido actual escrito a
  mano como **reserva** si la base de datos no devuelve nada.
- Enlace a `/admin/categorias` desde el panel, para que la página sea alcanzable.
- Tests nuevos y ampliación de `tests/validation.test.ts`.
- Actualización de los recuentos que citan número de tests y rutas del build (§9).

**No incluye (fuera de alcance explícito):**
- **Borrado de categorías.** No lo pidió el usuario y las categorías tienen productos
  asociados (`Product.categoryId`): borrarlas exige decidir qué pasa con esos productos.
- **Editar el `slug` de una categoría.** Ver D3.
- **Borrar ficheros del disco** al quitar una foto del formulario. Ver RF-26 y §10.
- **Redimensionado, recorte, compresión ni miniaturas.** No hay librería de imágenes en el
  proyecto y añadir una está prohibido por `docs/constitution.md` §6.
- **Galería, varias fotos por categoría, o foto de la ficha de producto.**
- **WYSIWYG o texto enriquecido** en la descripción de la categoría.
- Migrar o renombrar las imágenes ya subidas.
- Cualquier otra sección de la portada (`HowItWorks`, `CTA`, `FeaturedProducts`).

## 4. Supuestos (marcados como tales: **requieren tu confirmación**)

> Ninguno de estos está decidido. Son propuesta mía y cada uno cambia el trabajo.

- **S1 — La foto del hero vive en un modelo nuevo `SiteSettings` de una sola fila**
  (singleton) con el campo `heroImage`. **Requiere migración.**
  *Alternativa descartada:* un fichero de configuración en disco. No es versionable, no
  es auditable, no se valida con Zod y no aparece en los backups de la base de datos.
- **S2 — Carpeta nueva `public/uploads/site/` para el hero**, con `siteImagePath` propio
  y regex estricta `/^\/uploads\/site\/[a-f0-9]{32}\.(jpg|png|webp)$/`. **No se toca** el
  `imagePath` de productos, que es una regla de seguridad ya auditada. Añade una entrada
  a `.gitignore` y su `.gitkeep`.
  *Alternativa descartada:* guardar el hero también en `/uploads/products/`. Mezclaría
  decorado de la web con catálogo en la misma carpeta y obligaría a ampliar una regex que
  hoy solo admite rutas de producto.
- **S3 — Las fotos de categoría reutilizan `/uploads/products/`** y el `imagePath` que ya
  existe y ya está testeado, **sin tocar su regex**. Se mantiene porque cambiar una
  regla de seguridad probada para accommodate un caso que ya encaja sería más riesgo del
  que aporta; la carpeta es la misma que usa el resto de imágenes y su `.gitignore` ya
  está escrito.
- **S4 — `Categories.tsx` se vuelve data-driven.** Si no, subir la foto no serviría de
  nada. El contenido actual escrito a mano **se conserva como reserva** para que la web
  nunca se vea rota.
  *Alternativa descartada:* no mostrar fotos de categoría en público. Descartada porque
  anula la mitad de la petición del usuario.
- **S5 — El panel de categorías pasa a alta + listado con edición** (imagen, nombre,
  descripción). Es el mínimo que hace posible "subir la foto después".

## 5. Requisitos funcionales (EARS)

### 5.1 Foto del hero

- **RF-1:** EL SISTEMA guarda la foto del hero en la base de datos, en un registro único
  de ajustes del sitio.
- **RF-2:** MIENTRAS no haya foto del hero guardada, EL SISTEMA muestra en el hueco del
  hero el texto `Pingo`, tal como hoy.
- **RF-3:** CUANDO exista una foto del hero guardada, EL SISTEMA la muestra en el hueco
  del hero **en lugar** del texto `Pingo`.
- **RF-4:** CUANDO exista una foto del hero, EL SISTEMA **no** muestra el texto `Pingo`
  en ese hueco. No pueden verse los dos a la vez.
- **RF-5:** CUANDO el ADMIN abra la página de la foto del hero, EL SISTEMA le muestra la
  foto actualmente guardada, o el texto `Pingo` si no hay ninguna.
- **RF-6:** CUANDO el ADMIN seleccione un fichero JPEG, PNG o WebP de **5 MiB o menos**,
  EL SISTEMA lo sube, lo guarda y muestra la foto nueva en el hueco del hero.
- **RF-7:** SI el fichero seleccionado supera **5 MiB**, ENTONCES EL SISTEMA lo rechaza
  y **no** sube nada, con un aviso que lo diga.
- **RF-8:** SI el fichero seleccionado no es un JPEG, PNG o WebP **real** —porque su
  contenido no coincide con su extensión—, ENTONCES EL SISTEMA lo rechaza con **415** y
  **no** lo guarda. El sistema **no** confía en el tipo declarado por el navegador.
- **RF-9:** SI la operación de subir la foto falla, ENTONCES EL SISTEMA **no** cambia la
  foto que había antes y muestra el motivo del fallo.
- **RF-10:** CUANDO el ADMIN quite la foto del hero, EL SISTEMA la deja sin guardar
  (ausente) y el hueco vuelve a mostrar `Pingo`.
- **RF-11:** SI un usuario que no es ADMIN intenta guardar o quitar la foto del hero,
  ENTONCES EL SISTEMA lo rechaza con **401** si no hay sesión y con **403** si la hay con
  un rol que no es ADMIN. **Ningún ADMIN puede hacerlo desde la interfaz** y que esto
  baste no significa que sea una medida de seguridad: la comprobación está en el servidor.
- **RF-12:** SI la ruta de la foto del hero no tiene la forma exacta que genera el
  sistema de subida, ENTONCES EL SISTEMA la rechaza con **400**. Una ruta manipulada a
  mano no se guarda.
- **RF-13:** SI la lectura de la foto del hero en la portada falla, ENTONCES EL SISTEMA
  **sigue mostrando la portada**, sin foto y con el texto `Pingo`. Un fallo de la base de
  datos no puede dejar la web en blanco.

### 5.2 Imágenes de categoría

- **RF-14:** CUANDO el ADMIN dé de alta una categoría con una foto, EL SISTEMA guarda
  esa foto junto a la categoría.
- **RF-15:** CUANDO el ADMIN dé de alta una categoría **sin** foto, EL SISTEMA la crea
  sin foto y **no** rechaza el alta. Una categoría sin foto es el caso normal, no un
  error.
- **RF-16:** SI el alta incluye una ruta de imagen con la forma que no genera el sistema
  de subida, ENTONCES EL SISTEMA devuelve **400** y no crea la categoría.
- **RF-17:** CUANDO el ADMIN edite una categoría y cambie su foto, EL SISTEMA guarda la
  nueva foto.
- **RF-18:** CUANDO el ADMIN quite la foto de una categoría, EL SISTEMA la deja sin foto.
- **RF-19:** SI el ADMIN intenta editar una categoría que no existe, ENTONCES EL SISTEMA
  responde **404** y no dice nada más.
- **RF-20:** SI un usuario que no es ADMIN intenta editar una categoría, ENTONCES EL
  SISTEMA lo rechaza con **401** sin sesión o **403** con un rol que no es ADMIN.
- **RF-21:** SI el nombre enviado al editar una categoría ya es el **slug** de otra
  categoría distinta, ENTONCES EL SISTEMA responde **409** y no guarda el cambio.
- **RF-22:** CUANDO el ADMIN abra `/admin/categorias`, EL SISTEMA le muestra **la lista
  de las categorías existentes** con su nombre, descripción y foto actual.
- **RF-23:** CUANDO no haya ninguna categoría en la base de datos, EL SISTEMA lo dice de
  forma visible en lugar de mostrar una lista vacía sin explicación.
- **RF-24:** EL SISTEMA **no** ofrece ninguna forma de borrar una categoría.
- **RF-25:** EL SISTEMA **no** permite cambiar el `slug` de una categoría que ya existe:
  el `slug` va en la URL del catálogo y cambiarlo dejaría rotas las direcciones ya
  publicadas.

### 5.3 La sección pública de categorías

- **RF-26:** CUANDO haya categorías en la base de datos, EL SISTEMA muestra en la portada
  una tarjeta por categoría, con el **nombre** y la **descripción** que están guardados.
- **RF-27:** CUANDO una categoría tenga foto, EL SISTEMA la pinta en una **banda en la
  parte superior** de su tarjeta. La insignia circular con el número **se conserva**
  debajo, junto al título y la descripción (**D12**).
- **RF-28:** MIENTRAS una categoría **no** tenga foto, EL SISTEMA **no** pinta un hueco
  vacío ni una imagen rota: la banda muestra el `Pingo` de reserva, con la misma caja, de
  modo que ninguna tarjeta se ve descuadrada.
- **RF-29:** SI la base de datos no devuelve **ninguna** categoría, ENTONCES EL SISTEMA
  muestra las 4 tarjetas que hay hoy escritas a mano, sin fotos. La portada nunca se ve
  rota por un problema de datos.
- **RF-30:** EL SISTEMA **no** guarda en la base de datos el número decorativo (`"01"`) ni
  el color de acento de cada categoría. Los **deriva** de forma determinista: el número
  por orden de aparición y el color por la posición módulo el tamaño de la paleta. El
  mismo orden de entrada produce siempre el mismo resultado. El número **sigue
  pintándose** porque la banda de foto va por encima (**D12**).
- **RF-31:** EL SISTEMA **no** filtra las categorías por si tienen productos. Se ve lo que
  el administrador haya creado.
- **RF-32:** CUANDO la base de datos devuelva **más de 4** categorías, EL SISTEMA muestra
  **solo las 4 primeras** en la retícula de 4 columnas que ya hay, y **no** muestra las
  restantes (**D11**). Las categorías ocultas **siguen siendo editables y sus fotos
  subibles** desde `/admin/categorias`: el recorte es de presentación, no de gestión.
- **RF-33:** CUANDO una categoría tenga descripción vacía, EL SISTEMA no pinta un párrafo
  en blanco.

### 5.4 Accesibilidad de las imágenes

- **RF-34:** CUANDO se pinte la foto de una categoría, EL SISTEMA le da un texto
  alternativo **no vacío** derivado del nombre de la categoría.
- **RF-35:** CUANDO se pinte la foto del hero, EL SISTEMA la marca como **decorativa**
  (`alt` vacío), porque el titular de la sección ya dice qué es Pingo y una imagen con
  `alt` descriptivo duplicaría el texto del titular para un lector de pantalla.
- **RF-36:** CUANDO una imagen no se pueda cargar, EL SISTEMA **no** muestra el icono de
  imagen rota: cae a la reserva de texto.

### 5.5 Puertas de administración

- **RF-37:** EL SISTEMA ofrece una forma de llegar a `/admin/categorias` desde la propia
  interfaz de administración, sin tener que escribir la URL a mano.
- **RF-38:** EL SISTEMA ofrece una forma de llegar a la página de la foto del hero desde
  la propia interfaz de administración.
- **RF-39:** SI no hay sesión, ENTONCES el acceso por URL directa a cualquier página de
  administración de esta spec redirige a `/login`. La comprobación se repite en la
  página, no solo en el middleware.
- **RF-40:** SI no hay sesión, ENTONCES `PATCH /api/categories/{id}` y el guardado de la
  foto del hero responden **401**.

## 6. Decisiones

**D1 — El `Pingo` se queda como reserva, no se elimina.** Cuando no hay foto se muestra
el texto. Precedente ya establecido con los productos: 5 de 6 no tienen imagen.

- *Por qué:* eliminar la reserva convertiría "todavía no he subido foto" en una web rota.
- *Alternativa descartada:* placeholder con imagen genérica. Habría que versionar un
  asset nuevo en el repo público.

**D2 — La validación de imágenes se reutiliza tal cual.** No se toca la lógica de magic
bytes ni el límite de 5 MiB. `src/lib/upload-validation.ts` es un módulo puro ya testeado
con 11 pruebas, incluido "HTML disfrazado de JPEG".

- *Consecuencia:* las dos features no pueden divergir en seguridad, porque comparten el
  mismo filtro. Es el punto entero de reutilizarlo.

**D3 — El `slug` no se edita.** Ver RF-25. Es la URL pública de la categoría.

- *Alternativa descartada:* editarlo con redirección 301. Fuera de alcance: es un sistema
  de redirecciones entero.
- **D13 / RESUELTO.** El `slug` se mantiene **de solo lectura**. Se descartó la opción de
  añadir un botón de editar slug con el aviso de "las direcciones antiguas dejarán de
  funcionar": es una decisión del usuario y la respuesta fue **no**.

**D4 — La foto del hero va en `SiteSettings`, no en `Category`.** Ver S1.
`Category` describe el catálogo, no la web.

**D5 — El `number` y el color se derivan, no se guardan.** Ver RF-30 y S4. No se inventa
un esquema de base de datos para guardar decoración: sería una columna que nadie edita y
que se desincroniza en cuanto alguien reordena.

- *Alternativa descartada:* `accent` y `ordinal` en `Category`. Descartada: superficie de
  escritura y de validación que no aporta nada visible.

**D6 — No se borran ficheros del disco.** Ver RF-10, RF-18, §10 y D7.

**D7 — `storeImage()` no se toca ni se le añade un `deleteImage()`.** Quitar una foto del
formulario la borra de la base de datos; el fichero se queda en disco. Se anota como deuda,
no se paga aquí. Ver RF-10, RF-18 y la deuda D6.

**D8 — El renderizado usa `<img>` con el motivo escrito en el `eslint-disable`, en una
sola línea.** Precedente ya establecido hoy en el catálogo. Un `eslint-disable` partido en
dos líneas no desactiva nada: ESLint lo avisa con *"Unused eslint-disable directive"*.

- *Consecuencia:* las imágenes no pasan por el optimizador de Next, que es justo lo que
  se quiere aquí: son ficheros ya validados que sirven como estáticos.

**D9 — `siteImagePath` es un esquema aparte, no una extensión de `imagePath`.** Ver S2.
Dos carpetas, dos prefijos, dos regex. Un solo esquema con dos prefijos posibles sería
"cualquier ruta que empiece por `/uploads/`", que es exactamente lo que el esquema actual
evita.

## 7. Verificación

### 7.1 Tests (test-first: escritos y **vistos en rojo** antes del código)

Ampliación de `tests/validation.test.ts`:
- `CreateCategorySchema` acepta una ruta con la forma que genera el sistema de subida.
- `CreateCategorySchema` acepta `""`, `"   "`, `null` y omitir el campo, y en los cuatro
  casos sale `null` o `undefined`. Es el mismo H1 de la spec 005, y esta vez sobre el
  campo de la categoría.
- `CreateCategorySchema` **sigue rechazando** traversal, una URL externa y una ruta que
  no sea de la carpeta de productos.
- Esquema de edición de categoría: exige `id` entero positivo; rechaza `id` 0, negativo,
  decimal y ausente.

Suite nueva `tests/site-settings-schema.test.ts` (o ampliar `validation.test.ts`, según
decida el `plan.md`):
- `siteImagePath` acepta la forma `/uploads/site/<32 hex>.<jpg|png|webp>`.
- **Rechaza** la forma de productos `/uploads/products/<32 hex>.jpg`: el hero no puede
  apontar a la carpeta del catálogo.
- **Rechaza** traversal, una URL externa y una ruta arbitraria.
- Acepta `""`, espacios, `null` y ausencia, igual que `imagePath`.

Suite nueva `tests/category-card-props.test.ts` (función pura, sin DOM):
- La derivación de `number` y del color: con 4 elementos salen `"01"`, `"02"`, `"03"`,
  `"04"` y los 4 colores de la paleta, **en ese orden**.
- Con 6 elementos, el 5.º vuelve al primer color (módulo 4) y el 6.º al segundo.
- Con 0 elementos devuelve la lista vacía y quien llama decide qué mostrar (reserva).

**Lo que NO se testea aquí, y por qué:** los componentes de React y los route handlers.
El runner es `node:test` **sin jsdom**, y `docs/constitution.md` §6 prohíbe añadir
dependencias. Toda lógica comprobable va en un módulo puro de `src/lib/`, como ya está
hecho con `quote-cart-storage.ts` y `account-schema.ts`.

### 7.2 Comprobación manual en navegador (criterio exacto)

| # | Pasos | Criterio de aceptación |
|---|---|---|
| V1 | Admin: `/admin/apariencia` (**decidido, D10**), elegir una JPEG de menos de 5 MiB | Vuelve una URL `/uploads/site/<32 hex>.jpg`. Un `GET` a esa URL devuelve **200** y la imagen |
| V2 | Portada, sin recargar con Ctrl+F5 | La imagen del hero se ve. En DevTools, `naturalWidth > 0`. **El texto `Pingo` ya no está** en ese hueco |
| V3 | Admin: quitar la foto | La portada vuelve a mostrar `Pingo` y **no** una imagen rota |
| V4 | Admin: subir un `.html` renombrado a `.jpg` | **415**, y `public/uploads/site/` **no** gana ningún fichero |
| V5 | Admin: subir un GIF | **415**, ningún fichero nuevo |
| V6 | Admin: subir un fichero de 6 MiB | Aviso de límite, **no** se sube nada |
| V7 | Sin sesión: `/admin/apariencia` y `/admin/categorias` | Redirección a `/login` (**307**), no la página |
| V8 | Con sesión BUYER: `PATCH /api/categories/1` | **403** |
| V9 | Admin: `PATCH /api/categories/1` con `image: "/uploads/products/../../evil.js"` | **400** |
| V10 | Admin: `PATCH /api/categories/999999` | **404** |
| V11 | Admin: `/admin/categorias`, editar el nombre de A al slug de B, guardar | **409** |
| V12 | Admin: `/admin/categorias`, crear categoría con foto; luego quitarle la foto | La primera vez sale `naturalWidth > 0`; la segunda, tarjeta sin foto ni hueco vacío |
| V13 | Admin: `/admin/categorias`, cambiar el nombre de una categoría a "Playeras" | Aparece **"Playeras"** en la tarjeta de la portada, y "Playeras" en el filtro de `/products` |
| V14 | Admin: crear una 5.ª categoría con foto | La portada la muestra en una segunda fila, con el color que le toca por posición |
| V15 | Admin: dejar **0** categorías en la base de datos | La portada muestra las 4 tarjetas de texto de hoy. **No** se ve rota |
| V16 | Portada con 4 categorías, cada una con foto | Se ven 4 imágenes, y en el árbol de accesibilidad de DevTools cada una tiene `alt` no vacío |
| V17 | Admin: la foto del hero, con la red cortada | Se ve `Pingo` en el hueco. **No** aparece el icono de imagen rota |

> **Trampa de medición, ya mordida:** `browser.navigate` devuelve antes de que React
> hidrate. Hay que **esperar dentro de la página** (`requestAnimationFrame`) antes de
> leer `naturalWidth`, o el resultado es un falso positivo.

### 7.3 Gate

- `npm run check` → **exit 0**: typecheck, lint, **151+N tests**, build OK.
- `npm test` con los tests nuevos **vistos fallar** antes de escribir el código.
- **Cero dependencias nuevas.** Nada de `package.json`.

## 8. Riesgos

| # | Riesgo | Mitigación / comportamiento exigido |
|---|---|---|
| R1 | **Cambiar el esquema de Prisma obliga a reiniciar el dev server** (si no, `Unknown field 'heroImage'`) y a ejecutar `npx prisma generate`; `npm run build` hace **panic de Turbopack** si compila a la vez | Reiniciar antes de probar, y `npx prisma generate` después de la migración |
| R2 | **`prisma migrate dev` necesita `CREATE` y `ALTER`** para su *shadow database*; el usuario `pingo` no los tenía y sale **P3014** | Concederlos **solo en la base de datos local**, como ya se hizo en la spec 006 |
| R3 | **MariaDB en Linux distingue mayúsculas** (`lower_case_table_names=0`). `SiteSettings` mal escrito se convierte en otra tabla | Conservar exactamente el nombre del modelo en la migración |
| R4 | **`MainLayout` no puede volverse `async` con `cookies()`**: `/contacto` y `/novedades` se prerenderizan y ahí no hay `cookies()`, así que el **build falla** | Ninguna decisión de esta spec puede convertir `MainLayout` en `async`. La lectura de datos va en `page.tsx`, que ya es `force-dynamic` |
| R5 | **`Categories.tsx` pasa a depender de la base de datos**: si la consulta falla, la portada se queda sin la sección | RF-29 y RF-13: la reserva es la **última** línea, no la primera. Un fallo de base de datos se traduce en contenido de texto, no en una sección rota |
| R6 | **El texto escrito a mano y los datos de la base de datos pueden divergir**: si el contenido de reserva describe categorías que ya no existen, se dice dos veces lo mismo | La reserva solo se usa cuando **no hay ninguna** categoría. Con una sola categoría en la base de datos se ve esa y solo esa |
| R7 | **La sección pasa de 4 tarjetas fijas a un número variable, y el usuario ha pedido que se recorte a 4** | RF-32. Sigue siendo data-driven, así que los nombres y las fotos sí vienen de la base de datos; lo que se recorta es cuántas se ven. Una 5.ª categoría existe, se edita y se le sube foto, pero no aparece en la portada (**D7**) |
| R8 | **`storeImage` no borra nada.** Cada cambio de foto deja un fichero huérfano en disco | Deuda asumida y anotada (D6, D7). **No** se inventa borrado en cascada: `unlink` sobre una ruta de la base de datos es exactamente el sitio donde un día se borra el fichero equivocado |
| R9 | **Servir la foto del hero desde un fichero controlable por el admin** es una vía nueva de contenido servido como activo | La lista blanca y el nombre aleatorio ya lo limitan a JPEG/PNG/WebP. `docs/THREATS.md` tiene que recoger la nueva ruta y el nuevo modelo |
| R10 | **`/admin/categorias` no tenía enlace entrante** | RF-37. Sin esto la spec es inusable |
| R11 | **El repo es público**: una imagen real subida por un admin no debe acabar en un commit | `public/uploads/site/*` ignorado en `.gitignore` con su `!.gitkeep`, y revisado en el barrido de secretos de `docs/PUBLICAR.md` §2 antes de commitear |
| R12 | **Más superficie de escritura**: una ruta `PATCH` nueva es un endpoint de escritura más que proteger | `requireAdmin()` **antes** de tocar nada, Zod en el borde, `describePrismaError`. La prueba es que V8 y V10 dan 403 y 404 |

## 9. Recuentos y documentos a actualizar **después** de implementar

Estos ficheros **citan números y rutas**. Si se implementa la spec y no se tocan, la
documentación pasa a mentir:

| Fichero | Qué hay que cambiar |
|---|---|
| `MEMORY.md` | Número de tests y de suites; **máximo ~100 líneas**: si no cabe, sobra algo |
| `AGENTS.md` | `npm run test` (línea 30) y `tests/` (línea 46): recuento de tests y de suites |
| `README.md` | Líneas 38, 117, 128 y 161: tests, suites y **rutas del build** (hoy **19**, no 16: corregido al medir en T1) |
| `docs/SDD.md` | §4 modelo de datos (**añadir `SiteSettings`**), §5 storage (**`public/uploads/site/`**), §7 flujo crítico, §9 suites y recuento, §10 despliegue, §11 riesgos |
| `docs/THREATS.md` | §2 activo de imágenes (dos carpetas ahora), §3 **nuevos puntos de entrada** (`PATCH /api/categories/{id}` y el guardado del hero), §4 STRIDE, §6 controles, tests |
| `docs/GATES.md` | Línea 8: recuento de tests; línea 9: rutas del build |
| `docs/PUBLICAR.md` | Línea 26 (entradas de `.gitignore` que hay que revisar) y línea 231: la carpeta nueva también son datos de clientes subidos por administradores |
| `docs/DEPLOY.md` | Línea 114: el bucle de comprobación de rutas de admin |
| `CHANGELOG.md` | Sección `[Sin publicar]` |
| `docs/DESIGN.md` | **Solo si** el renderizado introduce un hex o una combinación de colores nueva. La paleta es su fuente de verdad y **ningún hex fuera de ese fichero** |

## 10. Deuda que esta spec deja anotada, no pagada

- **Ficheros huérfanos en disco.** Quitar una foto no borra el fichero (D6, D7, R8).
  Cuando se implemente el borrado de imágenes habrá que decidir **cómo** se sabe que un
  fichero ya no lo usa nadie, y esa decisión no es gratis.
- **`number` y color derivados, no editables.** Con muchas categorías, el color por
  posición se repite. Es aceptable mientras sean pocas; si ya hay muchas, es un problema.
- **`GET /api/categories` es público y no distingue mayúsculas.** No lo abre esta spec, pero
  al hacerlo data-driven se leen más categorías desde fuera.

## 11. Decisiones del usuario (cerradas)

El usuario respondió el 2026-10-05. Estas cinco **[NECESITA ACLARACIÓN]** ya no están
pendientes: sustituyen a los supuestos que traía el borrador.

- **D10 (era Q1) — El formulario de la foto del hero vive en una página nueva
  `src/app/admin/apariencia/page.tsx`**, con su propio enlace en el panel. Se descarta
  meterlo en `/admin/productos`: "ajustes del sitio" y "catálogo" son cosas distintas.
  **Afecta a**: modelo `SiteSettings`, una página más, y el número de rutas del build.
- **D11 (era Q2) — La portada muestra como mucho las 4 primeras categorías**, no todas.
  *El usuario eligió esto frente a mi recomendación de mostrarlas todas.* La retícula se
  mantiene en 4 columnas y el recorte ocurre en el `.slice(0, 4)`.
  **Consecuencia asumida, y conviene recordarla**: una 5.ª categoría creada **no se verá
  en la portada, y su foto tampoco**, aunque se suba correctamente y se vea en
  `/admin/categorias`. Es un recorte de presentación, no un fallo. Si algún día molesta,
  quitar el `.slice(0, 4)` lo devuelve y no toca nada más.
- **D12 (era Q4 y Q5, una sola decisión visual) — La tarjeta lleva una banda de foto en
  la parte superior y la insignia circular con el número se queda debajo**, junto al
  título y la descripción. Cuando la categoría no tiene foto, el `Pingo` de reserva ocupa
  esa misma banda, así que ninguna tarjeta se queda con un hueco vacío.
  **Afecta a**: `Card` necesita la banda de imagen, la altura mínima de la tarjeta sube, y
  **`number` sobrevive** (por tanto RF-30 sigue aplicando).
- **D13 (era Q3) — El `slug` de una categoría NO es editable una vez creada**, porque es
  URL pública. El formulario de edición solo toca nombre, descripción e imagen (RF-25, D3).

### 11.1 Lo que sigue sin decidir

Nada. Las cuatro decisiones que faltaban están cerradas.