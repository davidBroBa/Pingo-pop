# MEMORY.md — Pingo POP

> **Decisiones y su porqué**, no lista de tareas. Lo que ya esté en `AGENTS.md` o en
> `docs/` **no se repite aquí**. Máximo ~100 líneas.

## Fase actual
- **Spec 009 `legal-compliance-privacy`: F1, F2, F3, F4, F7 hechas y publicadas.**
  11 commits en `origin/main` (`90083ed`), sin desplegar. **Siguiente: F5**, las
  siete páginas legales y rehacer `/contacto`.
- **F5 es el desbloqueo de F4**: `/admin/legal` guarda los datos legales pero
  `readLegalData()` **no lo llama ninguna página**. Rellenarlos no cambia nada
  visible hasta que existan las páginas. Por eso el orden fue F4 antes que F5.
- Specs 001–006 y 008 cerradas y publicadas, también sin desplegar.
- **Gate:** `npm run check` → **exit 0**, **366 tests / 64 suites**, **29 rutas**.

## Decisiones que no conviene re-litigar
- **La revocación de sesiones se apoya en `sessionVersion`.** El `sv` viaja firmado
  en la cookie y se contrasta con la BD. Solo `getSessionUser()` puede revocar: el
  middleware corre en Edge y no tiene Prisma, así que `/admin` puede pintar el
  *shell*. **Límite conocido y documentado.**
- **La retención NO se ejecuta, y es a propósito.** RF-22 dice que a los 12 meses
  "queda marcada: el sistema **no borra sola, avisa**". Una política que no muta nada
  se evalúa al leer: no hay cron ni job, y **no se añadió columna "revisada"** porque
  ningún RF la pide. Consecuencia aceptada: si conservas una vencida, sigue
  apareciendo como vencida.
- **`LEGAL_LINKS` existe separado de `legal-versions`.** El segundo usa `node:crypto`
  para la huella; un componente de cliente que lo importase arrastraba
  `crypto-browserify` (800 KB medidos). Dos tests fallan si alguien rompe esto.
- **Los textos legales son un entregable, sin marca de "requiere revisión legal"**
  (D20). Van **acentuados**: es texto público en español, y sin tilde se lee como
  un documento que nadie ha revisado. Huellas recalculadas con
  `scripts/recalcular-huellas.ts`; el marcador **se importa**, nunca se escribe a mano.
- **`SiteSettings` y `LegalData` son filas únicas** (`id` fijo a `1`, `upsert`): es lo
  que impide el bug de "una fila por guardado".
- **`MainLayout` recibe `haySesion` como prop y NO lee cookies.** Si fuera `async`, la
  home dejaría de ser `force-dynamic`. La home sí lee la BD y pasa props.
- **Regla del catálogo: pines y llaveros NO se personalizan; los fotobotones y la
  impresión 3D desde archivo SÍ**, decidido por categoría, no por slug.
- **La contraseña del admin NUNCA en el repo**: se lee de `.env`, porque `seed.ts` está
  versionado y el repo es público.

## Trampas (todas me han mordido)
- **Acentos y BOM: usa la herramienta de edición, nunca un `.ps1` tecleado.** Se me
  han colado **ocho veces** ideogramas CJK, y un BOM. Barre con
  `npx tsx scripts/barrido-caracteres.ts`, que **se autocomprueba** con un fichero de
  control: si no encuentra el CJK que él mismo puso, no dice "limpio". Ojo: un
  patrón PowerShell con `ñ` dentro de `[...]` **da falso negativo**.
- **El texto de la interfaz también es código.** El guard de F1 que recorre `src/` y
  falla si `MARCADOR_PENDIENTE` aparece fuera de `legal-data.ts` me pilló a mí
  escribiéndolo a mano **en el texto que ve el administrador**.
- **`new Date()` a nivel de módulo congela el reloj al arrancar el proceso.** En un
  servidor con semanas vivo, todas las antiguedades serían las del arranque. Dentro
  de la función, siempre.
- **Medir el navegador engaña por partida doble.** `browser.navigate` devuelve antes
  de que React hidrate: falsos positivos. Espera **dentro** de la página con
  `requestAnimationFrame`. Y `Invoke-WebRequest` no manda bien la cookie: para
  probarlo, login por HTTP con `WebRequestSession`, que la gestiona sola.
- **Bug que solo se ve en el navegador:** la respuesta de `PATCH /api/admin/legal` es
  **`{ legal: {...} }`**, con envoltorio. Leer `data[campo]` da `undefined` para los
  seis y el aviso dice "faltan 6" justo después de rellenarlos. Por HTTP no se ve.
- **`npm run build` hace panic de Turbopack si el dev server está vivo.** Para
  `npm run check`: parar Next y borrar `.next`.
- **Cambiar el esquema de Prisma obliga a reiniciar el dev server**, y
  `prisma migrate dev` pide `CREATE` y `ALTER` para su *shadow database*.
- **Docker Desktop tiene que estar encendido antes de Next.** Si Next nace contra una
  base caída, el pool de Prisma queda muerto y las páginas que leen dan 500 **hasta
  reiniciar Next**. Al empezar una sesión, `docker compose ps` antes de culpar al código.
- **El servidor NO tiene `.git`**; `sync-servidor.ps1` no sube el proyecto: es `tar`
  + `srv put`.

## Hallazgos abiertos
| # | Qué | Estado |
|---|---|---|
| **H5** | El navbar dice "Iniciar sesión" **aunque haya sesión** en las páginas dinámicas: `MainLayout` recibe `haySesion = false` y solo `/perfil` se lo pasa | Abierto, preexistente. En las estáticas es por diseño (ahí no hay `cookies()`) |
| **H3** | Dos pulsaciones rápidas de "+" en el mismo frame solo suman 1 | Abierto, bajo impacto |
| — | **No se puede crear un usuario desde la web.** El spec 007 ("crear administradores desde `/admin/usuarios`") está decidido pero el número acabó ocupándolo la 008, así que solo vive aquí | Abierto |
| — | **`SITE_URL` en el servidor sigue siendo `localhost`**: el sitemap publicará `localhost` | **Pendiente antes de desplegar** |
| — | **`middleware` → `proxy`**: Next 16.3.8 lo avisa en cada arranque. Renombrar el fichero que protege `/admin` merece spec propia | Pendiente de decidir |
| — | **Gates sin bloquear**: `.git/hooks/` vacío, así que un commit se salta toda verificación, y el repo ya es público. Falta CI | Pendiente de tu decisión |
| — | **README miente**: dice que el formulario devuelve 400 con el email vacío "sin arreglar". **Ya está arreglado** (HTTP 201 con correo vacío) | Pendiente de corregir |

## Decisión sobre documentar
- **`tasks.md` es el parte de verificación.** Cada tarea escrita va con su nota, y la
  nota dice **quién verificó qué**: la mayoría de las comprobaciones autenticadas las
  hizo el subagente que implementó el bloque. **Un PASS nunca se infiere.**

## Repositorio y despliegue
- **GitHub:** `github.com/davidBroBa/Pingo-pop`, rama `main`, **público**. La versión
  antigua del remoto está en la etiqueta `backup-691d142`. **Barrido de secretos
  obligatorio antes de cada commit** (`docs/PUBLICAR.md` §2): lo publicado no se quita
  con un commit posterior.
- **Producción:** `~/proyectos/pingo-pop` en el alias `srv`, no alcanzable desde este PC
  (firewall): túnel `ssh -N -L 3001:localhost:3000 srv`. IP y usuario **no** en ficheros
  publicables. Detalle en `docs/DEPLOY.md`.
