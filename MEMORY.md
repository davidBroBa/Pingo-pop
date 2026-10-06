# MEMORY.md — Pingo POP

> **Decisiones y su porqué**, no lista de tareas. Máximo ~100 líneas: si no cabe, sobra
> algo. Lo que ya esté en `AGENTS.md` o en `docs/` **no se repite aquí**.

## Fase actual
- **Spec 006 `user-profile`: implementada** (T1–T12), **sin commitear ni desplegar**.
  Specs 003–005 cerradas. Spec 002 desplegada.
- **Gates:** `npm run check` **exit 0** — typecheck, lint, **151/151 tests en 20
  suites**, build con 16 rutas. **Cero dependencias nuevas.**

## Decisiones que no conviene re-litigar
- **`sessionVersion` en `User` es lo que permite revocar sesiones.** Antes la cookie era
  `{userId, role, iat, exp}`: sin versión, **toda cookie firmada valía 8 horas** aunque
  se cambiara la contraseña. Ahora el `sv` viaja firmado y se compara con la BD.
- **`getSessionUser()` consulta la BD; `getSession()` no.** La primera revoca y relee el
  rol; la segunda solo valida firma y caducidad.
- **El middleware NO revoca: corre en Edge y no hay Prisma.** `/admin` puede pintar el
  *shell* con una cookie caducada; el 401/403 llega al pedir datos. **Límite conocido.**
- **Cambiar la contraseña cierra también el dispositivo que la cambió:** se incrementa
  `sv` y no se emite cookie nueva.
- **Dos políticas de contraseña:** BUYER 8+ sin exigir complejidad; ADMIN 12+ con
  mayúscula, minúscula, dígito y puntuación. El suelo de 8 **no baja** porque
  `LoginSchema` ya rechazaba menos. Se relaja la complejidad, no la longitud.
- **`MainLayout` recibe `haySesion` como prop y NO lee cookies.** Si fuera `async` con
  `cookies()`, `/contacto` y `/novedades` dejarían de prerenderizarse y el build falla.
- **Regla del catálogo: pines y llaveros NO se personalizan; los fotobotones y la
  impresión 3D desde archivo SÍ.** Se decide **por categoría**
  (`CATEGORIAS_PERSONALIZABLES`), no por slug: así un producto nuevo se etiqueta solo.
- **"Personalizado" es etiqueta morada, no texto.** `--cartoon-lavender` de
  `docs/DESIGN.md`, texto en tinta: **5.69:1**.
- **La contraseña del admin NUNCA en el repo**: `seed.ts` está versionado y el repo es
  público. Se lee de `ADMIN_PASSWORD` en `.env` (gitignorada).
- **Carrito en `localStorage`, sin servidor.** Sin envoltorio de versión a propósito:
  si `QuoteCartItem` gana un campo obligatorio, los carritos viejos se descartan.
- **La carga del carrito va en un `useEffect` de montaje, nunca en el inicializador de
  `useState`** (que corre también en el servidor). Y el efecto de escritura va protegido
  por `cargado`: sin ese guard **borraría la clave antes de leerla**.
- **Lógica comprobable en módulos puros de `src/lib/`, nunca en un componente:** el
  runner es `node:test` **sin jsdom**. El tipo **se infiere del esquema Zod**.
- Sesión firmada con HMAC-SHA256, middleware **y** `requireAdmin()`; paleta desde
  `docs/DESIGN.md`. Detalle de seguridad en `AGENTS.md`.

## Trampas (todas me han mordido)
- **Medir el navegador engaña por partida doble.** (1) Dije "consola sin errores" porque
  leí la consola *después* de vaciar el `localStorage`. (2) `browser.navigate` devuelve
  antes de que React hidrate: da falsos positivos. **Espera dentro de la página**
  (`requestAnimationFrame`).
- **Probar el login en el navegador, no con `Invoke-WebRequest`.** Con la cookie a mano el
  panel daba 307 y parecía roto. Inputs de React: setter de
  `HTMLInputElement.prototype` + `input`.
- **Acentos: usa la herramienta de edición, nunca un `.ps1` tecleado desde el chat** (se
  me colaron CJK). Barre con `[\u3000-\u9fff\u0400-\u04ff]`; ojo: un patrón que incluya
  los acentos correctos marca todo el español como roto.
- **PowerShell**: `Out-File -Encoding utf8` mete **BOM**; usa `[IO.File]::WriteAllText`
  con `UTF8Encoding($false)`.
- **Cambiar el esquema de Prisma obliga a reiniciar el dev server** (si no,
  `Unknown field`), y `npm run build` hace panic de Turbopack si compila a la vez.
- **`prisma migrate dev` pide CREATE y ALTER** para su shadow database; `pingo` no los tenía.
- **Renombrar en la BD conservando el `id`**: hay `QuoteRequestItem` por `productId`.
- **El servidor NO tiene `.git`, y `sync-servidor.ps1` no sube el proyecto** (solo
  `AGENTS`/skills). Es `tar` + `srv put` + extraer, y luego `npm install` allí.
- **`JSON.stringify({image: ""})` conserva la cadena vacía**; normalizar en el
  `preprocess` de Zod. Ese fallo, sin corregir, es H1.

## Hallazgos (cada uno necesita su spec)
| # | Qué | Estado |
|---|---|---|
| **H1** | **El formulario de cotización devuelve 400 si el email queda vacío.** El campo está rotulado "opcional", pero `FormData.get` devuelve `""` y el esquema rechaza la cadena vacía | **Abierto, lo más grave:** es una vía de negocio rota. Comprobado con `safeParse`: `""` rechaza, `undefined`/`null`/válido aceptan |
| **H3** | Dos pulsaciones rápidas de "+" en el mismo frame solo suman 1: el `onClick` lee la cantidad del cierre del render | Abierto, bajo impacto |

**H2 cerrado (T9 de la spec 003).** Queda **un fotograma** con el carrito vacío: es
intrínseco a que los datos vivan en el navegador.

## Deuda que se anota en vez de pagar
- **`useSyncExternalStore` para el carrito.** ESLint bloquea `setState` síncrono en un
  efecto (`react-hooks/set-state-in-effect`) y está silenciado **con el motivo escrito en
  el propio sitio**: la regla busca estado *derivado*. El refactor (~50 líneas) conviene
  hacerlo cuando otra spec toque ese mismo fichero.
- **Gates sin bloquear:** `.git/hooks/` está vacío, así que hoy un commit se salta toda
  verificación, y el repo ya es público. Falta el CI. **Pendiente de tu decisión.**

## Próximos pasos
1. **Commit de la spec 006** (T1–T12 verificadas).
2. **Spec 007: crear administradores desde `/admin/usuarios`.** Decidido por el usuario.
3. **Spec para H1.** Antes que nada: es dinero que se pierde.
4. **Desplegar** las specs 003–006, commiteadas pero no desplegadas.
5. **Mayoreo es solo copy:** no hay precios por volumen. Si crece, necesita su spec.
6. **Datos de prueba que decidiste dejar**: 2 filas `QuoteRequest` y `Test Temporal`
   (id 5, $9.99). Menores: cerrar T7/T10 de la 001; `engines`; `src/config/*` muerto.

## Repositorio y despliegue
- **GitHub:** `github.com/davidBroBa/Pingo-pop`, rama `main`, **público**. La versión
  antigua del remoto sigue en la etiqueta `backup-691d142`. Push por credencial HTTPS en
  Windows Credential Manager.
- **Al ser público, barrido de secretos obligatorio antes de cada commit:** un secreto
  publicado no se quita con un commit posterior. Ver `docs/PUBLICAR.md`.
- **Producción:** `~/proyectos/pingo-pop` en el alias `srv`, no alcanzable desde este PC
  (firewall): túnel `ssh -N -L 3001:localhost:3000 srv`. IP y usuario **no** van en
  ficheros publicables. Detalle en `docs/DEPLOY.md`.