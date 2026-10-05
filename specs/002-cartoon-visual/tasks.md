# Tasks: Pingo POP — Rediseño visual cartoon (002-cartoon-visual)

> Spec **aprobada** por el usuario (5 oct 2026). Cada tarea indica los RF que cubre
> y el comando/medida con la que se verificó. Tests de seguridad no tocados (RF-9).

- [x] **T1** — Reescribir `docs/DESIGN.md` con paleta núcleo+extensión y lenguaje
  cartoon completo. *(RF-10)*
  Verificado: el documento lista todos los hex implementados más la tabla de
  contraste medidos.
- [x] **T2** — Tokens `--cartoon-*` + utilidades cartoon en `globals.css`
  (borde, sombra dura, squishy, foco ámbar). *(RF-1, RF-2)*
  Verificado: `npm run typecheck` y `npm run lint` OK; los 7 hex del núcleo sin
  cambios; las 10 utilidades presentes en el CSS compilado.
- [x] **T3** — Contraste: medir todos los pares texto/fondo nuevos ≥ 4.5:1. *(RF-6)*
  Verificado: script con la fórmula de luminancia WCAG. Todos los pares tinta/X
  pasan (5.60–14.13:1). Blanco sobre rosa (2.68) y coral (2.77) **fallan** →
  regla aplicada: texto sobre extensión siempre en tinta. Tabla en `docs/DESIGN.md`.
- [x] **T4** — Supresión de animaciones con `prefers-reduced-motion`. *(RF-5)*
  Verificado: bloque presente en el CSS compilado. Se amplió a `rotate`,
  `translate` y `scale` porque Tailwind 4 no usa `transform` para rotar.
- [x] **T5** — Componentes UI base cartoon: `Button`, `Card`, `Input`, `Badge`,
  `Typography`, `Navbar`, `Footer`. *(RF-3, RF-4)*
  Verificado: `cva` de los 4 componentes con utilidades cartoon; `Badge` gana
  variantes `pink`/`sky`/`mint`/`lavender`; barrido DOM: 0 interactivos sin foco.
- [x] **T6** — `Hero` cartoon: fondo crema, SVG decorativos `aria-hidden`,
  Fredoka display. *(RF-3, RF-7)* Verificado: 19/19 SVG con `aria-hidden`.
- [x] **T7** — Secciones `Categories`, `FeaturedProducts`, `HowItWorks`, `CTA`,
  `QuoteForm`, `QuoteCartForm`. *(RF-3, RF-4, RF-7)*
- [x] **T8** — Páginas públicas: `/`, `/products`, `/products/[slug]`,
  `/novedades`, `/contacto`, `/cotizacion`, `/login`. *(RF-3, RF-4)*
  Verificado: 6×200 y revisión visual por DOM (contorno, sombra, Fredoka, foco).
- [x] **T9** — Páginas admin: `/admin/productos`, `/admin/categorias` (solo
  piel). *(RF-3, RF-4)* Verificado: 307 sin sesión, 200 con ADMIN; 0 restos
  `red-*`/`green-*`; `file:` del input de imagen con borde de tinta.
- [x] **T10** — Barrido grep: cero hex fuera de `docs/DESIGN.md` en `src/**`.
  Verificado: barrido sobre `.tsx/.ts/.css`. Único infractor era
  `src/config/theme.ts` (código muerto con paleta vieja): hex alineados al
  núcleo, **no se borró el archivo**.
- [x] **T11** — Gates: `npm run check` verde. *(RF-9)*
  Verificado: typecheck OK, lint OK, **82/82 tests** (10 suites), build OK
  (15 rutas). Además: rutas 200, reduced-motion presente, foco en todos los
  interactivos, error de login en coral con texto en tinta.
- [x] **T12** — Capturas antes/después, sync al servidor y rebuild/restart de
  producción (con aprobación del usuario para el reinicio).
  Verificado:
  - Capturas en `docs/capturas/002-cartoon-visual/{antes,despues,produccion}/`
    (9 PNG, 1,0 MB). El "antes" se capturó del propio servidor por túnel
    (`ssh -L 3001:localhost:3000 srv`) porque su copia aún tenía el código
    previo: `grep -rl cartoon src | wc -l` → `0` antes del sync.
  - Sync: `tar -czf` local excluyendo `node_modules .next .env
    docker-compose.override.yml *.tsbuildinfo .git` → `scp /tmp` → extracción
    en `~/proyectos/pingo-pop` (respaldo previo en `/tmp/pp-src-backup-002`).
  - Build en servidor: `npm run build` → 15 rutas, `BUILD_ID v7Y4ofSNf4KkeWY_7E8as`,
    sin errores ni warnings.
  - Restart: proceso anterior 25376/25377 parado, puerto 3000 libre; nuevo
    `next-server` PID **44721** arrancado con `setsid nohup npm run start`
    (log `/tmp/pingo-pop-start-002.log`, "Ready in 155ms").
  - Producción: `<html>` con las variables `fredoka_..._variable` y
    `manrope_..._variable` (fix de fuentes); CSS servido con las 7 utilidades
    `.cartoon-*` y los 6 hex `--cartoon-*`; `h1` en **Fredoka 700**, body en
    Manrope, hero `rgb(255,244,214)` (#FFF4D6), borde `2px rgb(42,34,39)`,
    sombra `2px 2px` tinta, 19/19 SVG `aria-hidden`, 0 interactivos sin
    `cartoon-focus`.
  - Rutas: `/`, `/products`, `/cotizacion`, `/contacto`, `/novedades`, `/login`
    → 200; `/admin/productos`, `/admin/categorias` → **307** sin sesión.
  - Auth sin regresión: login correcto 200, contraseña incorrecta **401**,
    usuario inexistente **401** (mismo código, sin enumeración); cookie
    `pp_session` con `HttpOnly`, `Secure`, `SameSite`.

## Notas
- T3 fue bloqueante para T5–T9: los hex finales salen de ahí. Ningún hex se
  ajustó finalmente (los propuestos ya pasaban), pero la regla de texto en
  tinta sí cambió la implementación de los errores.
- Bug **preexistente** detectado durante la verificación, no arreglado (RF-9):
  `QuoteCartProvider` lee `localStorage` pero nunca escribe → el carrito se
  pierde al recargar. Anotado en `MEMORY.md` como límite conocido.
- Bug **preexistente** corregido porque era visual y bloqueaba el requisito de
  tipografía: las fuentes de `next/font` estaban en `<body>` mientras
  `--font-heading`/`--font-body` se declaraban en `:root`, así que ninguna
  fuente se aplicaba. Ver `MEMORY.md`.
- Ninguna tarea requirió dependencia nueva (RF-8).