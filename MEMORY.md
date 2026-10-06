# MEMORY.md — Pingo POP

> **Decisiones y su porqué**, no lista de tareas. Lo que ya esté en `AGENTS.md` o en
> `docs/` **no se repite aquí**. Máximo ~100 líneas.

## Fase actual
- **Spec 008 `site-and-category-images`: implementada, SIN COMMIT.** Foto del hero
  (`SiteSettings`, `/admin/apariencia`) + fotos de categoría con edición. **19 tests
  nuevos**; `npm run check` **exit 0** con **190/190 en 26 suites** y **22 rutas** del
  build. Verificado en navegador: V1-V7, V12-V14. **Cero dependencias nuevas.**
- **Bug de imagen de producto: arreglado, sin commitear.** Las cuatro vistas públicas
  pintaban un `<span>Pingo</span>` fijo y **nunca leían `product.image`**; la subida, la
  BD y la API ya funcionaban. Verificado en navegador con `naturalWidth` > 0.
- **Spec 006 `user-profile`: commiteada** (`97f42c7`) y subida, **sin desplegar**. Specs
  003–005 cerradas. Spec 002 desplegada.

## Decisiones que no conviene re-litigar
- **La revocación de sesiones se apoya en `sessionVersion`.** Antes la cookie era
  `{userId, role, iat, exp}`: sin versión, **toda cookie firmada valía 8 horas** aunque se
  cambiara la contraseña. Ahora el `sv` viaja firmado y se compara con la BD. Solo
  `getSessionUser()` puede revocarlo: el middleware corre en Edge y no tiene Prisma, así
  que `/admin` puede pintar el *shell* y el 401/403 llega al pedir datos. **Límite conocido.**
- **Dos políticas de contraseña:** BUYER 8+ sin exigir complejidad; ADMIN 12+ con
  mayúscula, minúscula, dígito y puntuación. El suelo de 8 **no baja** porque
  `LoginSchema` ya rechazaba menos. Se relaja la complejidad, no la longitud.
- **`MainLayout` recibe `haySesion` como prop y NO lee cookies.** Si fuera `async` con
  `cookies()`, `/contacto` y `/novedades` dejarían de prerenderizarse y el build falla.
  La home **sí** es `force-dynamic`, así que puede leer la BD y pasar props.
- **Regla del catálogo: pines y llaveros NO se personalizan; los fotobotones y la
  impresión 3D desde archivo SÍ.** Se decide **por categoría**
  (`CATEGORIAS_PERSONALIZABLES`), no por slug: así un producto nuevo se etiqueta solo.
- **La contraseña del admin NUNCA en el repo**: se lee de `ADMIN_PASSWORD` en `.env`
  (gitignorada), porque `seed.ts` está versionado y el repo es público.
- **Lo de la spec 008 vive en `AGENTS.md`, no aquí**: `SiteSettings` como fila única, las
  dos carpetas con sus dos esquemas, el `target` de la subida, el recorte a 4 (D11) y la
  deuda del `ImagePicker`.
- **El `Pingo` de relleno es una reserva, no un adorno.** Se queda cuando `image === null`
  porque 5 de 6 productos no tienen foto. Añadir el campo a la vista no bastaba:
  **había que leerlo**, y por eso nadie se enteró de que la imagen existía.
- **Lógica comprobable en módulos puros de `src/lib/`, nunca en un componente:** el
  runner es `node:test` **sin jsdom**. El tipo **se infiere del esquema Zod**.

## Trampas (todas me han mordido)
- **Medir el navegador engaña por partida doble.** (1) Dije "consola sin errores" porque
  leí la consola *después* de vaciar el `localStorage`. (2) `browser.navigate` devuelve
  antes de que React hidrate: da falsos positivos. **Espera dentro de la página**
  (`requestAnimationFrame`). Y `Invoke-WebRequest` no manda bien la cookie: probar el
  login en el navegador, con el setter de `HTMLInputElement.prototype` + `input`.
- **Acentos y BOM: usa la herramienta de edición, nunca un `.ps1` tecleado desde el
  chat.** Se me colaron CJK así (también **por el subagente**) y un BOM en
  `docs/THREATS.md`. Barre con `[\u3000-\u9fff\u0400-\u04ff]`; ojo: un patrón que
  incluya los acentos correctos marca todo el español como roto.
- **Un `eslint-disable-next-line` partido en dos líneas no desactiva nada**: aplica a la
  línea siguiente, que era mi segundo comentario, no al `<img>`. Va en **una** línea.
- **`mcp` es un mapa plano, sin envoltorio `"servers"`** (esquema oficial). Y un
  `opencode.json` en el proyecto **pisa** al global: pisó la clave real de context7 con un
  placeholder y dejó el MCP sin funcionar. Ya está en `.gitignore`.
- **Cambiar el esquema de Prisma obliga a reiniciar el dev server** (si no,
  `Unknown field`), y `npm run build` hace panic de Turbopack si compila a la vez.
- **`prisma migrate dev` pide CREATE y ALTER** para su shadow database; `pingo` no los tenía.
- **El servidor NO tiene `.git`, y `sync-servidor.ps1` no sube el proyecto** (solo
  `AGENTS`/skills): es `tar` + `srv put` + extraer, y `npm install` allí.

## Hallazgos (cada uno necesita su spec)
| # | Qué | Estado |
|---|---|---|
| **H1** | El formulario devolvía 400 con el email vacío: rotulado "opcional", pero `FormData.get` da `""` y el esquema lo rechazaba | **Cerrado** en la spec `005-email-empty` con `preprocess` |
| **H2** | Queda **un fotograma** con el carrito vacío antes de que aparezca el real | **Cerrado** (T9 de la spec 003). Es intrínseco a que los datos vivan en el navegador |
| **H3** | Dos pulsaciones rápidas de "+" en el mismo frame solo suman 1: el `onClick` lee la cantidad del cierre del render | Abierto, bajo impacto |
| **H4** | **`Category.image` existía desde la 001 sin usarse**; `/api/categorias` solo tenía `GET` y `POST`, así que **una categoría creada no se podía editar**; y `/admin/categorias` **no tenía ni un enlace entrante** | **Cerrado** en la spec 008 |
| **H5** | El navbar dice **"Iniciar sesión" aunque haya sesión**: `MainLayout` recibe `haySesion` por prop con valor `false` y **solo `/perfil` se lo pasa** | Abierto. Preexistente, **no lo introdujo la spec 008**. En las páginas prerenderizadas es por diseño (ahí no hay `cookies()`); en las dinámicas se arreglaría pasando la prop |

## Deuda que se anota en vez de pagar
- **`useSyncExternalStore` para el carrito.** ESLint bloquea `setState` síncrono en un
  efecto y está silenciado **con el motivo escrito en el propio sitio**. El refactor
  (~50 líneas) conviene hacerlo cuando otra spec toque ese mismo fichero.
- **Gates sin bloquear:** `.git/hooks/` está vacío, así que hoy un commit se salta toda
  verificación, y el repo ya es público. Falta el CI. **Pendiente de tu decisión.**
- **Ficheros huérfanos:** quitar una foto no borra el fichero de disco.

## Próximos pasos
1. **Commit pendiente**: el arreglo de imágenes de producto **y** la spec 008 completa
   (migración `20261006041929_add_site_settings` incluida). **No commitear hasta que lo
   pidas**, y antes el barrido de secretos de `docs/PUBLICAR.md` §2.
2. **Spec 007: crear administradores desde `/admin/usuarios`.** Decidido, sin carpeta.
3. **H5**: el navbar dice "Iniciar sesión" aun con sesión en las páginas dinámicas.
4. **Borrar 4 imágenes basura** de `public/uploads/products/` (22–40 bytes).
5. **Desplegar** las specs 003–008: commiteadas pero no desplegadas.
6. **Mayoreo es solo copy:** no hay precios por volumen. **Datos de prueba que decidiste
   dejar**: 2 filas `QuoteRequest` y `Test Temporal` (id 5, $9.99). Menores: T7/T10 de
   la 001; `engines`; `src/config/*` muerto.

## Repositorio y despliegue
- **GitHub:** `github.com/davidBroBa/Pingo-pop`, rama `main`, **público**. La versión
  antigua del remoto sigue en la etiqueta `backup-691d142`. **Barrido de secretos
  obligatorio antes de cada commit** (`docs/PUBLICAR.md` §2): lo publicado no se quita
  con un commit posterior.
- **Producción:** `~/proyectos/pingo-pop` en el alias `srv`, no alcanzable desde este PC
  (firewall): túnel `ssh -N -L 3001:localhost:3000 srv`. IP y usuario **no** en ficheros
  publicables. Detalle en `docs/DEPLOY.md`.