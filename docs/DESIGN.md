# DESIGN.md — Diseño y paleta (Pingo POP)

> **Fuente de verdad de la paleta.** Ningún hex en `src/**` puede aparecer
> aquí. Vigente desde la spec `002-cartoon-visual` (rediseño cartoon).
> Sustituye a la versión "SAGRADA, no modificar": el núcleo sigue intacto,
> pero ahora existe una extensión documentada.
>
> Comparativa visual del cambio: `docs/capturas/002-cartoon-visual/`
> (`antes/` = estado previo, `despues/` = local, `produccion/` = servidor).
> Contiene solo catálogo de demostración, nada de administración ni de sesión.

## 1. Núcleo de marca (NO se altera)

| Token (`globals.css`) | Hex | Uso |
|---|---|---|
| `--accent` | `#F7B92C` | Ámbar héroe: CTAs primarios, acentos, anillo de foco |
| `--primary` | `#2A2227` | Tinta: texto principal, contornos cartoon, sombras duras |
| `--foreground-muted` | `#707070` | Texto secundario |
| `--border` | `#ECECEC` | Bordes suaves residuales (no cartoon) |
| `--card` | `#FAFAFA` | Superficie base de tarjetas |
| `--background-secondary` | `#fcfcfc` | Fondo alterno |
| `--background` | `#ffffff` | Fondo general |

## 2. Extensión cartoon (spec 002)

| Token | Hex | Uso |
|---|---|---|
| `--cartoon-pink` | `#FF6B9D` | Insignias, stickers, detalles lúdicos |
| `--cartoon-sky` | `#4FC3F7` | Acentos secundarios, iconos, pasos |
| `--cartoon-mint` | `#4ADE80` | Éxito, badges de estado |
| `--cartoon-lavender` | `#A78BFA` | Categorías, decoración |
| `--cartoon-coral` | `#F87171` | Errores / destructivo suave |
| `--cartoon-cream` | `#FFF4D6` | Fondos de sección cálidos (deriva del ámbar) |

**Reglas de uso:**
1. El ámbar `#F7B92C` manda en CTAs primarios; los colores de apoyo solo en
   badges, stickers, iconos y decoración. **Máximo 1 color de apoyo por
   componente** (cartoon, no payaso).
2. **Texto sobre colores de extensión SIEMPRE en tinta `#2A2227`** — nunca
   en blanco (blanco sobre rosa/coral da 2.7:1, insuficiente).
3. El coral es el único tono para errores; la menta para éxito.

### Contraste verificado (WCAG, medido el 2026-10-05)

| Par | Ratio | Veredicto |
|---|---|---|
| tinta / ámbar | 8.79:1 | ✅ |
| tinta / rosa | 5.78:1 | ✅ |
| tinta / cielo | 7.73:1 | ✅ |
| tinta / menta | 8.88:1 | ✅ |
| tinta / lavanda | 5.69:1 | ✅ |
| tinta / coral | 5.60:1 | ✅ |
| tinta / crema | 14.13:1 | ✅ |
| tinta / blanco | 15.48:1 | ✅ |
| muted / blanco | 4.95:1 | ✅ |
| blanco / rosa · coral | 2.68–2.77:1 | ❌ prohibido |

## 3. Lenguaje cartoon

1. **Contorno de tinta**: `2px solid #2A2227` (3px en elementos destacados)
   en tarjetas, botones, inputs, badges e imágenes de producto.
2. **Sombra dura**: `box-shadow: 4px 4px 0 #2A2227` (6–8px en destacados).
   Sin blur: la sombra es una silueta desplazada, no una niebla.
3. **Radios**: 16px botones/inputs, 24px tarjetas/imágenes (ya existentes).
4. **Squishy hover**: `translate(-2px)` y la sombra crece a `6px 6px 0`;
   en `:active`, `translate(2px)` y la sombra baja a `2px 2px 0`.
   Transición 150–250ms `ease-out`.
5. **Rotaciones lúdicas**: stickers/badges `rotate(-3deg..3deg)`; tarjetas
   de producto ±1.5deg en hover.
6. **Decoración**: formas SVG inline (estrellas, blobs, squiggles) siempre
   `aria-hidden="true"`.
7. **Tipografía**: Fredoka 600–700 en headings (ya cargada vía `next/font`);
   Manrope en cuerpo.
8. **Foco**: anillo `3px solid #F7B92C` con offset 2px. Nunca `outline: none`.
9. **Movimiento**: con `prefers-reduced-motion`, sin rotaciones, traslaciones
   ni animaciones decorativas (media query global en `globals.css`).

## 4. Implementación

Tokens y utilidades en `src/app/globals.css` (`.cartoon-border`,
`.cartoon-shadow`, `.cartoon-hover`, …). Componentes base en
`src/components/ui/*`; de ellos heredan las 15 páginas.

## 5. Layout

App Router. Componentes co-ubicados. Estilos globales en `src/app/globals.css`
(con tokens `@theme` de Tailwind 4).

## 6. Historial de decisiones

- **2026-10-05 (spec 002):** rediseño cartoon aprobado por el usuario. Se
  amplía la paleta (§2) manteniendo el núcleo (§1). Cero dependencias nuevas:
  CSS + SVG inline. React Bits queda como referencia, no como dependencia.
- **Antes:** paleta "sagrada" 1:1 sin extensión (ver git/backup histórico).
