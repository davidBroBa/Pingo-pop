# MEMORY.md — Pingo POP

> **Decisiones y su porqué**, no lista de tareas. Máximo ~100 líneas: si no cabe,
> sobra algo. Lo que ya esté en `AGENTS.md` o en `docs/` **no se repite aquí**.

## Fase actual
- **Specs 003, 004 y 005 cerradas y commiteadas. Sin desplegar.** Spec 002 desplegada.
- **Gates:** `npm run check` **exit 0** — typecheck, lint, **107/107 tests en 13
  suites**, build con 15 rutas. **Cero dependencias nuevas** en el proyecto.

## Decisiones que no conviene re-litigar
- **Regla del catálogo: pines y llaveros NO se personalizan; los fotobotones y la
  impresión 3D desde archivo SÍ.** Se decide **por categoría**
  (`CATEGORIAS_PERSONALIZABLES`), no por slug: un producto nuevo se etiqueta solo y una
  categoría nueva cae en "catálogo", que es el caso seguro.
- **"Personalizado" es etiqueta morada, no texto que lo explique.** Morado =
  `--cartoon-lavender` (`#A78BFA`) de `docs/DESIGN.md`, texto en tinta: **5.69:1**. El
  blanco sobre morado no llega a 4.5:1.
- **La contraseña del admin NUNCA en el repositorio**: `seed.ts` es versionado y el repo
  es público, así que ahí sería una cuenta ADMIN publicada. Se lee de
  `ADMIN_PASSWORD` en `.env` (gitignorada). `ALLOW_WEAK_ADMIN_PASSWORD` se probó y se
  **eliminó**: no hacía falta.
- **El mínimo de 8 caracteres lo impone el login (`LoginSchema`), no el seed.** El seed
  avisa pero no bloquea por debajo de 12: si bloqueara no habría forma de tener una
  contraseña corta y usable sin tocar el login. Con 3 caracteres el login da 400 antes
  de comparar el hash.
- **Carrito en `localStorage` (`pingo-quote-cart`), sin servidor:** es desechable y una
  tabla sería desproporcionada. Sin envoltorio de versión a propósito: si `QuoteCartItem`
  gana un campo obligatorio, los carritos viejos se descartan. **Degradación pretendida.**
- **La carga del carrito va en un `useEffect` de montaje, nunca en el inicializador de
  `useState`** (que corre también en el servidor: pintarían ramas distintas y React
  tiraría la hidratación). Y el efecto de escritura va protegido por `cargado`: sin ese
  guard **borraría la clave antes de que la lectura la alcanzase**.
- **Lógica comprobable en módulos puros de `src/lib/`, nunca en un componente:** el
  runner es `node:test` **sin jsdom**. El tipo **se infiere del esquema Zod**, y se
  reutiliza lo existente en vez de duplicarlo.
- Sesión firmada con HMAC-SHA256, middleware **y** `requireAdmin()`; paleta desde
  `docs/DESIGN.md`. Todo el detalle de seguridad, en `AGENTS.md`.

## Trampas (todas me han mordido)
- **Medir el navegador engaña por partida doble.** (1) Dije "consola sin errores" porque
  leí la consola *después* de vaciar el `localStorage`, y el error que buscaba solo sale
  con el carrito **guardado**. (2) `browser.navigate` devuelve antes de que React
  hidrate: da los falsos positivos "el carrito no aparece" y "la clave corrupta no se
  borra". **Espera dentro de la página** (`requestAnimationFrame`).
- **Probar el login en el navegador, no con `Invoke-WebRequest`.** Con la cookie a mano
  el panel daba 307 y parecía roto; por el formulario real entraba bien. Los inputs son
  controlados por React: usa el setter de `HTMLInputElement.prototype` + `input`.
- **Acentos: usa la herramienta de edición, nunca un `.ps1` tecleado desde el chat** (se
  me colaron CJK en palabras acentuadas). Barre con `[\u3000-\u9fff\u0400-\u04ff]`, y
  ojo: un patrón que incluya los acentos correctos marca todo el español como roto.
- **PowerShell**: `Out-File -Encoding utf8` mete **BOM** y contamina el subject del
  commit; usa `[IO.File]::WriteAllText` con `UTF8Encoding($false)`.
- **Renombrar en la BD conservando el `id`**: hay `QuoteRequestItem` por `productId`. El
  slug sí puede cambiar.
- **El servidor NO tiene `.git`, y `sync-servidor.ps1` no sube el proyecto.** Desplegar
  es `tar` + `srv put` + extraer y luego `npm install` allí, o falta `tsx`. Y no es
  idempotente: `pgrep` → `kill`.
- **`JSON.stringify({image: ""})` conserva la cadena vacía**; normalizar en el
  `preprocess` de Zod. Ese mismo fallo, sin corregir, es H1.

## Hallazgos (cada uno necesita su spec)
| # | Qué | Estado |
|---|---|---|
| **H1** | **El formulario de cotización devuelve 400 si el email queda vacío.** El campo está rotulado "opcional", pero `FormData.get` devuelve `""` y `CreateQuoteSchema` rechaza la cadena vacía como email inválido | **Abierto, preexistente, lo más grave:** es una vía de negocio rota. Comprobado con `safeParse`: `""` rechaza, `undefined`/`null`/válido aceptan. Arreglo probable: un `preprocess` como el de `imagePath` |
| **H3** | Dos pulsaciones rápidas de "+" en el mismo frame solo suman 1: el `onClick` lee la cantidad del cierre del render | Abierto, preexistente, bajo impacto |

**H2 cerrado (T9 de la spec 003).** Queda **un fotograma** con el carrito vacío antes de
que aparezca el real: es intrínseco a que los datos vivan en el navegador.

## Deuda que se anota en vez de pagar
- **`useSyncExternalStore` para el carrito.** ESLint bloquea `setState` síncrono en un
  efecto (`react-hooks/set-state-in-effect`) y está silenciado **con el motivo escrito en
  el propio sitio**: la regla busca estado *derivado*, y aquí se lee un almacén externo
  que solo existe en el navegador. El refactor (~50 líneas) conviene hacerlo cuando otra
  spec toque ese mismo fichero.
- **Gates sin bloquear:** `.git/hooks/` está vacío, así que hoy un commit se salta toda
  verificación, y el repo ya es público. Falta el CI. **Pendiente de tu decisión.**

## Próximos pasos
1. **Spec 006: perfil de usuario y de admin** — quieres propuestas antes de decidir. Hoy
   el login es por `email` (no hay campo "usuario") y no hay registro público.
2. **Spec para H1.** Antes que nada: es dinero que se pierde.
3. **Desplegar** las specs 003–005, commiteadas pero no desplegadas.
4. **Mayoreo es solo copy:** no hay precios por volumen, los precios siguen siendo de
   detalle. Si crece, necesita su spec.
5. **Datos de prueba que decidiste dejar**: 2 filas `QuoteRequest` (ids 1 y 2) y un
   producto basura `Test Temporal` (id 5, $9.99, en Pines metálicos).
6. Menores: cerrar T7/T10 de la spec 001; `prisma/make-buyer.ts` tiene una contraseña de
   pruebas fija; `engines` en `package.json`; `src/config/*` es código muerto.

## Repositorio y despliegue
- **GitHub:** `github.com/davidBroBa/Pingo-pop`, rama `main`, **público**. La versión
  antigua del remoto sigue en la etiqueta `backup-691d142`. Push por credencial HTTPS en
  Windows Credential Manager; la llave SSH local **no** está registrada.
- **Al ser público, barrido de secretos obligatorio antes de cada commit:** un secreto
  publicado no se quita con un commit posterior. Ver `docs/PUBLICAR.md`.
- **Producción:** `~/proyectos/pingo-pop` en el alias `srv`, no alcanzable desde este PC
  (firewall): túnel `ssh -N -L 3001:localhost:3000 srv`. IP y usuario **no** van en
  ficheros publicables. El detalle de despliegue, en `docs/DEPLOY.md`.