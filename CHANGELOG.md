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

### Arreglado

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