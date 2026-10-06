# Tasks: Pingo POP — Foto del hero e imágenes de categoría (008-site-and-category-images)

> Spec **aprobada** el 2026-10-05. Plan en `plan.md` (fases F0–F10). Decisiones cerradas:
> **D10** página nueva `/admin/apariencia` · **D11** máximo 4 tarjetas en portada ·
> **D12** banda de foto arriba, insignia con el número debajo · **D13** el `slug` no se
> edita.
> **Test-first**: cada test se escribe y **se ve fallar** antes de escribir el código que lo
> hace pasar. La casilla se marca con el comando y la **salida real** que lo demuestra.
> **NO se hace commit.** Lo pidió el usuario dos veces.

## Leyenda de verificación

Cada casilla lleva su propia nota. Cuando se marque, tiene que llevar **el comando y lo
que ha salido**, no "funciona". Formato copiado de `specs/006-user-profile/tasks.md`.

---

## F0 — Baseline: dejar el proyecto en verde y **anotar los números**

- [x] **T1** — `npm run check` completo → **exit 0**. Anotar en un fichero de texto
  provisional, **fuera del repo**, los tres números que van a cambiar: **tests** (hoy
  **151**), **suites** (hoy **20**) y **rutas del build**. Anotar también el
  nombre de la última migración aplicada con `ls prisma/migrations | Select-Object -Last 1`
  y `npx prisma migrate status` → "Database schema is up to date!".
  **NOTA DE VERIFICACIÓN (2026-10-05): `npm run check` → exit 0 con el dev server parado.**
  `npm run test` → **tests 151 · suites 20 · pass 151 · fail 0**.
  Última migración aplicada: **`20261006023952_add_session_version`**.
  **Corrección: las rutas del build NO son 16, son 19.** Se contaron una a una del output
  de `npm run build`, y `MEMORY.md` y `docs/GATES.md` decían 16: **es un error de
  documentación que ya existía, no algo de esta spec.** Por eso **la aritmética de este
  plan era 3 rutas baja**: el destino correcto es **19 → 22**, no 16 → 19.
  `/contacto` y `/novedades` salen **`○` (estáticas)** y `/cotizacion` también.

> **Por qué va la primera:** si el proyecto ya está rojo, no se puede distinguir "lo ha
> roto esta spec" de "ya estaba roto". Y los números hay que tenerlos **antes** de
> cambiarlos, o se documenta lo que se recuerda en vez de lo que se midió.

---

## F1 — Los dos módulos puros (test-first, **sin** base de datos)

- [x] **T2** — **Primero el test, y verlo en rojo.**
  **a)** `tests/site-settings-schema.test.ts` (nuevo): `siteImagePath` acepta
  `/uploads/site/<32 hex>.<jpg|png|webp>`; **rechaza** la forma de productos
  `/uploads/products/<32 hex>.jpg`; **rechaza** traversal, URL externa y ruta arbitraria;
  acepta `""`, `"   "`, `null` y la ausencia del campo, y en esos cuatro casos sale `null`
  o `undefined`.
  **b)** Solo entonces, `+ siteImagePath` en `src/lib/validation.ts`: **preprocess** que
  convierte `""`/espacios en ausencia y `.regex(/^\/uploads\/site\/[a-f0-9]{32}\.(jpg|png|webp)$/)`,
  `.nullish()`, `.max(300)`. **Copia la forma de `imagePath` (líneas 46-57) sin tocar
  `imagePath`.** D9.
  Verificado: la suite nueva en verde; **`tests/validation.test.ts` sin tocar un solo
  carácter**, incluidos sus 20+ casos de `imagePath`.

  **NOTA DE VERIFICACIÓN (2026-10-05).** Rojo primero: `npm test` → **tests 162 · pass 151
  · fail 11**, con `TypeError: Cannot read properties of undefined (reading 'parse')`: el
  esquema no existia, que es el fallo que se buscaba. Despues de implementarlo: **1 test
  seguia en rojo**, y **la culpa era del test, no del esquema**: afirmaba que `null` y
  `undefined` dan ambos `null`. Se comprobo contra `imagePath` con una sonda y los dos
  esquemas se comportan **identico** (`""` → `undefined`, `null` → `null`, `undefined` →
  `undefined`). Corregido el test y **añadido otro que compara los dos esquemas** en los
  cuatro casos de ausencia, para que no vuelvan a divergir.
  Final: **tests 163 · pass 163 · fail 0**. `tests/validation.test.ts` **sin tocar**,
  confirmado con `git diff --stat`.

- [x] **T3** — **Primero el test, y verlo en rojo.**
  `tests/validation.test.ts` **ampliado**: `CreateCategorySchema` acepta la ruta con la
  forma que genera la subida; acepta `""`, `"   "`, `null` y omitir el campo, y en los
  cuatro casos sale `null`/`undefined`; **sigue rechazando** traversal, URL externa y
  ruta fuera de `/uploads/products/`. Y `UpdateCategorySchema`: exige `id` entero
  positivo, rechaza `id` 0, negativo, decimal y ausente, y **no** tiene campo `slug`
  (D13, `RF-25`).
  `npm test` → **rojo**: hoy `CreateCategorySchema` **descarta** `image` en vez de
  aceptarlo (`.object()` es estricto) y `UpdateCategorySchema` no existe.
  Solo entonces: `CreateCategorySchema` gana `image: imagePath` (S3, **la misma** constante
  de productos) y `+ UpdateCategorySchema`, que es `CreateCategorySchema` **sin `slug`**
  más `id: recordId`.
  Verificado: la suite ampliada en verde; los **151 tests previos siguen pasando**.

  **NOTA DE VERIFICACIÓN (2026-10-05).** Rojo primero: `npm test` → **tests 172 · pass 165
  · fail 7**, con `actual: undefined, expected: false`: `UpdateCategorySchema` no existia y
  `image` se descartaba. Final: **tests 172 · pass 172 · fail 0**, `typecheck` y `lint`
  exit 0. El caso "el `slug` no llega a la salida del esquema" se comprobo con
  `"slug" in r.data === false`, no solo con que la entrada fuera valida.

- [x] **T4** — **Primero el test, y verlo en rojo.**
  `tests/category-card-props.test.ts` (nuevo): con 4 elementos salen `"01"`, `"02"`,
  `"03"`, `"04"` y los 4 acentos en ese orden; con 6 elementos **solo se devuelven 4**
  (D11) y el 5.º color si se pidiera vuelve al primero (módulo 4); con 0 elementos más
  reserva salen las 4 de la reserva con `imagen: null`; con 1 sola categoría sale **solo
  esa**, con `"01"`, y **no** se rellena con la reserva.
  `npm test` → **rojo**: `Cannot find module '../src/lib/category-card-props'`.
  Solo entonces, `src/lib/category-card-props.ts`: `ACCENTS`, `NUMERO_VISIBLE = 4`,
  `numeroPara()`, `acentoPara()` y `construirTarjetas(categorias, reserva)`. **Puro**:
  ni React, ni BD, ni DOM, ni reloj (plan §3).
  Verificado: suite en verde; **`npm run typecheck` y `npm run lint` exit 0**.

  **NOTA DE VERIFICACIÓN (2026-10-05).** Rojo primero: **tests 173 · pass 172 · fail 1**
  con `Cannot find module '../src/lib/category-card-props'`. Final: **tests 190 · pass 190
  · fail 0**, typecheck y lint exit 0. **Me equivoqué al escribir el modulo**: lo deje como
  `export type Categoria minima`, con un espacio en el identificador, y lo corregi antes de
  compilar.

---

## F2 — Escribir en `public/uploads/site/` sin romper `products/`

- [x] **T5** — `storeImage(bytes, ext, target = "products")` con `UPLOAD_TARGETS` como
  registro congelado de los **dos** destinos (plan §6). **`randomBytes(16).hex`, la
  extensión de lista blanca y el `flag: "wx"` no se tocan.** El endpoint
  `POST /api/admin/upload` lee el campo `target` del `FormData`, lo valida contra las
  claves del registro (**400** si no está) y por defecto usa `products`, así que
  **los formularios de producto no cambian ni una línea**. `validateImage()` **no se
  toca** (D2). Añadir a `.gitignore` `/public/uploads/site/*` y
  `!/public/uploads/site/.gitkeep` (calcado de las líneas 41-42) y crear el `.gitkeep`.
  Verificado: `npm test` → las **11 pruebas de `tests/upload-validation.test.ts` siguen
  verdes sin modificarlas**; subir un JPEG de producto devuelve **una** URL
  `/uploads/products/<32 hex>.jpg` **igual que antes**; `git status` **no** lista ningún
  fichero bajo `public/uploads/site/` después de subir uno de prueba (R11).

  **NOTA DE VERIFICACIÓN (2026-10-05).** `npm test` → **tests 190 · pass 190 · fail 0**, y
  `tests/upload-validation.test.ts` **sin tocar un carácter** (`git diff --stat` lo confirma).
  `git check-ignore -v` → `site/foto.jpg` por la regla nueva y `products/foto.jpg` por la
  de la linea 41; **los dos `.gitkeep` siguen versionables**, que es lo que se queria.
  **R11 comprobado de verdad**: se copio un JPEG real a `public/uploads/site/` y
  `git status --untracked-files=all` **solo mostro el `.gitkeep`**.

---

## F3 — ⚠️ LA MIGRACIÓN. Prerequisito duro de F4

> **Nada de F4 ni de F5 puede empezar antes de que esto esté verde.** Sin `prisma generate`,
> el cliente de `src/generated/prisma/` no conoce `SiteSettings` y **toda** consulta a él
> sale `Unknown field 'heroImage'`. Es la única tarea del plan capaz de romper el
> proyecto entero, y por eso tiene su propia casilla y sus cuatro puntos de corte.

- [x] **T6** — `+ model SiteSettings` en `prisma/schema.prisma` con **`id Int @id @default(1)`**
  fijo (plan §10.1), `heroImage String?` y los dos `timestamps`. Después, **en este orden y
  sin saltarse ninguno**:
  `npx prisma migrate status` (limpio) → `npx prisma migrate dev --name add_site_settings`
  → **`npx prisma generate`** → **reiniciar el dev server** → `npx prisma migrate status`
  (vuelve a limpio).
  **Si sale P3014**: el usuario `pingo` necesita `CREATE` y `ALTER` para la *shadow
  database*. Concederlos **solo en la base de datos local**. La transacción revierte: **no
  hay nada que deshacer** (plan §10, punto A).
  **Si hay que volver atrás**: punto C del plan — `migrate resolve --rolled-back <nombre>`,
  borrar el fichero de la migración, `npx prisma generate`. **Prohibido `prisma migrate
  reset` sin permiso del usuario**: borra los datos.
  Verificado: `npx prisma migrate status` → "Database schema is up to date!"; la tabla se
  llama **`SiteSettings`** con mayúscula exacta (R3); `SELECT * FROM SiteSettings` devuelve
  **0 filas**, sin error; el dev server reiniciado ya no dice `Unknown field 'heroImage'`.

  **NOTA DE VERIFICACIÓN (2026-10-05).** Los seis pasos, en orden, **ninguno saltado**:
  `migrate status` limpio → `migrate dev --name add_site_settings` (**exit 0**) →
  `prisma generate` (**exit 0**) → dev server reiniciado → `migrate status` limpio
  (**6 migraciones**). **No salio P3014**: el usuario `pingo` ya tenia `CREATE` y `ALTER` de
  una spec anterior, asi que no hizo falta conceder'selos. Comprobado con una sonda que
  consulta la tabla de verdad: nombre **`SiteSettings`** con mayuscula exacta (R3),
  **0 filas**, y `prisma.siteSettings.count()` = 0 y `findUnique({ id: 1 })` = `null`
  **sin error**, lo que prueba que el cliente generado ya conoce el modelo. El SQL es solo
  un `CREATE TABLE` de 5 columnas. **La sonda se borro** (`git status scripts/` vacio).

---

## F4 — Guardar y leer la foto del hero · **+1 ruta del build**

- [x] **T7** — `src/lib/site-settings.ts` con `SINGLETON_ID = 1`,
  `readHeroImage()` (**tolerant a fallos**: `try/catch`, log sin datos del objeto, `null`
  si la BD cae — `RF-13`) y `writeHeroImage(path)` (`upsert` sobre `id: 1`, así que la
  fila se crea sola la primera vez y **no hay paso de siembra**, P4). Y
  `src/app/api/admin/site/route.ts` con `PATCH`: `requireAdmin()` **antes de tocar nada**,
  Zod en el borde con `siteImagePath` (**400** si la ruta no tiene la forma, `RF-12`),
  `describePrismaError` y log solo si `serverFault`. Sin sesión → **401**; con rol que no
  sea ADMIN → **403**.
  **Rutas del build: 19 → 20.**
  Verificado: `npm run typecheck` y `npm run lint` exit 0; `PATCH /api/admin/site` sin
  sesión → **401**; con BUYER → **403**; con ADMIN y `heroImage: "/uploads/products/../../evil.js"`
  → **400**; con una ruta `/uploads/site/<32 hex>.jpg` válida → **200** y `SELECT` en la
  BD devuelve esa ruta.

  **NOTA DE VERIFICACIÓN (2026-10-05).** `typecheck` y `lint` exit 0. Comprobado **con la
  sesión real en el navegador**, no con `Invoke-WebRequest`. `PATCH /api/admin/site`:
  **401** sin cookie · **403** con BUYER (cambio de sesión de verdad: logout, login como
  el comprador de pruebas, logout, login como admin) · **400** con traversal, con
  `http`/`https` externa y con la **forma de la carpeta de productos** (tres rechazos
  distintos, el tercero es el que prueba que los dos esquemas son independientes) · **200**
  con ruta valida · **200** con `""` para quitarla. El 403 salio **403**, no 401, asi que el
  rol se comprueba de verdad.
  En la BD, con sonda: tras `writeHeroImage(ruta)` el `readHeroImage()` devuelve esa ruta y
  hay **1 sola fila** `id=1`; tras `writeHeroImage(null)` sigue habiendo **1 fila** y la
  lectura da `null`. **El `upsert` no multiplica filas.**
  **Me equivoque al empezar**: escribi `import "server-only"` en `site-settings.ts`, que el
  proyecto documenta como **no instalado y prohibido**. Lo quise antes de compilar.

---

## F5 — Editar categorías · **+1 ruta del build**

- [x] **T8** — `POST /api/categories` acepta `image` y lo guarda. Y **nuevo**
  `src/app/api/categories/[id]/route.ts` con `PATCH`: `params` como
  **`Promise<{ id: string }>`** (misma convención que ya usa `src/app/products/[slug]/page.tsx:10`),
  `requireAdmin()`, `UpdateCategorySchema` de T3, **409** si el slug derivado del nombre
  nuevo choca con el de **otra** categoría (`RF-21`), y `describePrismaError` para que
  **P2025 salga 404** (`RF-19`). **Ni una línea de borrado** (`RF-24`), y **el `slug` no se
  escribe nunca** (D13).
  **Rutas del build: 20 → 21.**
  Verificado: `npm run typecheck` y `npm run lint` exit 0; `PATCH /api/categories/1` sin
  sesión → **401**, con BUYER → **403**, con `id` inexistente → **404**, con
  `image: "/uploads/products/../../evil.js"` → **400**, con un nombre que choca de slug →
  **409**; alta sin `image` → **201** y sin foto (`RF-15`).

  **NOTA DE VERIFICACIÓN (2026-10-05).** `typecheck` y `lint` exit 0. Los nueve casos en
  verde: alta con foto **201** y `image` guardada · alta sin foto **201** con `image: null`
  (RF-15) · **401** sin sesion · **400** traversal · **404** id inexistente · **409** nombre
  que choca de slug · **200** editando y **quitando** la foto · **`slug` sin cambios** al
  editar · **`slug` ignorado** aunque el cliente mande `slug: "hack-slug"`, comprobado
  sobre el valor devuelto.
  **Me rompi datos con el script de verificacion y lo arreglé.** Al truncar el JSON de la
  respuesta a 110 caracteres, el parseo de los ids fallo, los ids salieron `null` y los
  parcheos cayeron sobre **categorias reales**: la id=2 ("Botones fotograficos") paso a
  "Renombrada". La restaure, y **la primera restauracion la hice sin el acento** porque al
  teclear acentos en PowerShell se me colaron caracteres raros; la segunda se hizo con la
  herramienta de escritura y quedo "Botones fotograficos" con su tilde, igual que antes.
  Las categorias de prueba se borraron y la BD quedo con las **4 originales y sin imagen**.

---

## F6 — La foto del hero, de punta a punta · **+1 ruta del build**

- [x] **T9** — `src/components/ui/ImagePicker/` (`ImagePicker.tsx`, `.types.ts`,
  `.styles.ts`, `index.ts`): input `accept="image/jpeg,image/png,image/webp"`, aviso
  temprano de **5 MiB**, `POST /api/admin/upload` con `FormData` (**`file` y `target: "site"`**),
  vista previa y botón de quitar. **`ImagePicker` es la copia del bloque de
  `AdminProductsView.tsx:160-200`; en ese fichero NO se toca el campo de imagen** (plan §5.1).
  Después: `src/app/admin/apariencia/page.tsx` (D10, protegida con `getSession()` + 307 a
  `/login`), `AparienciaView.tsx`, `Hero` **recibe props** (foto **o** `Pingo`, nunca los
  dos — `RF-4`; `alt` vacío, es decorativa — `RF-35`), y `src/app/page.tsx` lee la foto y
  **se la pasa como prop**. `page.tsx` sigue siendo `force-dynamic` y **`MainLayout` no se
  toca** (R4).
  **Rutas del build: 21 → 22.**
  Verificado: **V1** (subir JPEG → URL `/uploads/site/<32 hex>.jpg`, y un `GET` a esa URL
  devuelve **200** con la imagen); **V2** (portada: `naturalWidth > 0` **esperando dentro de
  la página** con `requestAnimationFrame`, y el texto `Pingo` **ya no está** en ese hueco);
  **V3** (quitar → vuelve `Pingo`, sin imagen rota); **V4** (`.html` renombrado a `.jpg` →
  **415** y `public/uploads/site/` **no** gana ficheros); **V5** (GIF → **415**);
  **V6** (6 MiB → aviso, no se sube); **V17** (red cortada → `Pingo`, no icono de imagen
  rota).

  **NOTA DE VERIFICACIÓN (2026-10-05).** `typecheck` y `lint` exit 0. **V1** comprobado:
  `storeImage` escribio en `public/uploads/site/` y un `GET` a esa URL sirve la imagen.
  **V2**: en la portada la foto sale con `naturalWidth` **1200**, **`alt` vacio** (es
  decorativa, RF-35) y el texto del hueco es **solo "Catalogo"**: el `Pingo` **no esta**, que
  es exactamente RF-4 (foto *o* texto, nunca los dos). **0 imagenes rotas** en la pagina.
  **V3**: tras guardar `""`, el `Pingo` vuelve en una caja de **492×377**, **la misma
  medida** que con la foto: no hay salto de layout.
  **Mi selector estuvo mal dos veces** y por eso dos comprobaciones dieron falso negativo:
  primero busque `text-6xl` dentro de `innerHTML` (es un atributo, no contenido), luego
  `redirect: "manual"` en `fetch` devolvio una respuesta opaca con estado 0. La forma que si
  funciona es esperar **dentro de la pagina** con `requestAnimationFrame`.

---

## F7 — Fotos de categoría, de punta a punta

- [x] **T10** — `src/app/admin/categorias/page.tsx` pasa a **leer la lista** y a montar
  `AdminCategoriesView.tsx` (cliente): listado con **nombre, descripción y foto actual**,
  edición en línea de esos tres (**NO** el `slug`: D13) y alta con `ImagePicker`
  reutilizado. `AdminCategoriesForm.tsx` gana el campo de imagen y se integra en la vista.
  `Categories.tsx` pasa a ser **data-driven**: recibe las categorías como prop y **delega
  el recorte y la derivación** en `construirTarjetas()` de T4. Con foto, banda arriba
  (`object-cover`); **sin** foto, el `Pingo` de reserva en **esa misma banda**, para que
  ninguna tarjeta se descuadre (`RF-28`, D12); la **insignia circular con el número se
  queda debajo** (D12). Cada `<img>` con el `eslint-disable` y el motivo **en una sola
  línea** (D8), y `alt` **no vacío** derivado del nombre (`RF-34`).
  Verificado: **V12** (crear con foto → `naturalWidth > 0`; luego quitarla → sin hueco
  vacío); **V13** (cambiar el nombre a "Playeras" → sale en la tarjeta **y** en el filtro de
  `/products`); **V14** (una **5.ª** categoría con foto → **no** sale en la portada, y **sí**
  se edita y se le ve la foto en `/admin/categorias`: es D11, no un fallo); **V15** (**0**
  categorías → las 4 tarjetas de texto de hoy, la portada **no** rota); **V16** (4 con foto →
  4 imágenes con `alt` no vacío en el árbol de accesibilidad); `RF-23` (sin categorías, el
  panel **lo dice**, no muestra una lista vacía sin explicación).

  **NOTA DE VERIFICACIÓN (2026-10-05).** `typecheck` y `lint` exit 0.
  **V12**: con foto en una categoria, la banda de su tarjeta la muestra con
  `naturalWidth` **1200** y **`alt` = el nombre de la categoria**, no vacio (RF-34). Al
  quitarla vuelve el `Pingo` **en la misma caja de 377×144**, sin descuadrar la tarjeta.
  **V13**: los titulos de las tarjetas salen de la base de datos y en **orden alfabetico**
  ("Botones fotograficos", "Impresion 3D", "Llaveros", "Pines metalicos"), con las
  insignias **01-04** y los cuatro acentos en orden. **4 bandas de imagen** presentes.
  **V14**: se creo una 5.ª categoria con foto. La portada muestra **exactamente 4** tarjetas,
  y la 5.ª **si** se edita y **si** ve su foto en el panel (5 filas, con "Editar").
  **Aviso honesto sobre V14**: la consecuencia de D11 es **peor de lo que se suponia**. Como
  el orden es alfabetico, la categoria nueva **desplazo a una que ya existia** ("Pines
  metalicos" dejo de salir). No es un fallo del recorte, es lo que significa "solo las 4
  primeras por nombre". Queda anotado en `AGENTS.md` y en `MEMORY.md` (H5 lo del navbar).
  **V15** y **V16**: la red de seguridad y los 4 `alt` no vacios estan cubiertos por los
  **19 tests de `category-card-props`** (`construirTarjetas([], reserva)` y el caso de
  1 sola categoria), no por medicion en navegador: vaciar la tabla de categorias habria
  roto el filtro de `/products` y el resto de la sesion.

---

## F8 — Puertas de administración

- [x] **T11** — `src/app/admin/AdminNavLinks.tsx` montado en las **tres** páginas de
  administración: enlaces a `/admin/categorias` y a `/admin/apariencia` (`RF-37`,
  `RF-38` — hoy `/admin/categorias` **no tiene ni un enlace entrante** y es inaccesible,
  R10). En `AdminProductsView.tsx` **solo** se añade el enlace, nada más (§5.1).
  Verificado: desde `/admin/productos` se llega a las otras dos con un clic, y desde ellas
  se vuelve; **V7** (sin sesión, `/admin/apariencia` y `/admin/categorias` → **307** a
  `/login`, no la página); en `/admin/categorias` **no aparece ninguna acción de borrar**
  y `grep -ri "delete" src/app/api/categories` no encuentra ruta de borrado (`RF-24`).

  **NOTA DE VERIFICACIÓN (2026-10-05).** Los tres enlaces presentes en las tres paginas:
  `/admin/productos`, `/admin/categorias`, `/admin/apariencia`. **V7 comprobado** con
  sesion cerrada de verdad (logout y navegacion, no con `fetch`): `/admin/apariencia` →
  `location.pathname` = **`/login`**, y `/admin/categorias` →
  **`/login?next=%2Fadmin%2Fcategorias`**. El panel lista **4 filas**, cada una con
  "Editar" y **ningun boton de borrar ni de eliminar** (RF-24). El enlace se aniadio a
  `AdminProductsView.tsx` **sin tocar su campo de imagen** (§5.1).

---

## F9 — Verificación completa

- [x] **T12** — `npm run check` → **exit 0** en los cuatro: typecheck, lint, **151+N tests**,
  build. **Con el dev server parado**, que si no Turbopack hace panic (plan §9.1).
  Recalcular y apuntar los tres números **de la salida real, no de memoria**: tests, suites
  y **rutas del build** (esperado **22**: 19 + `/admin/apariencia` + `/api/admin/site` +
  `/api/categories/[id]`; **la base es 19, no 16** — corregido en T1; **si el build dice
  otra cosa, manda el build**).
  Verificar que `/contacto` y `/novedades` siguen saliendo como **`○` estáticas** en el
  output del build: si pasan a `ƒ`, alguien ha tocado `MainLayout` (R4).
  Verificado: los cuatro exit 0; los tres números apuntados y **coincidentes con la
  salida**; `/contacto` y `/novedades` como `○`.

  **NOTA DE VERIFICACIÓN (2026-10-05).** Con el dev server **parado** (si no, Turbopack hace
  panic) y `.next` borrado: `npm run check` → **exit 0**. Numeros **de la salida real**:
  **tests 190 · suites 26 · pass 190 · fail 0** · **22 rutas** del build. Las tres rutas
  nuevas aparecen: `/admin/apariencia`, `/api/admin/site`, `/api/categories/[id]`.
  **`/contacto` y `/novedades` siguen como `○`**, y `/cotizacion` tambien: **`MainLayout` no
  se toco** (R4). Coincide con el **22** predicho en T1 a partir de la base real de 19.

---

## F10 — Documentación y **reciclaje** de `MEMORY.md`

> ⚠️ **`MEMORY.md` ya está en exactamente 100 líneas y su tope son ~100.** **No se le
> añade ni una línea.** Esta tarea **recicla**: lo que entra obliga a que salga algo, y
> decidir qué sale es una decisión, no un apaño.

- [x] **T13** — Actualizar los recuentos con los números **reales de T12**: `AGENTS.md`
  (líneas 30 y 46), `README.md` (38, 117, 128 y 161 — **y las 19 rutas**),
  `docs/GATES.md` (8 y 9), `docs/SDD.md` (§4 **añadir `SiteSettings`**, §5 **storage con
  las dos carpetas**, §7 flujo crítico, §9 suites y recuento, §10 despliegue, §11 riesgos).
  `docs/THREATS.md`: activo de imágenes con **dos** carpetas, **nuevos puntos de entrada**
  (`PATCH /api/categories/[id]` y `PATCH /api/admin/site`), STRIDE, controles y tests.
  `docs/PUBLICAR.md` (línea 26 y 231: la carpeta nueva **también** son datos de clientes
  subidos por administradores), `docs/DEPLOY.md` (línea 114: el bucle de rutas de admin
  incluye `/admin/apariencia`), `CHANGELOG.md` (`[Sin publicar]`). `docs/DESIGN.md` **solo
  si** el renderizado mete un hex nuevo: la paleta es su fuente de verdad.
  **`MEMORY.md`: reciclar, no ampliar.** Salen candidatos naturales: la fase "bug de imagen
  de producto arreglado" si ya se ha commiteado, y el detalle de `MainLayout` que ya está
  en `AGENTS.md` y en `docs/SDD.md`. Entran: `SiteSettings`, el destino `target` de la
  subida, D11 (el recorte a 4 es una decisión del usuario, no un descuido), y la nota de
  que `/admin/categorias` no tenía enlace.
  Verificado: `grep -rn "151\|16 rutas\|19 rutas\|20 suites" README.md AGENTS.md docs/*.md
  MEMORY.md` → **ningún número obsoleto**; `wc -l MEMORY.md` → **≤ 100**; barrido de
  secretos de `docs/PUBLICAR.md` §2 antes de cualquier commit futuro.

  **NOTA DE VERIFICACIÓN (2026-10-05).** Recuentos actualizados a los **números reales de
  T12** en `AGENTS.md`, `README.md`, `docs/GATES.md`, `docs/SDD.md` y `MEMORY.md`:
  **190 tests, 26 suites, 22 rutas**. `docs/SDD.md` gana `SiteSettings` en §4, las **dos
  carpetas** en §5, los flujos del hero y de edicion de categorias en §7, y las dos carpetas
  en §10. `docs/THREATS.md` gana los puntos de entrada **E9** y **E10**, la ampliacion de
  **E6** (el `target`), cuatro filas STRIDE nuevas y las dos carpetas en el activo A4.
  `docs/PUBLICAR.md` y `docs/DEPLOY.md` (`/admin/apariencia` en el bucle de comprobacion).
  `CHANGELOG.md` bajo `[Sin publicar] → Añadido`, **en el `Añadido` que ya existia**: mi
  primer intento creo un segundo encabezado igual en el mismo apartado y lo corregi.
  `docs/DESIGN.md` **no se toco**: el renderizado no mete ningun hex nuevo, solo reutiliza
  `--cartoon-cream` y `--cartoon-pink` de la paleta existente.
  **`MEMORY.md` reciclado, sin ampliar**: entro la spec 008 y el hallazgo **H5**, y salio
  el detalle de `SiteSettings` y las dos carpetas, que ahora viven en `AGENTS.md`. Quedo en
  **100 lineas exactas**, sin BOM y sin CJK.
  **Me introduje un BOM en `docs/THREATS.md`** al escribirlo: en HEAD empezaba por `23 20 4D`
  (`# M`) y acabo en `EF BB BF`. Quitado con `[IO.File]::WriteAllText` y
  `UTF8Encoding($false)`, y verificado byte a byte. Hay **cinco ficheros mas con BOM** que
  **ya estaban antes** (`specs/001-pingo-rework/*`, `src/middleware.ts`,
  `src/lib/auth/password.ts`, `src/lib/auth/session.ts`, `src/app/api/auth/login/route.ts`):
  **no los toco**, porque no son de este trabajo y meterlos ensuciaria el diff. Queda anotado.
  Barrido de secretos: la contraseña admin vigente y la clave de Context7 **no estan en
  ningun fichero versionado**. Persisten dos coincidencias **preexistentes y aceptadas**: la
  contraseña admin **anterior** (ya cambiada, que queda como ejemplo de politica en los tests
  de la spec 006) y la del **BUYER de pruebas**, que `prisma/make-buyer.ts` ya publica.
  **No se escriben aqui de forma literal**, precisamente para no multiplicar su aparicion;
  ninguna sirve como credencial de admin. `.env` y las dos carpetas de subidas siguen
  ignoradas, con `git check-ignore -v` como prueba.

---

## Deuda que esta spec deja anotada, no pagada

- **Ficheros huérfanos en disco.** Quitar una foto no borra el fichero (D6, D7, R8). Nadie
  lo limpia.
- **`AdminProductsView` no adopta `ImagePicker`** (plan §5.1, P6). La subida de imagen de
  producto sigue duplicada dentro de ese fichero, que además tiene un arreglo **sin
  commitear**.
- **El recorte a 4 es invisible para el administrador.** Una 5.ª categoría se crea, se
  edita y se le sube foto, y no aparece en la portada. Ningún sitio le avisa de eso.
- **`number` y color derivados**, no editables: con muchas categorías el color se repite.

## Fuera de esta spec

- **Borrado de categorías** (`RF-24`): no lo pidió el usuario y hay productos asociados.
- **Editar el `slug`** (D13): decisión cerrada del usuario, **no**.
- **Borrar ficheros del disco** (D6, D7): deuda.
- **007 — crear administradores desde `/admin/usuarios`**: siguiente en la lista del
  usuario, sin relación con esta spec.

## Lo que **no** se hace al terminar

- **Ni `git add`, ni `git commit`, ni `git push`.** El usuario lo pidió explícitamente:
  "aun no hagas el comit". Cuando lo pida, el barrido de secretos de `docs/PUBLICAR.md` §2
  va **antes**, porque el repositorio es **público** y un secreto publicado no se quita
  con un commit posterior.