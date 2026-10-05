# Plan: Pingo POP — Rediseño visual cartoon (002-cartoon-visual)

> Estrategia: **de los tokens hacia afuera**. Primero `globals.css` y los
> componentes UI base (de ellos heredan las 15 páginas), luego secciones,
> luego páginas. Verificación ruta a ruta al final. CSS puro + SVG inline;
> sin dependencias nuevas.

## Fase 0 — Documentación viva (T1)
- Reescribir `docs/DESIGN.md`: paleta núcleo+extensión, lenguaje cartoon
  (contorno, sombra dura, squishy, radios, foco), reglas de uso del color.
- Es la fuente de verdad que luego se implementa. Cubre RF-10.

## Fase 1 — Tokens y utilidades (T2, T3, T4)
- `globals.css`: añadir tokens `--cartoon-*` (§4.2 de la spec), utilidades
  reutilizables del lenguaje: `.cartoon-border`, `.cartoon-shadow`,
  `.cartoon-hover` (squishy), anillo de foco ámbar, media query
  `prefers-reduced-motion` global.
- **T3 (contraste)**: medir cada par texto/fondo nuevo contra 4.5:1
  (script local o cálculo manual documentado); ajustar hex que no lleguen y
  anotarlo en `docs/DESIGN.md`. Bloquea el resto de fases.
- Cubre RF-1, RF-2, RF-5, RF-6.

## Fase 2 — Componentes UI base (T5)
- `Button`, `Card`, `Input`, `Badge`, `Typography` (en
  `src/components/ui/*`): contorno 2–3px tinta, sombra dura, squishy
  hover/active, foco visible.
- `Navbar` y `Footer`: contorno inferior/superior de tinta, badges lúdicos.
- Cubre RF-3, RF-4.

## Fase 3 — Secciones (T6, T7)
- `Hero`: fondo crema + formas SVG decorativas (estrellas/blobs,
  `aria-hidden`), título Fredoka grande, CTA ámbar cartoon.
- `Categories`, `FeaturedProducts`: tarjetas-sticker con rotación lúdica,
  badges de color de apoyo (1 por componente).
- `HowItWorks`, `CTA`, `QuoteForm`, `QuoteCartForm`: mismo lenguaje en
  pasos, inputs y botones.
- Cubre RF-3, RF-4, RF-7.

## Fase 4 — Páginas (T8, T9)
- Públicas: `/`, `/products`, `/products/[slug]`, `/novedades`, `/contacto`,
  `/cotizacion`, `/login`.
- Admin: `/admin/productos`, `/admin/categorias` (mismo lenguaje, sin tocar
  lógica ni tablas de datos: solo piel).
- Cubre RF-3, RF-4.

## Fase 5 — Verificación y cierre (T10, T11, T12)
- T10: barrido grep — ningún hex fuera de `docs/DESIGN.md` en `src/**`.
- T11: gates completos (`npm run check`) + revisión ruta a ruta (15) en
  navegador + `prefers-reduced-motion` + responsive 375/768/1440.
- T12: capturas antes/después, actualizar `MEMORY.md`, sync al servidor.
- Cubre RF-8, RF-9 + criterios de aceptación §8.

## Archivos tocados (estimado)

| Área | Archivos |
|---|---|
| Tokens | `src/app/globals.css` |
| Doc | `docs/DESIGN.md` |
| UI base | `src/components/ui/{Button,Card,Input,Badge,Typography}/*` |
| Layout | `src/components/layout/{Navbar,Footer,Container,MainLayout}/*` |
| Secciones | `src/components/sections/*` |
| Páginas | `src/app/**/page.tsx` (solo clases/estilos) |

**No se toca:** `src/lib/**`, `src/app/api/**`, `src/middleware.ts`,
`prisma/**`, `tests/**`, `package.json`.
