# MEMORY.md — Pingo POP

## Estado actual (Octubre 2026)
- **Fase:** Spec 003 `quote-cart-persistence` **CERRADA**: T1–T8 completadas y verificadas. **Sin commitear y sin desplegar.**
- Spec 002 `cartoon-visual` **cerrada** y desplegada en producción.
- Spec 001 `001-pingo-rework` (roles BUYER/ADMIN, subida segura de imágenes, HMAC en sesiones, modelo de amenazas, OWASP) — cerrada
- **Tests:** **107/107** (13 suites). Los 82 originales intactos + 25 nuevos de `quote-cart-storage`.
- **Spec 002:** `002-cartoon-visual` — rediseño visual cartoon/sticker, **sin tocar lógica, APIs, auth, uploads ni tests**
- **Gates:** typecheck OK, lint OK, tests OK, build OK (15 rutas)
- **Migraciones:** aplicadas en MariaDB 11 (Linux). Migración `quote_cart` corregida en mayúsculas (`QuoteRequest`) para compatibilidad con `lower_case_table_names=0`
- **Seguridad:** cookie firmada con HMAC-SHA256 (formato `payload.base64url(hmac)`) en `pp_session`, middleware protege `/admin/*`, `requireAdmin()` revalida rol en servidor, rate limit en memoria (login 10/15m, quotes 5/15m), subida con magic bytes + lista blanca + nombre aleatorio + escritura atómica (`wx`), sin enumeración de usuarios
- **Verificación E2E (5 oct 2026, local Windows + Docker MariaDB 11 en 3307):** rutas públicas 7×200, `/admin` sin sesión 307→`/login`, API sin cookie 401, cookie falsificada 401, BUYER login OK pero `/admin`→`/` y escritura 403, ADMIN login + panel 200 + crear/borrar producto 201/200, upload HTML-disfrazado 415 y PNG real 201, migraciones `deploy` OK, seed OK (hash argon2id verificado en BD)
- **Verificación visual spec 002 (5 oct 2026, navegador sobre dev local):** las 6 rutas públicas dan 200 y las 2 de admin 307 sin sesión / 200 con sesión ADMIN. Barrido por DOM: contorno de tinta y sombra dura presentes en las 6 rutas, `h1` en Fredoka en las 6, **0 interactivos sin `cartoon-focus`**, SVGs decorativos 19/19 con `aria-hidden`. Login con clave incorrecta → 401 y sticker coral con texto en tinta (contraste 5.60:1). Admin autenticado: 27 `cartoon-border` en productos, 7 en categorías, 0 restos de `red-*`/`green-*`. Barrido de hex en `src/**`: ninguno fuera de `docs/DESIGN.md`.
- **Verificación spec 002 en producción (5 oct 2026, vía túnel `ssh -L 3001:localhost:3000 srv`):** `<html>` lleva las variables de `next/font` (`fredoka_..._variable`, `manrope_..._variable`); el CSS servido (`/_next/static/chunks/0bsh-3c0cb00a.css`) contiene las 7 utilidades `.cartoon-*` y los 6 hex `--cartoon-*`; `h1` computado en **Fredoka 700**, body en Manrope, hero `rgb(255,244,214)`, borde `2px rgb(42,34,39)`, sombra `2px 2px` tinta, 19/19 SVG `aria-hidden`, 0 interactivos sin `cartoon-focus`. Rutas públicas 200; `/admin/*` **307** sin sesión. Auth sin regresión: login correcto 200, contraseña incorrecta **401**, usuario inexistente **401** (mismo código → sin enumeración), cookie `pp_session` con `HttpOnly`, `Secure`, `SameSite`. Capturas en `docs/capturas/002-cartoon-visual/{antes,despues,produccion}/` (9 PNG, 1,0 MB).
- **Higiene de publicación (5 oct 2026):** barrido de secretos ejecutado — los 7 valores reales de `.env` buscados literalmente en todos los ficheros publicables, **sin imprimir ninguno**: no aparecen en ningún sitio salvo `MARIADB_DATABASE` (`pingo_pop`) y `ADMIN_EMAIL` (`admin@pingo-pop.local`, dominio reservado inexistente), que además ya están en el código. `git init` ejecutado **sin commits, sin add y sin remoto**: `git status --porcelain -uall` da **155 ficheros** publicables, con 0 de `src/generated/prisma`, 0 de `node_modules`/`.next`, 0 imágenes reales en `public/uploads/products/` y `.env` ausente. Gates tras la documentación: typecheck OK, lint OK, **82/82 tests**, build OK (15 rutas). Checklist en `docs/PUBLICAR.md`.

## Decisiones tomadas (con su porqué)
- **Sesión con HMAC-SHA256** (sustituye a base64 sin firma): las cookies no se pueden falsificar. Ver `src/lib/auth/session-token.ts`. Se firmó el payload (userId, role, iat, exp).
- **Defence in depth**: middleware redirige navegadores; `requireAdmin()` devuelve 401/403 explícito en cada route handler (una llamada directa a la API evita caché/middleware). Evita bypass accidental.
- **Sin enumeración**: ante email inexistente o contraseña incorrecta → **mismo 401**. Se usa `DUMMY_HASH` y `argon2.verify()` contra él para igualar el tiempo de respuesta.
- **Rate limit en memoria**: no distribuido (single-node). Documentado como limitación conocida. API pública (`/api/quotes`) y login protegidos.
- **Paleta: núcleo intacto + extensión cartoon** (spec 002, sustituye a la antigua "paleta sagrada"). El núcleo `#F7B92C` / `#2A2227` / `#707070` / `#ECECEC` / `#FAFAFA` / `#fcfcfc` / `#ffffff` **no se altera**. Se añade la extensión (`#FF6B9D` rosa, `#4FC3F7` cielo, `#4ADE80` menta, `#A78BFA` lavanda, `#F87171` coral, `#FFF4D6` crema) documentada en `docs/DESIGN.md`, que es la **única fuente de verdad**: prohibido inventar hex fuera de ahí. Autorizado expresamente por el usuario; regla replicada en `AGENTS.md` y `docs/constitution.md`.
- **Contraste medido, no supuesto** (T3): tinta sobre ámbar 8.79:1, rosa 5.78, cielo 7.73, menta 8.88, lavanda 5.69, coral 5.60, crema 14.13. **Blanco sobre rosa/coral da 2.7:1 → prohibido**: el texto sobre colores de extensión es siempre tinta. Por eso los errores son un sticker **coral con texto en tinta**, no texto rojo (Tailwind `red-50`/`red-600` eliminados: no estaban en la paleta y no llegaban a 4.5:1).
- **Sin `server-only` en ningún módulo**: el paquete no está en deps y no se instala. En Oct 2026 se eliminaron los `import "server-only"` de `env.ts`, `prisma.ts`, `upload.ts`, `session.ts` y `require-admin.ts` (drift respecto a esta decisión). La separación servidor/cliente se mantiene por arquitectura: esos módulos solo se importan desde route handlers / server components, y `session.ts`/`require-admin.ts` ya dependen de `next/headers` y `next/server`. `password.ts` nunca lo tuvo porque lo importa `prisma/seed.ts` vía `tsx`.
- **`npm run check` existe**: el script faltaba en `package.json` aunque este AGENTS.md lo exigía; se añadió (`typecheck && lint && test && build`).
- **`.env.example` documenta las vars de Docker**: faltaban `MARIADB_ROOT_PASSWORD`, `MARIADB_DATABASE`, `DB_USER`, `DB_PASSWORD`; sin ellas `docker compose` no arrancaba desde la plantilla.
- **Windows local con MySQL propio en 3306**: `docker-compose.override.yml` (NO se sube al servidor) mapea `127.0.0.1:3307:3306` con `!override`, y el `.env` local apunta a 3307. En el servidor el 3306 está libre y no hace falta override.
- **CSP: `unsafe-eval` solo en desarrollo**: React en modo dev necesita `eval()` (depuración); en producción nunca lo usa. `next.config.ts` añade `'unsafe-eval'` a `script-src` solo si `NODE_ENV !== "production"`. La CSP de producción queda byte a byte igual que antes.
- **Arranque local tras reiniciar el PC**: nada se levanta solo (Docker Desktop, `pingo-db` y Next mueren al apagar). `scripts/dev-up.cmd` (doble clic) los levanta en orden esperando a cada uno: motor Docker → `docker compose up -d` → `pingo-db` healthy → `npm run dev`. Orden importante: si Next arranca antes que MariaDB, el pool de Prisma nace roto y las páginas con BD dan 500 hasta reiniciar Next.
- **Login visible en el Navbar**: `/login` existía pero no tenía entrada en la UI. Se añadió enlace "Iniciar sesión" (icono `LogIn` de lucide) junto al botón "Mi cotización" en `Navbar.tsx`. Enlace estático: el Navbar es server component y no se hizo session-aware para no forzar dinámico el layout raíz. Ojo: la config de navegación real es `src/constants/navigation.ts`; `src/config/navigation.ts` es código muerto con rutas inexistentes (`/tienda`, `/nosotros`).
- **Estructura normalizada (5 oct 2026)**: `constitution.md` movido de raíz a `docs/constitution.md` (ningún archivo lo referenciaba por ruta; solo su propio título). Creados `.opencode/` y `.agents/` (con `.gitkeep`; `/.agents` ya estaba en `.gitignore`). Estructura final: `AGENTS.md`+`MEMORY.md` en raíz, `docs/`, `specs/NNN-nombre/{spec,plan,tasks}.md`, `tests/`, código en `src/`+`prisma/`+`public/`+`scripts/`.
- **Nombre oficial: Pingo POP**. Corregidas las grafías "Poingo"/"Pingo-pop" en docs, specs (dir renombrado a `001-pingo-rework`), `site.ts`, títulos y `alt` del logo. Se mantienen identificadores técnicos: package `pingo-pop` (npm exige minúsculas), BD `pingo_pop`, contenedor `pingo-db`, cookie `pp_session`, emails `@pingo-pop.local`, localStorage `pingo-quote-cart`.
- **Spec 002 cartoon-visual**: aprobada por el usuario ("tal cual"). Fredoka (ya cargada) = display cartoon; Manrope en cuerpo. Cero dependencias nuevas: CSS + SVG inline (React Bits queda como referencia, no dependencia). Recursos de la colección usados: ui-ux-pro-max (#30, instalada; su dataset confirma Fredoka como display playful), anti-slop (#31/#32/#37), DESIGN.md spec (#38/#39).
- **Bug de fuentes encontrado y corregido (spec 002)**: `--font-heading`/`--font-body` se declaraban en `:root` apuntando a `--font-fredoka`/`--font-manrope`, que `next/font` definía en `<body>`. Las propiedades personalizadas heredan **hacia abajo**, así que en `:root` eran inválidas y **toda la web usaba la fuente por defecto del navegador** (Fredoka nunca se aplicó, pese a estar cargada). Arreglo: las clases `variable` de `next/font` van al `<html>`. Lección: al mapear tokens de fuente, el origen debe estar en un ancestro del consumidor.
- **Cartoon = utilidades CSS en `globals.css`, no clases sueltas**: `.cartoon-border`, `.cartoon-border-thick`, `.cartoon-shadow{,-sm,-lg}`, `.cartoon-hover` (squishy), `.cartoon-focus` (anillo ámbar). Se aplican desde los componentes base (`Button`, `Card`, `Input`, `Badge` vía `cva`) y las 15 rutas heredan. Máximo 1 color de apoyo por componente: cartoon, no payaso.
- **`prefers-reduced-motion` cubre `rotate`/`scale`/`translate`**: Tailwind 4 usa esas propiedades en vez de `transform`, así que el bloque global las neutraliza con `!important` además de `transform: none` en `.cartoon-hover`. Sin eso los stickers seguían girando.
- **Foco visible en todos los interactivos (RF-4)**: barrido automático por DOM; los botones de cantidad, "Vaciar cotización", "Eliminar" y las flechas de producto estaban sin `cartoon-focus`. Corregidos; el sweep devuelve 0 sin foco en las 6 rutas públicas.
- **`src/config/theme.ts` es código muerto** con una paleta vieja (`#1D1A1D`, `#F08C46`, `#F5C84C`, `#FAFAF8`) que contradecía la paleta documentada. **No se borró** (no se tocan archivos no relacionados sin preguntar): sus hex se alinearon con el núcleo y lleva un comentario declarando que la fuente de verdad es `docs/DESIGN.md`.
- **`force-dynamic` solo en `page.tsx`**: aplicado en `/`, `/products`, `/products/[slug]`. No en componentes hijos (no tiene efecto). Rutas `/admin/*` dinámicas para no permitir caché que salte el middleware.
- **Zod en el borde** + validación de `imagePath` con regex estricta (`^/uploads/products/[a-f0-9]{32}\.(jpg|png|webp)$`). Cadena vacía en `image` tratada como `null` (preprocess) para que el formulario (`image: ""`) funcione.
- **Mapping de errores Prisma** (`src/lib/prisma-error.ts`): traduce códigos conocidos (`P2002→409`, `P2003/P2014→422`, `P2025→404`, desconocidos→400) evitando 500 falsos por errores de entrada. Fallos reales → 500 + log.
- **DB sobre Linux**: se corrigió casing de `quote_cart` (`quoterequest` → `QuoteRequest`) por `lower_case_table_names=0`. Migración `add_user_role` generada por diff de schemas (sin shadow DB innecesario).
- **Secrets en `.env`** generado en servidor, **nunca** impreso; permisos `600`. `.env.example` versionado, `.env*` ignorado.

## Aprendizajes
- **Windows vs Linux (MySQL/MariaDB)**: casing de nombres de tabla rompe migraciones si se desarrolló en Windows (`lower_case_table_names=1`). Se corrigió en la migración histórica y se documenta.
- **Prisma 7 + shadow DB**: `migrate diff --from-schema/--to-schema` no necesita base de datos (útil para generar migración tras añadir User sin elevar privilegios). `migrate dev` sí necesita shadow DB.
- **Comandos de shell en PowerShell**: `$HOME` y comillas, `bg`/`-Project` del wrapper `srv.ps1` tienen trampas (`~` entre comillas, `cd $HOME` sin expandir). Mejor usar rutas absolutas y `exec` con timeout largo.
- **`JSON.stringify` conserva `""`**: `image: ""` no es `undefined`. Preprocess en Zod para normalizar a ausencia.
- **415 vs 400**: la validación de **tipo MIME/magic bytes** (upload) es correcta devolver `415 Unsupported Media Type`. Zod devuelve `400` para formato inválido de ruta.
- **Arrancar producción por SSH sin que el wrapper cuelgue**: `srv.ps1 exec` con `setsid nohup npm run start &` **sí** deja el proceso vivo (el `setsid` lo desancla), pero el wrapper se queda esperando el canal SSH y **aborta a los 180 s** marcando error. El proceso sobrevive: hay que re-preguntar por `pgrep -af next-server` y el log en vez de asumir que el arranque falló. Desplegar no es idempotente si no se comprueba antes: primero `pgrep`, luego `kill`, luego arrancar.
- **Producción del servidor no es accesible desde este PC**: el puerto 3000 del servidor está cerrado por firewall. Se llega con `ssh -N -L 3001:localhost:3000 srv` y se navega por `http://localhost:3001`. La IP y el usuario del servidor **no se documentan en ficheros publicables** (ver `docs/PUBLICAR.md`): el alias `srv` de `~/.ssh/config` es la referencia. El túnel también sirve para capturar el estado **anterior** de un despliegue: la copia del servidor conserva el código viejo hasta que se sincroniza.
- **Documentación de referencia (5 oct 2026)**: `README.md` reescrito (estaba el de `create-next-app`, en inglés y hablando de Geist/Vercel), `CHANGELOG.md` nuevo, `docs/DEPLOY.md` (runbook con los errores reales del despliegue) y `docs/PUBLICAR.md` (checklist de publicación + barrido de secretos). `.gitignore` reforzado: `docker-compose.override.yml`, `.opencode/`, `*.tgz`, `*.tar.gz`, `*.pid`, `*.log`, `Thumbs.db`.

## Próximos pasos
1. **Spec 003 sin commitear ni desplegar**: hay 5 ficheros modificados y 3 nuevos. Commit y subida al servidor requieren permiso explícito.
2. **Spec para H1** (`email: ""` → 400 en el formulario de cotización). Es el hallazgo más grave: una vía de negocio rota en producción. Probablemente un `preprocess` como el de `imagePath`.
3. **Spec para H2** (el carrito vacío se ve un instante al recargar, por el prerenderizado estático).
4. Instalar el bloqueo de gates (`scripts/install-hooks.ps1 -VendorGates` de la skill `proyecto-estandar`). **Pendiente de tu decisión:** hoy `.git/hooks/` está vacío, así que un commit se salta cualquier verificación, y el repo ya es público. También queda el CI (`.github/workflows/gates.yml`).
5. Cerrar T7/T10 en `specs/001-pingo-rework/tasks.md` (estado final)
6. Decidir qué hacer con `prisma/make-buyer.ts`: su `BUYER_PASSWORD` fija en el código es una credencial de pruebas que los escáneres de secretos señalan. Inofensiva (base de datos local), pero se puede leer de `.env`.
7. (Opcional) Añadir `engines` a `package.json`: Next 16 exige Node 20.9+ y ahora nadie avisa si usas una versión antigua.
8. (Opcional, no bloquea) `.gitkeep` en `public/uploads/products/` o monitor de disco
9. (Opcional) Decidir si se borran las 2 filas `QuoteRequest` de prueba de la BD local.

## Spec 003 — `quote-cart-persistence` (CERRADA, sin commitear)

**Ficheros:** `specs/003-quote-cart-persistence/{spec.md,plan.md,tasks.md}`.
T1–T8 cerradas con sus notas de verificación. **Cero dependencias. Sin desplegar.**

**Qué se hizo:** el carrito de cotización se guarda en `localStorage` (`pingo-quote-cart`),
se hidrata al arrancar y **se vacía cuando la solicitud se envía con éxito**.
Antes solo se leía y nunca se escribía, así que se perdía al recargar.

**Ficheros de código:** `src/lib/quote-cart-storage.ts` (nuevo, puro, sin DOM),
`tests/quote-cart-storage.test.ts` (nuevo, 25 casos),
`src/context/QuoteCartContext.tsx`, `src/app/cotizacion/page.tsx`, y **tres `export`
añadidos** en `src/lib/validation.ts`.

**Decisiones que conviene no re-litigar:**
- El tipo `QuoteCartItem` **se infiere del esquema Zod**, no se declara aparte, para que
  no puedan divergir.
- La lógica va en un **módulo puro sin DOM** porque el runner es `node:test` **sin
  jsdom**: una lógica que solo vive en un `useEffect` no se puede testear aquí.
- Se **reutilizan** `shortText`, `slugText` e `imagePath` de `validation.ts` (por eso se
  exportan) en vez de duplicar la regex de la ruta de imagen, que es de seguridad.
- La escritura es un `useEffect` sobre `[items]`: vacío → `removeItem`, si no → `setItem`,
  en `try/catch`. **Idempotente y auto-repara** una entrada corrupta (la hidratosnada
  devuelve `[]` y el efecto termina borrando la clave).
- Sin envoltorio de versión: el carrito es desechable. Si algún día `QuoteCartItem`
  gana un campo obligatorio, los carritos viejos fallarán la validación y empiezy a
  quedar vacíos. **Es la degradación pretendida.**
- Sin sincronización entre pestañas ni caducidad: fuera de alcance, es función nueva.

**Verificación:** `npm run check` **exit 0** (typecheck, lint, **107/107 tests en 13
suites**, build con 15 rutas). Tests en rojo primero: `Cannot find module
'../src/lib/quote-cart-storage'`. Manual en navegador: persistencia, cantidades,
vaciado, envío y **8 casos de `localStorage` corrupto o manipulado**, todos con carrito
vacío, sin `NaN` y con la clave eliminada. Consola sin errores.

### Trampa de medición (mordí dos veces)

`browser.navigate` devuelve **antes de que React hidrate**, y el HTML del servidor
siempre lleva el carrito vacío. Leyendo el DOM en ese momento da dos falsos positivos:
"el carrito no aparece" y "la clave corrupta no se borra". Con espera dentro de la
página (`requestAnimationFrame`) el borrado ocurre a **0 ms**. Cuando verifiques
comportamiento de hidratación, **espera dentro de la página**, no desde fuera.

**Y el error que cometí con esto:** leí la consola **después de limpiar el
`localStorage`**, y concluí "consola sin errores". Con el carrito **guardado** hay un
`Error: Hydration failed` (H2). Un estado de partida limpio a la hora de medir
escondió justo el error que la función tenía que cazar. **Antes de afirmar "sin
errores", deja el `localStorage` en el estado que un usuario real tendría** y carga
la página en frío.

## Hallazgos que necesitan spec propia

| # | Hallazgo | Estado |
|---|---|---|
| **H1** | **El formulario de cotización devuelve 400 si el email queda vacío.** El campo está rotulado "opcional", pero `QuoteCartForm` manda `email: ""` (`FormData.get` devuelve cadena vacía) y `CreateQuoteSchema` rechaza `""` como email inválido. Quien cotiza sin correo recibe error | **Preexistente, sin arreglar.** Comprobado con `CreateQuoteSchema.safeParse`: `""` rechaza, `undefined`/`null`/válido aceptan |
| **H2** | **`/cotizacion` lanza `Error: Hydration failed` si hay carrito guardado.** El servidor prerenderiza la ruta con el carrito vacío y el cliente hidrata con el real; React descarta ese subárbol y lo repinta. Con carrito vacío no pasa | **Introduce la spec 003** (la persistencia, T4). React nombra la causa: `if (typeof window !== 'undefined')` |
| **H3** | Dos pulsaciones rápidas de "+" en el mismo frame solo suman 1: el `onClick` lee la cantidad del cierre del render | **Preexistente.** No lo introduce la spec 003 |

Los tres están en `README.md` §Límites conocidos y en `tasks.md` de la spec 003.

## Datos de prueba creados

La verificación de T7 dejó **2 filas `QuoteRequest` (ids 1 y 2)** en la **BD local de
desarrollo**, con `name = "Prueba Spec 003"`. Verificado con un recuento. No se borran
sin permiso del usuario: borrar filas es una escritura en base de datos.

## Repositorio y despliegue
- **GitHub**: `github.com/davidBroBa/Pingo-pop`, rama `main`, **público**. Commit inicial `bf52fa4` (155 ficheros) subido el 2026-10-05. `main` local sigue a `origin/main`.
- El remoto tenía antes una versión antigua del proyecto (commit `691d142`, septiembre 2026) **sin historial común**. Antes de reemplazarla se subió la etiqueta **`backup-691d142`**, que mantiene aquel commit alcanzable. Push: `+ 691d142...bf52fa4 main -> main (forced update)`, autorizado expresamente por el usuario.
- **Autenticación**: hay una credencial de GitHub guardada en Windows Credential Manager (`git:https://github.com`) y el push por **HTTPS funciona sin prompt**. La llave SSH local (`~/.ssh/id_ed25519.pub`, comentario `brole@windows-portfolio-deploy`) **no está registrada** en GitHub (`Permission denied (publickey)`): para usarla hay que añadirla en Settings → SSH keys.
- **Al ser público, el barrido de secretos pasa a ser obligatorio antes de cada commit**: un secreto publicado no se quita con un commit posterior. Ver `docs/PUBLICAR.md`.
- **Producción**: servidor `~/proyectos/pingo-pop` (alias `srv`), `next-server` PID 44721, `BUILD_ID v7Y4ofSNf4KkeWY_7E8as`, log `/tmp/pingo-pop-start-002.log`. Spec 002 verificada **en producción**, no solo en dev local.

## Límites conocidos
- **Rate limit en memoria**: no funciona entre múltiples instancias (horizontal scaling). Es aceptable para single-node.
- **Uploads en disco**: no hay limpieza de imágenes huérfanas (productos eliminados/desactivados). No solicitado, se documenta como deuda consciente.
- **Sin registro de BUYER**: solo seed/script crea BUYER. No forma parte de esta spec.
- **El carrito de cotización no se persiste** (bug preexistente, NO tocado por la spec 002): `QuoteCartProvider` lee `localStorage` al inicializar pero **nunca escribe**. Al recargar la página el carrito se vacía. Es funcional, no visual, y la spec 002 prohíbe cambios de comportamiento (RF-9): requiere spec propia. **Spec 003 escrita y pendiente de aprobación** (ver arriba). Hay dos defectos más alrededor: la lectura no valida nada (`as QuoteCartItem[]` a ciegas) y el carrito no se vacía tras enviar, lo que con persistencia permitiría cotizaciones duplicadas.
