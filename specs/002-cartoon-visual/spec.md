# Spec: Pingo POP — Rediseño visual cartoon (002-cartoon-visual)

> Estado: **APROBADA por el usuario (5 oct 2026) e IMPLEMENTADA** — T1–T11
> cerradas y verificadas; T12 (capturas + despliegue en servidor) pendiente.
> Fecha: 2026-10-05. Spec base: `001-pingo-rework` (completada).

## 1. Problema

La web funciona pero "se ve muy IA": superficies planas, gris sobre gris,
sombras suaves genéricas, cero personalidad. La marca vende pines, botones y
figuras 3D personalizadas — productos físicos, artesanales y alegres — y la
interfaz actual no transmite nada de eso.

## 2. Objetivo

Rediseño **visual** estilo cartoon/sticker con una paleta **más amplia** que
**respete el núcleo original** (ámbar `#F7B92C` como color héroe, tinta
`#2A2227` como contorno). Sin tocar lógica, APIs, seguridad ni datos.

## 3. Decisiones bloqueadas (con su porqué)

- **Fredoka ya está cargada** (`next/font/google` en `layout.tsx`) y es la
  display cartoon canónica (confirmado con el dataset ui-ux-pro-max: pairing
  "Playful Creative" = Fredoka + Nunito). Se mantiene; el cuerpo sigue con
  Manrope (ya cargada) — no se añade una tercera fuente.
- **Cero dependencias nuevas**: todo el lenguaje cartoon se logra con CSS
  (bordes gruesos, sombras duras desplazadas, radios grandes) y SVG inline
  decorativo. React Bits (recurso #23 de la colección) queda como referencia
  de animación, no como dependencia.
- **`docs/DESIGN.md` pasa a ser la única fuente de verdad de la paleta**:
  núcleo + extensión documentadas ahí; `globals.css` las implementa.
  Ningún hex fuera de ese documento (regla ya actualizada en `AGENTS.md`
  y `docs/constitution.md`).
- **Hex literal en clases**: convención histórica del proyecto; se mantiene
  para los nuevos colores también (vía tokens de `globals.css`).

## 4. Paleta

### 4.1 Núcleo (NO se altera)

| Token | Hex | Rol |
|---|---|---|
| `--accent` | `#F7B92C` | Ámbar héroe: CTAs, acentos, foco |
| `--primary` | `#2A2227` | Tinta: texto, contornos cartoon |
| `--foreground-muted` | `#707070` | Texto secundario |
| `--border` | `#ECECEC` | Bordes suaves residuales |
| `--card` | `#FAFAFA` | Superficie base |
| `--background-secondary` | `#fcfcfc` | Fondo alterno |
| `--background` | `#ffffff` | Fondo |

### 4.2 Extensión cartoon (NUEVA — validada en T3, sin ajustes)

| Token nuevo | Hex propuesto | Uso |
|---|---|---|
| `--cartoon-pink` | `#FF6B9D` | Insignias, stickers, hover lúdico |
| `--cartoon-sky` | `#4FC3F7` | Acentos secundarios, iconos |
| `--cartoon-mint` | `#4ADE80` | Estados de éxito, badges |
| `--cartoon-lavender` | `#A78BFA` | Categorías, decoración |
| `--cartoon-coral` | `#F87171` | Errores / destructivo suave |
| `--cartoon-cream` | `#FFF4D6` | Fondos de sección cálidos (deriva del ámbar) |

Reglas: todo texto sobre colores de extensión va en tinta `#2A2227`
(contraste verificado ≥ 4.5:1 en T3; si alguno no llega, se oscurece el hex
documentando el ajuste en `docs/DESIGN.md`). Los colores de extensión nunca
sustituyen al ámbar en CTAs primarios.

**Resultado de T3:** los seis props pasan con texto en tinta (5.60–14.13:1), sin
necesidad de ajustar hexes. Blanco sobre rosa/coral da 2.68–2.77:1, así que queda
prohibido; por eso los errores se muestran como sticker coral con texto en tinta
en lugar de texto rojo.

## 5. Lenguaje visual cartoon

1. **Contorno de tinta**: bordes de 2–3px sólidos `#2A2227` en tarjetas,
   botones, inputs, badges e imágenes de producto (efecto sticker).
2. **Sombra dura desplazada**: `box-shadow: 4px 4px 0 #2A2227` (sin blur) en
   tarjetas y botones; 6–8px en elementos destacados.
3. **Radios**: se mantienen los actuales (16px botones/inputs, 24px
   tarjetas/imágenes) — ya son cartoon-friendly.
4. **Hover "squishy"**: `translate(-2px)` + sombra que crece; en `active`
   `translate(2px)` + sombra que se encoge (efecto pegatina aplastada).
   Transiciones 150–250ms `ease-out`.
5. **Rotaciones lúdicas**: stickers/badges con `rotate(-3deg..3deg)` y
   micro-rotación en hover de tarjetas de producto (±1.5deg).
6. **Formas decorativas SVG inline**: estrellas, blobs y squiggles en
   secciones hero/fondos, siempre `aria-hidden="true"`.
7. **Tipografía**: Fredoka 600–700 para headings; escala actual se mantiene.
8. **Foco visible**: anillo ámbar `#F7B92C` 3px con offset, nunca eliminado.

## 6. Alcance

**Dentro:** `globals.css` (tokens + utilidades), estilos de componentes UI
(`Button`, `Card`, `Input`, `Badge`, `Typography`), layout (`Navbar`,
`Footer`, `Container`, `MainLayout`), secciones (`Hero`, `Categories`,
`FeaturedProducts`, `HowItWorks`, `CTA`, `QuoteForm`, `QuoteCartForm`),
páginas públicas y de admin (15 rutas), `docs/DESIGN.md` (reescritura con la
paleta núcleo+extensión).

**Fuera:** lógica, route handlers, auth, middleware, validación Zod, uploads,
Prisma, seeds, tests de seguridad (no cambian), dependencias nuevas, modo
oscuro, librerías de animación JS, cambios de contenido/copy.

## 7. Requisitos (EARS)

- **RF-1** (Ubicuo): El sistema mantendrá sin cambios los 7 hex del núcleo
  (`#F7B92C`, `#2A2227`, `#707070`, `#ECECEC`, `#FAFAFA`, `#fcfcfc`,
  `#ffffff`) en `src/app/globals.css`.
- **RF-2** (Ubicuo): El sistema implementará la paleta extendida como tokens
  CSS en `globals.css`, idénticos a los documentados en `docs/DESIGN.md`.
- **RF-3** (Ubicuo): Toda tarjeta, botón, input y badge visible usará contorno
  de tinta 2–3px y sombra dura desplazada del lenguaje cartoon (§5.1–5.2).
- **RF-4** (Ubicuo): Todo elemento interactivo tendrá estado hover y active
  "squishy" con transición de 150–250ms, y estado focus visible con anillo
  ámbar.
- **RF-5** (Evento): WHEN el usuario tenga `prefers-reduced-motion` activo,
  el sistema suprimirá rotaciones, traslaciones y animaciones decorativas.
- **RF-6** (No deseado): IF un texto sobre fondo de color de extensión no
  alcanza contraste 4.5:1, THEN se usará texto en tinta `#2A2227` y, si aun
  así no llega, se ajustará el hex documentándolo en `docs/DESIGN.md`.
- **RF-7** (Ubicuo): Los elementos decorativos (formas SVG) serán
  `aria-hidden="true"` y no portarán información.
- **RF-8** (No deseado): IF un cambio visual requiere una dependencia nueva,
  THEN se descarta o se documenta la justificación antes de instalarla.
- **RF-9** (Ubicuo): Ningún cambio alterará comportamiento funcional: APIs,
  auth, roles, uploads, rate limit y tests existentes quedan intactos.
- **RF-10** (Ubicuo): `docs/DESIGN.md` quedará reescrito con la paleta
  núcleo+extensión y el lenguaje cartoon como referencia permanente.

## 8. Criterios de aceptación

1. `npm run check` en verde (typecheck, lint, 82/82 tests, build).
2. Barrido: ningún hex fuera de `docs/DESIGN.md` en `src/**` (grep).
3. Contraste texto/fondo ≥ 4.5:1 en todos los pares nuevos (verificación T3).
4. Checklist visual cartoon presente en las 15 rutas (contorno, sombra dura,
   squishy hover, Fredoka en headings).
5. `prefers-reduced-motion` verificado desactivando animaciones.
6. Aspecto "no genérico": capturas antes/después adjuntas en la revisión.

## 9. Riesgos

| Riesgo | Mitigación |
|---|---|
| Romper las 15 páginas con cambios masivos | Componentes UI primero (Button/Card/Input/Badge); páginas heredan; verificación ruta a ruta |
| Contraste insuficiente en colores nuevos | T3 dedicada a medir y ajustar hex antes de aplicar |
| "Payaso" en vez de "cartoon": exceso de color | El ámbar manda en CTAs; los apoyos solo en badges/decoración; máximo 1 color de apoyo por componente |
| Drift doc↔código | `docs/DESIGN.md` se reescribe en la misma entrega (RF-10) |
