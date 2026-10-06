# Plan: Pingo POP — Foto del hero e imágenes de categoría (008-site-and-category-images)

> Spec **aprobada** por el usuario el 2026-10-05. Decisiones cerradas: **D10–D13**.
> **No se hace commit.** El usuario lo pidió explícitamente dos veces.
> Este plan no escribe código: dice qué se toca, en qué orden y con qué criterio se
> comprueba. La implementación es de otra fase.

## 1. Estrategia en una frase

Primero todo lo que se puede probar **sin base de datos y sin navegador** (dos módulos
puros y sus tests en rojo), después la migración —que es la dependencia dura y la única
que puede romper el proyecto—, y solo entonces las capas que la necesitan: escritura,
API, interfaz y por último la documentación.

## 2. Orden de ejecución y por qué ese orden

| Fase | Qué | Por qué aquí y no antes |
|---|---|---|
| **F0** | Baseline: dejar `npm run check` en verde y **anotar los números** actuales | Si el proyecto ya está rojo, no se puede distinguir "lo ha roto esta spec" de "ya estaba roto" |
| **F1** | Dos módulos puros: esquemas de ruta y derivación de tarjetas | Lo único testeable sin `jsdom` ni BD. Va primero y **se ve en rojo antes de existir** |
| **F2** | `storeImage` con destino + endpoint de subida acepta `target` | No depende de la migración. Deja lista la escritura en `public/uploads/site/` |
| **F3** | **`SiteSettings` + migración + `prisma generate` + reiniciar dev** | **Dependencia dura.** Sin esto el cliente generado no conoce el modelo y sale `Unknown field 'heroImage'`. Bloquea F4 y F5 |
| **F4** | Lectura y escritura de la foto del hero | Depende de F3: `siteSettings` no existe en el cliente hasta que se genera |
| **F5** | `POST` acepta `image` + `PATCH /api/categories/[id]` | `Category.image` ya existe desde la spec 001: **no necesita migración**, se puede hacer en cualquier momento. Va después de F4 para no tener dos cambios de API sin probar entre ellos |
| **F6** | `ImagePicker` + `/admin/apariencia` + `Hero` con props + `page.tsx` lee la BD | La foto del hero necesita las tres cosas: modelo (F3), escritura (F4) y lectura |
| **F7** | Panel de categorías con listado + `Categories.tsx` data-driven | Es la mitad más grande. Va después de F6 para que, si algo sale mal, sepas si es del hero o de las categorías |
| **F8** | Enlaces de navegación (`RF-37`, `RF-38`) | Toca de paso dos páginas. Trivial, pero inútil si F6/F7 fallaron |
| **F9** | Verificación: `npm run check`, V1–V17 en navegador, recuentos reales | Solo cuando todo está montado |
| **F10** | Documentación y reciclaje de `MEMORY.md` | Al final: los números se cuentan cuando ya no cambian |

**La migración va en F3, no al principio.** Es tentador hacerla la primera, pero si
después algo falla en F1/F2 se tiene un modelo nuevo en la base de datos sin una sola
tarea que lo use, y el radio de "deshacer" es mucho más ancho.

## 3. El principio que manda

**La lógica comprobable va en módulos puros de `src/lib/`.** El runner es `node:test`
**sin jsdom** y `docs/constitution.md` §6 prohíbe añadir dependencias. Por eso:

- El recorte de 4 tarjetas, la derivación del número y del color, y los esquemas Zod son
  **funciones puras** en `src/lib/`, no lógica enterrada en un componente.
- Los componentes de React y los route handlers **no se testean**: se comprueban en
  navegador con los criterios V1–V17 de la spec §7.2, que tienen criterio exacto.

**Sobre el "hoy" como parámetro:** ninguna función nueva de esta spec lee el reloj. Ni las
subidas tienen fecha de caducidad, ni las tarjetas cambian con la hora, ni el singleton
tiene TTL. Por eso **no aparece ningún parámetro de fecha**: añadirlo "por simetría" con
otras specs sería un parámetro que nadie pasa y que nadie verifica.

## 4. Ficheros creados

| # | Fichero | Responsabilidad única |
|---|---|---|
| 1 | `prisma/migrations/<timestamp>_add_site_settings/migration.sql` | **Generado** por `prisma migrate dev`. No se escribe a mano |
| 2 | `src/lib/category-card-props.ts` | **Puro.** Deriva `number` y color, recorta a 4 y aplica la reserva. Nada de React, nada de BD |
| 3 | `src/lib/site-settings.ts` | **Servidor.** `readHeroImage()` tolerante a fallos y `writeHeroImage()` con `upsert` sobre la fila única |
| 4 | `src/app/api/admin/site/route.ts` | `PATCH`: guarda o quita la foto del hero. `requireAdmin()` + Zod + `describePrismaError` |
| 5 | `src/app/api/categories/[id]/route.ts` | `PATCH`: edita nombre, descripción e imagen. **Sin borrado** (`RF-24`) |
| 6 | `src/app/admin/apariencia/page.tsx` | Server Component protegida. Lee la foto actual y la pasa al Client Component (`D10`) |
| 7 | `src/app/admin/apariencia/AparienciaView.tsx` | Cliente: el `ImagePicker` y el botón de quitar. Sin lógica de validación |
| 8 | `src/app/admin/categorias/AdminCategoriesView.tsx` | Cliente: **listado con edición en línea** + alta. Reutiliza `ImagePicker` |
| 9 | `src/app/admin/AdminNavLinks.tsx` | Server Component: los enlaces entre páginas de administración. Sin estado, sin datos |
| 10 | `src/components/ui/ImagePicker/{ImagePicker.tsx,.types.ts,.styles.ts,index.ts}` | Cliente: control de subida reutilizable (input de fichero, aviso de 5 MB, `POST` con `FormData`, vista previa, botón de quitar) |
| 11 | `public/uploads/site/.gitkeep` | Mantiene la carpeta en git sin subir contenido |
| 12 | `tests/site-settings-schema.test.ts` | Suite del esquema `siteImagePath` |
| 13 | `tests/category-card-props.test.ts` | Suite de la derivación de tarjetas |

## 5. Ficheros modificados

| # | Fichero | Qué cambia y por qué |
|---|---|---|
| 1 | `prisma/schema.prisma` | **+ `model SiteSettings`.** S1. Sin esto no hay dónde guardar la foto |
| 2 | `src/lib/validation.ts` | **+ `siteImagePath`**, `CreateCategorySchema.image`, **+ `UpdateCategorySchema`**. D9, S3, `RF-25` |
| 3 | `src/lib/upload.ts` | `storeImage()` gana un **tercer parámetro `target`** con valor por defecto `products`. Ver §6 |
| 4 | `src/app/api/admin/upload/route.ts` | Lee el campo `target` del `FormData` y lo valida contra los dos destinos conocidos |
| 5 | `src/app/page.tsx` | Lee la foto del hero y las categorías y **se las pasa como props**. Sigue siendo `force-dynamic` |
| 6 | `src/components/sections/Hero/Hero.tsx` | **Recibe props.** Si hay foto, la pinta; si no, el `Pingo` de reserva. `RF-2`/`RF-3`/`RF-4`/`RF-35` |
| 7 | `src/components/sections/Categories/Categories.tsx` | **Data-driven.** Recibe las categorías como prop, delega el recorte y la derivación en el módulo puro. `RF-26`–`RF-33` |
| 8 | `src/app/admin/categorias/page.tsx` | Deja de ser solo alta: **lee la lista** de la BD, la pasa al Client Component y monta los enlaces de navegación. Pasa a ser `async` (ya lo es) |
| 9 | `src/app/admin/categorias/AdminCategoriesForm.tsx` | Campo de imagen con `ImagePicker`. Pasa a formar parte de `AdminCategoriesView` |
| 10 | `src/app/admin/productos/AdminProductsView.tsx` | **Solo** los enlaces de navegación. **No** se toca su campo de imagen |
| 11 | `.gitignore` | **+** `/public/uploads/site/*` y `!/public/uploads/site/.gitkeep`, calcados de las líneas 41-42 |
| 12 | `docs/*.md`, `README.md`, `AGENTS.md`, `CHANGELOG.md`, `MEMORY.md` | Recuentos y rutas. Ver `tasks.md` T10 |

### 5.1 Por qué `AdminProductsView` **no** adopta `ImagePicker`

`ImagePicker` es idéntico a lo que ya hace `handleImageChange` (líneas 160-200), así que
lo natural sería sustituirlo. **No se hace en esta spec**, y el motivo es concreto: ese
fichero tiene el arreglo de imagen de producto **sin commitear** y mezclar los dos
cambios en un solo diff haría imposible revisar cuál rompió qué. Queda anotado como
deuda: la adopción de `ImagePicker` ahí es una tarea de una línea cuando toque.

## 6. Cómo se refactoriza `storeImage` **sin tocar su comportamiento**

El problema: S2 necesita escribir en `public/uploads/site/` y hoy `UPLOAD_DIR` y
`UPLOAD_URL_PREFIX` son constantes fijas (`src/lib/upload.ts:18` y `:21`).

**P|Decisión P1 — un parámetro de destino, no dos funciones.**

```
UPLOAD_TARGETS = congelado({
  products: { dir: "public/uploads/products", prefix: "/uploads/products" },
  site:     { dir: "public/uploads/site",     prefix: "/uploads/site"     },
})

función storeImage(bytes, ext, target = "products"):
    t = UPLOAD_TARGETS[target]
    si t no existe: lanzar error de destino desconocido      # nunca chega desde la API: se valida antes
    await mkdir(path.join(cwd, t.dir), { recursive: true })
    filename = `${randomBytes(16).hex}.${ext}`                # INALTERADO
    await writeFile(path.join(cwd, t.dir, filename), bytes, { flag: "wx" })   # INALTERADO
    devolver `${t.prefix}/${filename}`
```

**Lo que no cambia, y es lo importante:**

- El **valor por defecto `products`** hace que la llamada actual
  (`storeImage(bytes, ext)`) siga produciendo **exactamente** la misma ruta.
- El nombre **`randomBytes(16).hex`**, la **extensión de lista blanca** y el **`flag: "wx"`**
  se quedan idénticos. No se toca ni una línea del mecanismo que anula el path traversal.
- `validateImage()` **no se toca** (D2). Sigue siendo el único filtro de magic bytes y el
  único que impone los 5 MiB. Las 11 pruebas de `tests/upload-validation.test.ts` tienen
  que seguir en verde **sin modificarlas**.

**Por qué no se duplica la función:** dos copias de "generar nombre + escribir con `wx`" son
dos sitios donde el día que haya que cambiar la política de nombres se cambia solo uno. Es
justo el tipo de duplicación que `docs/constitution.md` §6 penaliza.

**Por qué no se ensancha `imagePath` para que valga `/uploads/site/`:** D9. Un esquema con
dos prefijos posibles es "cualquier ruta bajo `/uploads/`", que es justo lo que el esquema
actual evita.

### 6.1 Cómo se declara el destino en el endpoint de subida

**P|Decisión P2 — un campo `target` en el `FormData`, con lista blanca de dos valores.**

- El `FormData` de la subida lleva `file` (como hoy) y **`target`**, que puede faltar.
- Si falta, vale `products`. **Los formularios de producto no cambian ni una línea.**
- El valor se valida contra las claves de `UPLOAD_TARGETS` antes de tocar disco. Un valor
  fuera de la lista es **400**, no un error 500.
- *Alternativa descartada:* un endpoint nuevo `/api/admin/site-image`. Duplicaría el
  `requireAdmin()`, la extracción del fichero, el `validateImage()` y el `415`. Cuatro
  copias de la misma frontera de seguridad, y la próxima vez que cambie la política de
  subidas habrá que cambiarla en cuatro sitios.
- *Coste aceptado:* un endpoint de escritura acepta un parámetro más. Está acotado a dos
  literales que se declaran en el código y no los elige el cliente libremente.

## 7. El módulo puro nuevo: `src/lib/category-card-props.ts`

Es lo que hace testeable `RF-30` y `RF-32` sin navegador (`tests/category-card-props.test.ts`).

```
ACCENTS = ["bg-cartoon-sky", "bg-cartoon-pink", "bg-cartoon-mint", "bg-cartoon-lavender"]
NUMERO_VISIBLE = 4                      # D11: constante con nombre, no un 4 suelto

función numeroPara(indice):              # 0 -> "01"
    devolver String(indice + 1).padStart(2, "0")

función acentoPara(indice):              # 0 -> el primero
    devolver ACCENTS[indice mod longitud(ACCENTS)]

función construirTarjetas(categorias, reserva):
    visibles = categorias[0 .. NUMERO_VISIBLE)            # D11: la 5.ª existe pero no se ve
    si visibles está vacío:
        base = reserva                                     # R5/RF-29: el fallo de BD se ve como texto
    si no:
        base = visibles.map((c) => ({ nombre: c.name, descripcion: c.description, imagen: c.image }))
    devolver base.map((c, i) => ({
        nombre: c.nombre,
        descripcion: c.descripcion,
        imagen: c.imagen,                                  # null o "" -> la banda muestra el Pingo
        numero: numeroPara(i),
        acento: acentoPara(i),
        alt: `Foto de ${c.nombre}`,                        # RF-34: nunca vacío
    }))
```

**Contrato exacto que hay que respetar:**

| Entrada | Salida |
|---|---|
| Lista vacía + reserva de 4 | Las 4 de la reserva, `"01"`–`"04"`, 4 acentos distintos, `imagen: null` |
| 6 elementos | **Solo los 4 primeros** (D11). `"01"`–`"04"` |
| 4 con foto, 2 sin | Las 4; las que no tienen foto llevan `imagen` a `null` o `""` y el componente pinta la reserva |
| 1 sola categoría | Esa, con `"01"` y el **primer** acento. **No** se rellenan las otras tres con la reserva: R6 |

**Por qué el recorte va aquí y no en el componente:** para que `RF-32` tenga un test.
Si el `.slice(0, 4)` viviera en el JSX, lo único que se podría comprobar es mirando el
navegador, y es exactamente el tipo de lógica que `MEMORY.md` ya-ha-documentado como
"nadie se enteró de que el campo existía".

## 8. Orden **test-first**

Cada bloque de código va precedido por su test **escrito y ejecutado en rojo**. La salida
del rojo se anota en la casilla de `tasks.md`; un test que nunca se vio rojo no demuestra
nada.

| Orden | Test | Se ve en rojo con | Código que lo hace pasar |
|---|---|---|---|
| 1 | `tests/site-settings-schema.test.ts` (nuevo) | `Cannot find module '../src/lib/validation'` **no**, porque `siteImagePath` todavía no está: falla la aserción, no el import | **+ `siteImagePath`** en `src/lib/validation.ts` |
| 2 | `tests/validation.test.ts` (ampliado) | `CreateCategorySchema` **ignora** `image` en vez de aceptarlo; `UpdateCategorySchema` no existe | **+ `image`** y **+ `UpdateCategorySchema`** |
| 3 | `tests/category-card-props.test.ts` (nuevo) | `Cannot find module '../src/lib/category-card-props'` | **`src/lib/category-card-props.ts`** |
| 4 | — | — | `storeImage` con destino (**no hay test**: toca disco. Se verifica con V1, V4 y V5) |
| 5 | — | — | Migración + `prisma generate` (no testeable; se verifica con `migrate status` y V1) |
| 6 | — | — | Rutas, páginas, componentes (sin jsdom; se verifican con V1–V17) |

**Lo que no se testea aquí, y por qué:** componentes de React y route handlers. El runner
es `node:test` **sin jsdom** y `docs/constitution.md` §6 prohíbe añadir dependencias.
Añadir jsdom para esto sería meter una dependencia en un repo público por comodidad.

## 9. Gates exactos y en qué orden

### 9.1 Puerta de Prisma (F3) — **antes de tocar nada que use `siteSettings`**

```
P1  npx prisma migrate status      # debe decir "up to date" ANTES de migrar
P2  npx prisma migrate dev --name add_site_settings
P3  npx prisma generate            # OBLIGATORIO: el cliente de src/generated/ no se actualiza solo
P4  <reiniciar el dev server>      # OBLIGATORIO: si no, "Unknown field 'heroImage'"
P5  npx prisma migrate status      # debe volver a decir "up to date"
```

**Dos trampas, las dos ya mordidas:**

- `prisma migrate dev` **necesita `CREATE` y `ALTER`** para su *shadow database*. El
  usuario `pingo` no los tenía y sale **P3014**. Concederlos **solo en la base de datos
  local**, como ya se hizo en la spec 006. **Nunca** tocar los permisos de producción sin
  que lo pida el usuario.
- **`npm run build` hace panic de Turbopack si el dev server compila a la vez.** Con el dev
  server parado, no hay conflicto.

### 9.2 Gate de código (F9)

`npm run check` ya encadena los cuatro en este orden. Para depurar, por separado:

```
npm run typecheck      # tsc --noEmit
npm run lint           # ESLint
npm test               # node --import tsx --test "tests/**/*.test.ts"
npm run build          # SOLO con el dev server parado
```

Criterio: **exit 0 en los cuatro**, y los tests previos **sin tocar** siguen en verde.

### 9.3 Gate de verificación manual (V1–V17)

Los criterios están en la spec §7.2. **Dos avisos al ejecutarlos:**

- `browser.navigate` **devuelve antes de que React hidrate**. Hay que **esperar dentro de
  la página** con `requestAnimationFrame` antes de leer `naturalWidth`, o sale un falso
  positivo. Ya pasó.
- Al probar el login, `Invoke-WebRequest` **no manda bien la cookie**: hay que hacerlo en
  el navegador. Ya pasó.

## 10. Punto de corte de la migración: cómo volver atrás

`src/generated/prisma/` está en `.gitignore` (línea 64), así que el cliente se regenera
siempre. El estado bueno es **"el esquema y el cliente generado coinciden"**, y eso se
consigue en un comando. Lo peligroso no es la migración: es quedarse a medias.

| Punto | Situación | Qué hacer |
|---|---|---|
| **A** | `migrate dev` falla **antes** de aplicar (P3014, sin permisos) | **No ha aplicado nada**: la transacción revierte. Conceder `CREATE`/`ALTER` en local y reintentar. No hay nada que deshacer |
| **B** | La migración está aplicada pero el cliente es viejo → `Unknown field 'heroImage'` | **Síntoma, no daño.** `npx prisma generate` + reiniciar el dev server |
| **C** | La migración aplicada no es la que queríamos | **Prohibido `prisma migrate reset` sin permiso explícito del usuario**: borra los datos. Camino seguro: `npx prisma migrate resolve --rolled-back <nombre>`, borrar el fichero de `prisma/migrations/`, `npx prisma generate`, y volver a aplicar |
| **D** | La BD quedó con una tabla a medias | `npx prisma migrate diff --from-url $DATABASE_URL --to-schema-datamodel prisma/schema.prisma --script` para **ver** el delta exacto. Decidir antes de ejecutar nada |
| **E** | Duda genérica sobre si el cliente está al día | `npx prisma generate` y reiniciar. Es gratis y no tiene efectos secundarios |

**Regla que manda:** en los puntos C y D, **parar y preguntar**. Un `reset` sobre la base
de datos del proyecto es la única operación de este plan capaz de perder trabajo que no
se puede recuperar, y no está autorizada por nada de lo que se ha aprobado.

### 10.1 Detalle del modelo

```prisma
model SiteSettings {
  id        Int      @id @default(1)   // S1: fila unica, siempre id 1
  heroImage String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

- **`id` fijo en 1** es lo que hace de singleton sin inventar un mecanismo de "la primera
  fila". El `upsert` de `writeHeroImage()` usa `where: { id: 1 }` y así la fila aparece
  sola la primera vez que se guarda una foto. **No hay paso de siembra.**
- **Nombre exacto `SiteSettings`**: R3. MariaDB en Linux distingue mayúsculas
  (`lower_case_table_names=0`), y un nombre distinto en el esquema y en la migración
  crea **dos** tablas.
- `heroImage` **no lleva regex en la base de datos**: la validación vive en el esquema
  Zod del borde (`RF-12`). Una restricción en SQL daría un 500 feo en vez de un 400 con
  el motivo.

## 11. Riesgos del plan

| # | Riesgo | Cómo lo mana este plan |
|---|---|---|
| P1 | **La migración rompe el proyecto entero** si se hace antes de tiempo | Va en **F3**, después de todo lo que no la necesita, y con cuatro puntos de corte escritos (§10) |
| P2 | **Reordenar o tocar `AdminProductsView`** y mezclar el arreglo de imagen sin commitear con esta spec | Solo se le añade el enlace de navegación (§5.1) |
| P3 | **`ImagePicker` en `src/components/ui/` es un componente que hace red**, y `ui/` hoy es presentación pura | Aceptado y anotado: hace la misma *I/O* que ya hacía `AdminProductsView`. La **validación** no se mueve al cliente (D2). Si molesta, se mueve a `src/components/forms/` |
| P4 | **Cambiar `storeImage()`**, que es la escritura en disco de **todo** el proyecto | Solo se le añade un parámetro con valor por defecto. Las 11 pruebas de `upload-validation` se verifican **sin modificarlas** |
| P5 | **La portada pasa a depender de la BD en dos sitios** (hero y categorías) | `readHeroImage()` y la consulta de categorías van dentro de `try/catch` con reserva. RF-13 y RF-29: un fallo de BD se ve como texto, nunca como una sección rota (R5) |
| P6 | **`MainLayout` tempted a volverse `async`** para pasar la info | **Prohibido**: R4. `/contacto` y `/novedades` se prerenderizan y ahí no hay `cookies()`. Toda lectura va en `page.tsx` |
| P7 | **Los recuentos de documentación mienten** si se cuentan antes de F9 | El recuento se hace en F9 leyendo la salida real, y la documentación en F10 |
| P8 | **`MEMORY.md` ya está en 100 líneas**, su tope | **No se le añade nada.** T10 lo recicla: lo que salga es una decisión de qué se borra |

## 12. Decisiones técnicas de este plan

**P1 — `storeImage` con parámetro de destino.** *Alternativa descartada:* duplicar la
función. *Coste aceptado:* un parámetro más en una función que ya era deliberadamente
pequeña.

**P2 — `target` en el `FormData`, con lista blanca.** *Alternativa descartada:* un
endpoint nuevo para el hero. *Coste aceptado:* un parámetro más en la superficie del
endpoint de subida, acotado a dos literales.

**P3 — El recorte a 4 y la derivación viven en el módulo puro, no en el JSX.**
*Alternativa descartada:* un `.slice(0, 4)` dentro de `Categories.tsx`. *Coste aceptado:*
un módulo más. A cambio, `RF-30` y `RF-32` tienen test.

**P4 — `id` fijo en 1 para el singleton, sin paso de siembra.** *Alternativa descartada:*
`upsert` por `where: { id: { equals: 1 } }` sobre una fila creada a mano, o un
`findFirst`. *Coste aceptado:* el `id` es una constante mágica en el código, documentada
en el propio `site-settings.ts` como `SINGLETON_ID`.

**P5 — `ImagePicker` en `src/components/ui/`.** *Alternativa descartada:* copiar el bloque
de subida en los dos formularios. *Coste aceptado:* `ui/` contiene un componente con
efectos y `fetch`. *Alternativa de segunda mano si molesta:* `src/components/forms/`.

**P6 — `AdminProductsView` no adopta `ImagePicker` en esta spec.** *Coste aceptado:* la
subida de imagen de producto sigue duplicada dentro de ese fichero. Es deuda a cambio de
un diff revisable.

## 13. Mapa de requisitos a fases

| Fase | Requisitos que cubre |
|---|---|
| F0 | — (solo deja los gates en verde y los números anotados) |
| F1 | `RF-12`, `RF-14`, `RF-15`, `RF-16`, `RF-25`, `RF-30`, `RF-32`, `RF-33`, `RF-34` |
| F2 | `RF-6`, `RF-7`, `RF-8` (escritura en disco de la carpeta nueva) |
| F3 | `RF-1` (el modelo que la sostiene) |
| F4 | `RF-1`, `RF-5`, `RF-10`, `RF-11`, `RF-12`, `RF-13`, `RF-40` |
| F5 | `RF-14`…`RF-22` |
| F6 | `RF-2`, `RF-3`, `RF-4`, `RF-5`, `RF-6`, `RF-7`, `RF-8`, `RF-9`, `RF-10`, `RF-35`, `RF-36`, `RF-38`, `RF-40` |
| F7 | `RF-22`, `RF-23`, `RF-26`…`RF-34` |
| F8 | `RF-37`, `RF-38`, `RF-39` |
| F9 | Todos, con V1–V17 |
| F10 | Ninguno: es documentación |

**`RF-24` (no hay borrado) no tiene fase**: se cumple por **ausencia**. T9 lo verifica
comprobando que en la interfaz no aparece ninguna acción de borrar y que no existe
ninguna ruta que borre una categoría.

## 14. Fuera de esta spec

- **Borrado de categorías** (`RF-24`): no lo pidió el usuario y hay productos asociados.
- **Editar el `slug`** (D13, `RF-25`): decisión cerrada del usuario, **no**.
- **Borrar ficheros huérfanos del disco** (D6, D7, R8): deuda anotada.
- **Adoptar `ImagePicker` en `AdminProductsView`** (§5.1): deuda anotada.
- **007 — crear administradores desde `/admin/usuarios`.** Siguiente en la lista del
  usuario, sin relación con esta.