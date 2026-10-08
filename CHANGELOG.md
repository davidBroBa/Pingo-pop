# Changelog

Todos los cambios relevantes de Pingo POP.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el
versionado es [SemVer](https://semver.org/lang/es/).

> **Reconstruido a mano.** Hasta el 2026-10-05 el proyecto **no tenía repositorio
> git** (`git status` → *not a git repository*), así que no había historial que
> extraer. Este changelog se escribió ese día reconstruyendo la historia desde
> `MEMORY.md`, `docs/` y `specs/001`, `specs/002`. Las fechas anteriores al
> 2026-10-05 son aproximadas (son las que declara cada documento). El repositorio
> se inicializó ese mismo día **sin ningún commit**, para poder auditar qué se
> publicaría; cuando haya historial, será la fuente de verdad y este fichero pasará
> a ser un resumen legible.

`package.json` está en `0.1.0` y `private: true`: la app **no se publica en npm**.

---

## [Sin publicar]

### Añadido

- **El icono del navegador es el logo de la empresa.** Se sirven `favicon.ico`, `icon.png`
  y `apple-icon.png` (iOS 180×180) generados desde `public/images/logo/logo.png` con un
  script versionado (`specs/012-favicon-404-registro/iconos.mjs`), en lugar del favicon
  por defecto de Vercel.
- **Página 404 a medida** (`src/app/not-found.tsx`) con el lenguaje cartoon del sitio
  (logo, badge "404 · Se fue de paseo", enlace "Volver a la tienda") y `noindex`.
- **El registro se ve como el resto del sitio.** `/registro` y su formulario usan el marco
  visual cartoon de `/login` (fondo `cartoon-cream`, tarjeta `cartoon-border
  cartoon-shadow`, inputs `rounded-2xl`, errores coral con `role="alert"`) y microcopy más
  amable, sin cambiar ni una línea de la lógica de alta.

### Arreglado

- **Cambiar la contraseña ahora cierra todas las sesiones, y se puede hacer.** Antes
  no había forma de cambiar la contraseña, y aunque la hubiera habido no habría servido
  de nada: la cookie de sesión solo llevaba `{userId, role, iat, exp}`, sin ningún
  identificador ni versión, así que **toda cookie firmada seguía siendo válida hasta 8
  horas** (`SESSION_TTL_MS`) por mucho que se cambiara la contraseña.
- **Existe una página de perfil** (`/perfil`). El campo `name` estaba en el modelo
  `User` desde la spec 001 y no se usaba en ningún sitio: ni se leía, ni se escribía,
  ni se mostraba.
- **Cualquier usuario puede cerrar sesión, no solo los administradores.** El botón
  estaba únicamente dentro del panel de administración, así que un `BUYER` tenía que
  borrar las cookies a mano.
- **Bajar el rol de un administrador le corta el acceso.** El rol se relee de la base de
  datos en lugar de fiarse del que dice la cookie, que seguía diciendo `ADMIN` hasta que
  caducaba.

- **Las imágenes de producto se ven en el sitio público.** Una imagen subida desde
  el panel se guardaba, se servía y se pintaba en `/admin/productos`, pero **ninguna de
  las cuatro vistas públicas la mostraba**: el catálogo (`/products`), los destacados de
  la portada, la ficha de producto (`/products/[slug]`) y los ítems del carrito de
  cotización (`/cotizacion`) tenían escrito un `<span>Pingo</span>` de relleno y nunca
  leían el campo `image`. El fallo no estaba en la subida, en la base de datos ni en la
  API: la ruta `/uploads/products/...` ya respondía `200 image/jpeg` y el campo `image`
  llegaba correcto al cliente; simplemente nadie lo renderizaba.
- **El `Pingo` de relleno se queda como reserva**, no se elimina: cinco de los seis
  productos del catálogo no tienen imagen, y quitarlo las habría dejado un hueco vacío.
  La comprobación es la misma que ya usaba el panel, `image !== null && image !== ""`,
  porque el esquema de validación normaliza la cadena vacía a `null`.
- **El carrito de cotización ahora sobrevive a una recarga y a un cierre del
  navegador** (spec `003-quote-cart-persistence`). Antes se leía de `localStorage`
  al arrancar pero **ningún camino de código escribía la clave**: la lectura era
  código muerto y cualquier recarga vaciaba el carrito.
- **El carrito se vacía cuando la solicitud de cotización se envía con éxito.**
  Sin esto, la persistencia habría convertido un F5 en un reenvío duplicado de la
  misma cotización, que el administrador no puede distinguir de una nueva.
- **Lo que hay en `localStorage` se valida con un esquema Zod antes de entrar en el
  estado.** La lectura anterior era `JSON.parse(storedCart) as QuoteCartItem[]`, una
  conversión forzada a ciegas. Era inofensiva solo porque nada escribía; al
  persistir, un `{"a":1}` en la clave provocaba un `TypeError` en `/cotizacion`, y
  un `price: "abc"` pintaba `NaN MXN`. Los límites coinciden con los del servidor
  (cantidad 1–10000, máximo 50 productos), más un tope de 64 KiB antes de analizar
  el texto.
- Un `localStorage` corrupto, enorme, de una versión anterior o manipulado a mano ya
  no puede dejar la página sin servir: se descarta entero, se borra la entrada y el
  carrito empieza vacío.
- Si el navegador no deja escribir (modo privado, cuota llena, almacenamiento
  deshabilitado por política), la web sigue funcionando solo en memoria, en lugar
  de romperse.
- **`/cotizacion` ya no registra un error de hidratación cuando el navegador tiene
  un carrito guardado.** La carga del carrito estaba en el inicializador de
  `useState`, que corre tanto en el servidor como en el cliente: el HTML
  prerenderizado salía con el carrito vacío y la hidratación llegaba con el real,
  así que React **descartaba ese subárbol y lo volvía a pintar**. Ahora la carga
  ocurre en un efecto de montaje, de modo que la primera hidratación coincide con
  el HTML ya enviado. Sigue habiendo un fotograma con el mensaje de carrito vacío
  antes de que aparezca el real: es intrínseco a que los datos vivan en el
  navegador, y `useSyncExternalStore` tampoco lo evitaría. Lo que se elimina es la
  excepción y el repintado completo.

### Añadido

- **Siete documentos legales públicos** (spec `009-legal-compliance-privacy`): términos,
  aviso de privacidad, política de cookies, envíos, cambios y devoluciones, información
  legal y accesibilidad. Cada uno con versión, huella y fecha; ningún texto declara
  cumplimiento de una norma, nombra un proveedor inexistente ni promete plazos que el
  sistema no tiene. La política de cookies usa los mismos nombres de tecnología que el
  código (`pp_session`, `pingo-quote-cart`), con aviso explícito de que la IP no se
  persiste. Página `/accesibilidad` que explica el estándar objetivo y cómo reportar
  fallos (RF-29/30/31). Datos del propietario interpolados con tokens, no escritos a
  mano.
- **Panel de preferencias de cookies, a demanda** (RF-15 a RF-18, D14):
  **no hay banner automático**. El enlace "Preferencias de cookies" está siempre
  visible en el pie y el panel solo se abre por acción del usuario; abrirlo no
  escribe nada en `localStorage` (las tres vías solo guardan si se elige, y con
  confirmación al cambiar una decisión). El panel es un diálogo modal accesible:
  `role="dialog"` + `aria-modal`, foco inicial, Escape para cerrar y retorno de
  foco al enlace que lo abrió.
- **Rate limit en lecturas públicas** (RF-33): `GET /api/products` y
  `GET /api/categories` limitados a **120 peticiones por ventana e IP** — tope
  explícito, más alto que el límite por defecto, para que la vista de
  administración que refresca datos no se auto-bloquee. Superado el cupo:
  `429` con `retry-after` y cabeceras de límite (RF-32).
- **Auditoría de accesibilidad** (`docs/ACCESSIBILITY.md`): skip-link
  "Saltar al contenido" en `MainLayout` (WCAG 2.4.1), Escape y retorno de foco
  del panel de consentimiento (patrón de diálogo APG), contraste del botón
  "Elegir archivo" del panel de productos. Sin claim de conformidad AA; los
  hallazgos pendientes (hover `text-accent`, focus trap completo) quedan
  documentados con su gravedad.

- **El administrador puede subir la foto del hero** (spec `008-site-and-category-images`).
  Estaba escrito a mano en el componente (`Hero.tsx`), sin ninguna prop: la foto
  **no existía como concepto** en el proyecto, porque `schema.prisma` no tenía
  dónde guardarla. Ahora hay un modelo `SiteSettings` de **una sola fila** (`id`
  fijo a 1) y una página nueva, `/admin/apariencia`. El `Pingo` se queda como
  **reserva**: si no hay foto, o si la base de datos se cae al leerla, la portada
  se sigue viendo bien. Un ajuste del sitio no puede dejar la web sin pintar.
- **El administrador puede subir una foto por categoría**, y **editar** las
  categorías. Antes `/api/categories` solo tenía `GET` y `POST`: **una categoría
  creada no se podía volver a tocar jamás**. El campo `Category.image` existía en
  la base de datos desde la spec 001 y no lo usaba absolutamente nadie. Ahora hay
  listado con edición en línea, y `PATCH /api/categories/[id]`.
- **Las categorías de la portada salen de la base de datos.** El componente las
  tenía escritas a mano en un array literal, así que aunque se subiera una foto no
  se vería en ningún sitio. Ahora es data-driven, y conserva el texto actual como
  **reserva** si no hay ninguna categoría: la portada nunca se ve rota por un
  problema de datos.
- **`/admin/categorias` ya se puede abrir.** No tenía **ni un enlace entrante**: el
  navbar no enlaza a ninguna ruta de administración, así que esa pantalla solo se
  alcanzaba escribiendo la URL a mano. Una página a la que no se puede llegar no
  existe para quien tiene que usarla. Las tres páginas de administración ahora
  comparten navegación.
- **Un único endpoint de subida con destino.** `POST /api/admin/upload` acepta un
  campo `target` que se contrasta contra un registro congelado de dos destinos.
  Se prefirió un parámetro a un endpoint por carpeta para que la frontera de
  seguridad (quién sube, qué se acepta, cómo se nombra el fichero) quede en un
  solo sitio, y para que los formularios de producto no cambien ni una línea.
- `src/lib/site-settings.ts`: `readHeroImage()` (tolerante a fallos) y
  `writeHeroImage()` por `upsert` sobre `id = 1`. **No hay paso de siembra**, que
  era justo el paso que se podía olvidar.
- `src/lib/category-card-props.ts`: número y color de las tarjetas **derivados, no
  guardados**, más el recorte a 4. Puro y con 19 pruebas.
- `src/app/admin/AdminNavLinks.tsx` y `src/components/ui/ImagePicker/`.
- `siteImagePath` en `src/lib/validation.ts`: esquema **aparte** de `imagePath`,
  con su propia regex. Acepta la cadena vacía igual que el otro, y un test
  comprueba que los dos se comportan idéntico en la ausencia.
- `UpdateCategorySchema`, **sin `slug`**: es la URL pública y cambiarla dejaría
  enlaces muertos sin avisar.
- `src/lib/quote-cart-storage.ts`: esquema, `parseStoredCart`, `serializeCart` y la
  clave. **Va sin DOM a propósito**, porque el runner de tests (`node:test`) no tiene
  jsdom: la lógica comprobable tiene que poder vivir fuera del componente de React.
- `tests/quote-cart-storage.test.ts`: 25 casos (JSON corrupto, no-array, campos
  ausentes, cantidad 0/negativa/decimal/10001, 51 productos, precio no numérico,
  nombres con caracteres de control, ruta de imagen externa, entrada de 70 000
  caracteres, e ida y vuelta de la serialización).
- `docs/THREATS.md` gana la sección **A5** sobre el carrito guardado en el
  navegador, con la conclusión de que manipular el carrito tiene **impacto nulo**:
  el servidor solo acepta `productId` y `quantity` y los revalida.
- **Dos políticas de contraseña, según el rol.** Un `BUYER` necesita 8 caracteres o
  más, sin exigir mayúsculas, minúsculas, dígitos ni signos de puntuación: obligar a
  un cliente que quiere un pin de 8 dígitos a inventar una mayúscula y un símbolo no
  aporta seguridad. Un `ADMIN` sí necesita 12
  caracteres con mayúscula, minúscula, dígito y un signo de puntuación.
  El suelo común de 8 no baja porque `LoginSchema` ya rechazaba menos.
- `src/lib/account-schema.ts`: módulo **puro** (sin DOM, sin base de datos) con las dos
  políticas y los esquemas de cuenta. Vive aparte del componente por la misma razón que
  `quote-cart-storage.ts`: el runner es `node:test` **sin jsdom**, así que lo comprobable
  tiene que poder vivir fuera de React.
- `/perfil` muestra, **solo para ADMIN**, un bloque con datos que un usuario normal no
  ve: id interno, rol, fecha de alta, última modificación y los datos de la sesión
  actual. El hash de la contraseña no sale nunca en el `select`.
- `tests/account-schema.test.ts` (33 casos) y `tests/session-revocation.test.ts`
  (6 casos), y 5 casos nuevos en `tests/session-token.test.ts`.

### Cambiado

- `src/lib/validation.ts` exporta `shortText`, `slugText` e `imagePath` (tres
  palabras, sin cambio de comportamiento). El carrito los **reutiliza** en vez de
  duplicar la expresión regular de la ruta de imagen, que es una regla de seguridad
  y no debe poder divergir de la del panel.
- El tipo `QuoteCartItem` **se infiere del esquema** en lugar de declararse aparte,
  para que la definición y la validación no puedan separarse.

### Corregido de paso, sin alcance propio

Nada: los dos problemas que aparecieron al verificar esta spec y **no** eran
consecuencia de ella (el formulario devuelve **400 si el email opcional se deja
vacío**, y dos pulsaciones rápidas de "+" solo suman 1) están **documentados y
sin arreglar**. Cada uno necesita su propia spec. El tercero, el error de
hidratación de `/cotizacion`, sí lo causó esta spec y quedó arreglado en T9.

### Documentación
- **`README.md` reescrito por completo.** Estaba tal cual salió de
  `create-next-app` (en inglés, hablando de Geist y de Vercel): no describía el
  proyecto, ni cómo levantarlo, ni los gates, ni el modelo de seguridad.
- **`CHANGELOG.md`** (este fichero).
- **`docs/DEPLOY.md`**: runbook del despliegue al servidor, con los comandos que
  funcionaron y los que fallaron.
- **`docs/PUBLICAR.md`**: lista de comprobación **antes de publicar el
  repositorio**, con el barrido de secretos y la lista de ficheros que parecen
  secretos pero no lo son.
- `MEMORY.md`, `AGENTS.md` y `docs/AI.md` actualizados con el estado real.
- `docs/DESIGN.md` enlaza con las capturas del rediseño.

### Higiene del repositorio
- `.gitignore` reforzado: se ignoran `docker-compose.override.yml` (mapeo local
  del puerto 3307, no debe viajar), `.opencode/`, `*.tgz`, `*.tar.gz`, `*.pid`,
  `*.log` y `Thumbs.db`.
- Barrido de secretos sobre todo lo publicable: los **7 valores reales** de `.env`
  se buscaron literalmente en cada fichero (sin imprimir ninguno) y **no aparecen
  en ningún fichero versionable**. Ver `docs/PUBLICAR.md`.
- Fuera de los ficheros publicables: **IP del servidor, nombre de usuario del
  servidor** y rutas home absolutas. Se usa el alias `srv`. Añadida la regla en
  `AGENTS.md`.
- Confirmado que las 9 capturas de `docs/capturas/002-cartoon-visual/` solo
  contienen **catálogo de demostración** (nombres y precios de productos de
  ejemplo). Ni credenciales ni datos de clientes. Añadida la prohibición de
  capturar `/admin/*` o una sesión iniciada.
- `git init` y **primer commit `bf52fa4`**, publicado en
  `github.com/davidBroBa/Pingo-pop` (rama `main`). Entraron **155 ficheros**, con
  `.env`, `src/generated/prisma/`, `node_modules/`, `.next/` y las imágenes
  subidas fuera. Comprobado contra la API de GitHub: `.env`, `.env.local`,
  `docker-compose.override.yml` y los ficheros generados devuelven **404**, y
  `.env.example`, `README.md`, `CHANGELOG.md`, `docs/PUBLICAR.md`, `docs/DEPLOY.md`
  y `prisma/schema.prisma` devuelven **200**.
- El remoto ya tenía una versión antigua del proyecto (rama `main`, commit
  `691d142`, septiembre 2026) **sin historial en común** con este. Antes de
  reemplazarla se subió la etiqueta **`backup-691d142`**, que deja aquel commit
  alcanzable, así el reemplazo quedó siendo reversible. El push fue
  `+ 691d142...bf52fa4 main -> main (forced update)`, autorizado expresamente.
- El repositorio es **público**: a partir de aquí nada secreto debe entrar en el
  historial. Un commit siempre se puede deshacer, pero lo ya subido queda legible
  para cualquiera. Por eso el barrido de secretos es obligatorio antes de **cada**
  commit, no solo antes del primero.

---

## [0.2.0] - 2026-10-05 — Rediseño visual cartoon (spec `002-cartoon-visual`)

spec completa en `specs/002-cartoon-visual/`. **Desplegada en producción** y
verificada contra el servidor, no solo en local.

### Añadido
- **Extensión de paleta** de 6 colores de apoyo: rosa `#FF6B9D`, cielo `#4FC3F7`,
  menta `#4ADE80`, lavanda `#A78BFA`, coral `#F87171`, crema `#FFF4D6`. El **núcleo
  de marca no se altera**. `docs/DESIGN.md` pasa a ser la **única fuente de verdad**
  de la paleta.
- **Tokens y utilidades cartoon** en `src/app/globals.css`: `--cartoon-*` y 7
  clases (`.cartoon-border`, `.cartoon-border-thick`, `.cartoon-shadow`,
  `.cartoon-shadow-sm`, `.cartoon-shadow-lg`, `.cartoon-hover`, `.cartoon-focus`).
  Se aplican desde los componentes base vía `cva`, de modo que **las 15 rutas
  heredan** el lenguaje visual sin repetir clases.
- **Tipografía de display**: Fredoka en `h1`–`h4`, Manrope en cuerpo.
- `Badge` gana variantes `pink`, `sky`, `mint` y `lavender`.
- SVG decorativos inline en el `Hero` (estrella, trazo ondulado) y color de acento
  por categoría en la rejilla de categorías.
- Capturas del antes/después y una de producción en
  `docs/capturas/002-cartoon-visual/`.

### Corregido
- **Ninguna fuente se aplicaba en toda la web.** `--font-heading` y `--font-body`
  se declaraban en `:root` pero apuntaban a `--font-fredoka`/`--font-manrope`, que
  `next/font` definía en `<body>`. Las propiedades personalizadas heredan hacia
  abajo, así que en `:root` eran inválidas y todo el sitio usaba la fuente por
  defecto del navegador, pese a tener Fredoka cargada. Las clases `variable` de
  `next/font` se movieron al `<html>`.
- `prefers-reduced-motion` no frenaba los stickers: Tailwind 4 rota con las
  propiedades `rotate`/`scale`/`translate` en lugar de `transform`. El bloque global
  las neutraliza ahora con `!important`.
- Errores de formulario en `red-50`/`red-600`: colores fuera de la paleta y por
  debajo de 4.5:1. Ahora son un sticker **coral con texto en tinta** (5.60:1).
- Interactivos sin foco visible (botones de cantidad, "Vaciar cotización",
  "Eliminar", flechas de producto).
- `src/config/theme.ts` tenía hexadecimales de una paleta vieja que contradecía la
  documentada. Se alinearon; **el archivo no se borró** (está muerto, nadie lo
  importa, y no se tocan ficheros ajenos sin pedirlo).

### Cambiado
- `Navbar`: borde inferior de tinta de 2 px, sin desenfoque, y acceso visible a
  `/login`.
- `Hero`: fondo crema y títulos en Fredoka.

### Decisiones que obligan a quien siga
- **Contraste medido, no supuesto.** Blanco sobre rosa da 2.68:1 y sobre coral
  2.77:1 → **prohibido**. El texto sobre colores de la extensión es siempre tinta.
  Tabla completa en `docs/DESIGN.md`.
- La regla de "paleta sagrada" de `AGENTS.md` y `docs/constitution.md` fue
  sustituida, **con autorización expresa del usuario**, por "núcleo intacto +
  extensión documentada en `docs/DESIGN.md`".
- **Cero dependencias nuevas.** Solo CSS y SVG inline.

### Sin cambios (deliberado)
- Requisito RF-9: esta spec **no toca lógica, rutas API, autenticación, middleware,
  validación Zod, subidas, Prisma, seeds ni los tests existentes**.
- Bug preexistente detectado y **no arreglado**: `src/context/QuoteCartContext.tsx`
  lee `localStorage` pero nunca escribe, así que el carrito de cotización se pierde
  al recargar. Es funcional y requiere su propia spec.

---

## [0.1.0] - 2026-10-03 — Rework: roles, auth hasheada y subida segura

spec completa en `specs/001-pingo-rework/`.

### Añadido
- **Roles**: enum `Role` (BUYER, ADMIN) y modelo `User` en Prisma.
- **Autenticación**: argon2id para contraseñas, `zod` en el borde, cookie
  `pp_session` firmada con **HMAC-SHA256** (formato `payload.base64url(hmac)`), que
  un atacante no puede forjar. Antes era base64 sin firma.
- `requireAdmin()` en servidor además del middleware: **defence in depth**. Una
  llamada directa a la API no depende de la redirección del navegador.
- **Subida de imágenes endurecida**: validación por **magic bytes** (no basta el
  `Content-Type`), máximo 5 MiB, lista blanca de extensiones, nombre
  `randomBytes(16).hex`, escritura atómica con `flag: "wx"` y validación de ruta con
  regex estricta.
- **Rate limit** en memoria y cabeceras de seguridad, incluida CSP que solo permite
  `unsafe-eval` en desarrollo.
- **Sin enumeración de cuentas**: email inexistente y contraseña incorrecta
  devuelven el mismo `401`; se verifica argon2 contra un hash señuelo para igualar
  el tiempo de respuesta.
- **`npm run check`**: `typecheck && lint && test && build`. El script no existía
  aunque la documentación lo exigía.
- `docker-compose.yml`, `scripts/dev-up.cmd` / `.ps1` para levantar el entorno local
  en orden, y `.env.example` documentando todas las variables.
- Documentación nueva: `docs/SDD.md`, `docs/THREATS.md` (STRIDE + Top 10 de OWASP),
  `docs/GATES.md`, `docs/constitution.md`, `docs/AI.md`.

### Corregido
- **Casing de tabla** `QuoteRequest` (antes `quoterequest`): MariaDB en Linux con
  `lower_case_table_names=0` distingue mayúsculas y la migración fallaba al
  desplegar en el servidor.
- Errores de Prisma traducidos a códigos honestos (`P2002`→409, `P2025`→404...) en
  lugar de 500 falsos por datos de entrada incorrectos.
- `imagePath` vacío o con espacios se normaliza a `null` en Zod, para que el
  formulario no devolviera 400.

### Verificación
- Gates en verde: typecheck, lint, tests (65/65 en el cierre de esta spec; **82/82
  en la 10 suites actuales**) y build con 15 rutas.
- Recorrido completo verificado en vivo con base de datos real: login, roles,
  subida de ficheros (PNG real aceptado, HTML disfrazado de JPEG rechazado con
  415), borrado y creación de productos, migraciones y seed.

### Pendiente entonces, pendiente ahora
- Rate limit solo en memoria: no funciona con varias instancias.
- Sin registro de auditoría ni limpieza de imágenes huérfanas.
- `npm audit`: 8 vulnerabilidades altas, todas en herramientas de desarrollo, sin
  parche disponible. Ver `docs/GATES.md` y `docs/THREATS.md` §8.
- T7 y T10 de `specs/001-pingo-rework/tasks.md` siguen marcadas como parciales:
  el flujo de compra completo se verificó en local pero el despliegue de la spec 001
  se cerró junto con la 002.