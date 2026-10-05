# MEMORY.md — Pingo POP

> **Decisiones y su porqué**, no lista de tareas. El detalle vive en otro fichero:
> aquí va una línea y un enlace. Máximo ~100 líneas: si no cabe, sobra algo.

## Fase actual
- **Spec 003 `quote-cart-persistence`: cerrada** (T1–T9) y commiteada. **Sin desplegar.**
- Spec 002 `cartoon-visual`: cerrada y **desplegada**. Spec 001 `001-pingo-rework`: cerrada.
- **Gates:** `npm run check` **exit 0** — typecheck, lint, **107/107 tests en 13
  suites**, build con 15 rutas. **Cero dependencias nuevas** en todo el proyecto.

## Decisiones que no conviene re-litigar
- **Carrito en `localStorage` (`pingo-quote-cart`), sin servidor.** El carrito es
  desechable; una tabla sería desproporcionada. Sin envoltorio de versión: si
  `QuoteCartItem` gana un campo obligatorio, los carritos viejos fallan la validación
  y quedan vacíos. **Es la degradación pretendida.**
- **La lógica comprobable va en módulos puros de `src/lib/`, nunca en un
  componente.** El runner es `node:test` **sin jsdom**: lo que solo vive en un
  `useEffect` no se puede testear. El tipo, además, **se infiere del esquema Zod**
  para que la definición y la validación no diverjan.
- **Se reutiliza lo que ya existe en vez de duplicarlo.** Por eso `validation.ts`
  exporta `shortText`, `slugText` e `imagePath` (tres palabras): la regex de la ruta
  de imagen es una regla de seguridad y no puede separarse de la del panel.
- **La carga del carrito va en un `useEffect` de montaje, nunca en el inicializador
  de `useState`**: el inicializador corre también en el servidor, así que leer ahí
  `localStorage` hace que servidor y cliente pinten ramas distintas y React tire la
  hidratación. Y **el efecto de escritura va protegido por `cargado`**: sin ese
  guard vería el `items = []` del primer render y **borraría la clave antes de que
  la lectura la alcanzase**. El resto no cambió: `useEffect` sobre `[items]`,
  vacío → `removeItem`, si no → `setItem`, en `try/catch`. Idempotente y
  **auto-repara** una entrada corrupta.
- **Sesión firmada con HMAC-SHA256** (`payload.base64url(hmac)`), middleware **y**
  `requireAdmin()` en servidor. Mismo 401 ante contraseña incorrecta y usuario
  inexistente, con hash ficticio para igualar el tiempo.
- **Paleta:** única fuente de verdad `docs/DESIGN.md`; prohibido inventar hex fuera
  de ahí (el texto sobre colores de extensión va siempre en tinta).

## Trampas (todas me han mordido)
- **Medir el navegador engaña por partida doble.** (1) Concluí "consola sin
  errores" porque leí la consola *después* de vaciar el `localStorage`, y el error
  que buscaba solo sale con el carrito **guardado**. (2) `browser.navigate` devuelve
  antes de que React hidrate y el HTML del servidor siempre lleva el carrito vacío:
  da los falsos positivos "el carrito no aparece" y "la clave corrupta no se borra".
  **Espera dentro de la página** (`requestAnimationFrame`).
- **Windows vs Linux**: MariaDB en Linux distingue mayúsculas
  (`lower_case_table_names=0`) → `QuoteRequest`, no `quote_cart`.
- **`JSON.stringify({image: ""})` conserva la cadena vacía**; hay que normalizar en
  el `preprocess` de Zod. Ese mismo fallo, sin corregir, es H1.
- **PowerShell**: `Out-File -Encoding utf8` mete **BOM** y contamina el subject del
  commit; usar `[IO.File]::WriteAllText` con `UTF8Encoding($false)`.
  `Get-Content -Raw` falla en algunos ficheros: `[IO.File]::ReadAllText`.
- **Desplegar no es idempotente**: `pgrep` → `kill` → arrancar. Con `setsid nohup`
  vía `srv.ps1 exec` el arranque sobrevive aunque el wrapper aborte a los 180 s:
  **no asumas que falló**.

## Hallazgos (cada uno necesita su spec)
| # | Qué | Estado |
|---|---|---|
| **H1** | **El formulario de cotización devuelve 400 si el email queda vacío.** El campo está rotulado "opcional", pero `FormData.get` devuelve `""` y `CreateQuoteSchema` rechaza la cadena vacía como email inválido | **Abierto, preexistente, lo más grave:** es una vía de negocio rota. Comprobado con `safeParse`: `""` rechaza, `undefined`/`null`/válido aceptan. Arreglo probable: un `preprocess` como el de `imagePath` |
| **H3** | Dos pulsaciones rápidas de "+" en el mismo frame solo suman 1: el `onClick` lee la cantidad del cierre del render | Abierto, preexistente, bajo impacto |

**H2 cerrado (T9).** Era consecuencia de la spec 003, así que era suyo: la carga pasó
del inicializador de `useState` a un `useEffect`. Queda **un fotograma** con el
carrito vacío antes de que aparezca el real: es intrínseco a que los datos vivan en
el navegador, y `useSyncExternalStore` tampoco lo evitaría.

## Deuda que se anota en vez de pagar
- **`useSyncExternalStore` para el carrito.** ESLint bloquea `setState` síncrono en un
  efecto (`react-hooks/set-state-in-effect`) y está silenciado **con el motivo escrito
  en el propio sitio**: la regla busca estado *derivado*, y aquí se lee un almacén
  externo mutable que solo existe en el navegador. El refactor correcto (~50 líneas,
  reescribir los cuatro mutadores para que notifiquen) conviene hacerlo **cuando la
  spec de H1 toque ese mismo fichero**, no encadenado hoy.
- **Gates sin bloquear.** `.git/hooks/` está vacío, así que hoy un commit se salta
  toda verificación, y el repo ya es público. Falta `install-hooks.ps1 -VendorGates`
  y el CI. **Pendiente de tu decisión.**

## Próximos pasos
1. **Spec para H1.** Antes que nada: es dinero que se pierde.
2. **Desplegar** la spec 003, commiteada pero no desplegada.
3. **Datos de prueba en la BD local**: 2 filas `QuoteRequest` (ids 1 y 2,
   `name = "Prueba Spec 003"`). No se borran sin permiso: es escritura en BD.
4. Menores: cerrar T7/T10 de la spec 001; `prisma/make-buyer.ts` tiene una contraseña
   de pruebas fija en el código (inofensiva, pero la señalan los escáneres);
   `engines` en `package.json`; `src/config/{theme,navigation}.ts` son código muerto.

## Repositorio y despliegue
- **GitHub:** `github.com/davidBroBa/Pingo-pop`, rama `main`, **público**. Antes de
  reemplazar la versión antigua del remoto se subió la etiqueta `backup-691d142`,
  que la mantiene alcanzable.
- **Autenticación:** credencial HTTPS en Windows Credential Manager; el push
  funciona sin prompt. La llave SSH local **no** está registrada en GitHub.
- **Al ser público, el barrido de secretos es obligatorio antes de cada commit**: un
  secreto publicado no se quita con un commit posterior. Ver `docs/PUBLICAR.md`.
- **Producción:** `~/proyectos/pingo-pop` en el alias `srv`, no alcanzable desde este
  PC (firewall): se entra por túnel `ssh -N -L 3001:localhost:3000 srv`. La IP y el
  usuario **no** van en ficheros publicables.

## Dónde está el detalle (no repetirlo aquí)
`README.md` (puesta en marcha, límites conocidos) · `docs/SDD.md` (arquitectura y
testing) · `docs/THREATS.md` (STRIDE; **A5** es del carrito guardado) ·
`docs/DESIGN.md` (paleta) · `docs/GATES.md` · `docs/DEPLOY.md` · `docs/PUBLICAR.md`
· `docs/constitution.md` · `specs/*/` · `AGENTS.md`.