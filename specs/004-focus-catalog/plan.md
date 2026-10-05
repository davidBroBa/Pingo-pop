# Plan: Pingo POP - Enfoque a catálogo existente + fotobotones (004-focus-catalog)

> Spec aprobada por instrucción del usuario (proceder autónomamente). Cambios **puramente copy/UI**. Sin tocar lógica, API, auth, uploads, carrito, BD ni tests.

## 1. Estrategia

La reorientación es exclusivamente de **jerga visible** (textos, CTA, etiquetas). No renombramos tipos, IDs ni rutas. Se busca que el héroe apunte al catálogo existente, que la impresión 3D por archivo deje de ser protagonista y que los fotobotones queden claramente identificados como personalizables.

## 2. Principios

- **Cambios mínimos.** Solo cadenas de texto. Preservar estructura, clases, lógica y atributos.
- **Sin regresiones.** No añadir lógica nueva. Los 107 tests existentes no deben verse afectados.
- **Coherencia.** Usar el mismo tono (cartoon amable) sin inventar colores/hex fuera de `docs/DESIGN.md`.
- **Flujo nivel B.** Plan + tasks antes de tocar código. Verificación con `npm run check`.

## 3. Archivos a modificar

| Fichero | Por qué |
|---|---|
| `src/app/page.tsx` | Hero + secciones: CTA principal "Ver catálogo", énfasis en pines/replinas 3D/acrílicos/otros (catálogo existente). Quitar peso a "personalizado" genérico. |
| `src/app/products/page.tsx` | Títulos/textos de listado: orientados a catálogo. |
| `src/app/products/[slug]/page.tsx` | Ficha de producto: distinguir catálogo vs fotobotón vs impresión 3D por archivo (extra, no hero). |
| `src/app/cotizacion/page.tsx` | Textos: pasar de "personalización/diseño personalizado" a "productos seleccionados/solicitud de cotización". |
| `src/components/navbar/` (o componentes usados en navbar) | Copy: priorizar "Catálogo", evitar "personaliza" como primer verbo. |
| `src/components/sections/` | Ajustar copy de secciones si aparece "personaliza/personalizado" como protagonista. |

## 4. Reglas de implementación

- **Solo copy/UI.** Cero `if` nuevos con lógica de negocio, cero cambios de props, cero renombres.
- **Distinguir por slug/nombre con criterio existente.** No añadir campos. Usar lo que ya hay (slug `fotobotones`/`boton-personalizado` u otros nombres existentes). Si hay ambigüedad, **no inventar**: mantener el texto neutro y no forzar.
- **Impresión 3D por archivo = extra.** Nunca hero. Etiquetado claro y secundario.
- **Fotobotón = único claramente personalizable.** Solo cuando corresponda ese producto.
- **Sin tocar carrito/API/auth/uploads/BD.**

## 5. Verificación

- `npm run typecheck` → 0 errores
- `npm run lint` → 0 errores
- `npm run test` → 107/107
- `npm run build` → OK (15 rutas)
- `npm run check` → exit 0

## 6. Entregable

Código + `tasks.md` marcadas + documentación mínima (`MEMORY.md`, `CHANGELOG.md`) y commit/push.