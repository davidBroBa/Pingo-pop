# Plan: Pingo POP — Persistencia del carrito de cotización (003-quote-cart-persistence)

> Estrategia: **test-first puro y módulo sin DOM**. Primero los tests del módulo
> puro (se ven fallar porque el módulo todavía no existe), después el módulo, y
> solo al final se toca el componente de React. Motivo: el runner es
> `node:test` sin jsdom, así que toda la lógica comprobable tiene que vivir fuera
> del componente. El componente se queda con un efecto de tres líneas.
>
> Decisiones D1–D7 de la spec (`spec.md` §3) ya bloqueadas: no se debaten aquí.

## Fase 0 — Aprobación (T1)
- Marcar la spec aprobada y registrar la decisión en `MEMORY.md`.
- Sin código.

## Fase 1 — Tests primero (T2)
- `tests/quote-cart-storage.test.ts` con los 13 casos de la spec §8.
- **Ejecutarlos y verlos fallar** antes de que exista el módulo. Un test que
  nunca se vio rojo no demuestra nada.
- Cubre RF-3, RF-4, RF-5, RF-10.

## Fase 2 — Módulo puro (T3)
- `src/lib/quote-cart-storage.ts`:
  - `STORAGE_KEY` (la clave que ya usaba el contexto, sin cambios).
  - `QuoteCartItemSchema` (Zod): `id` entero positivo; `name`/`slug` no vacíos y
    acotados; `price` acotada **y** `Number.isFinite(Number(v))` para cerrar el
    `NaN`; `image` cadena acotada o `null`; `quantity` entero 1–10000.
  - `QuoteCartSchema` = array con **máximo 50** (el mismo tope que
    `CreateQuoteSchema` en el servidor).
  - `parseStoredCart(raw)`: `null`/vacío/>64 KiB → `[]`; JSON inválido → `[]`;
    no es array → `[]`; Zod falla → `[]`; si no, el array validado.
  - `serializeCart(items)`: `JSON.stringify`.
  - El tipo `QuoteCartItem` **se infiere del esquema**, para que no pueda haber
    dos definiciones que diverjan.
- Cubre RF-3, RF-4, RF-5, RF-10, RF-11.

## Fase 3 — Conectar el contexto (T4)
- `src/context/QuoteCartContext.tsx`:
  - Importa el módulo y **re-exporta** el tipo, para no romper a quien lo importe.
  - El inicializador de `useState` pasa a llamar a `parseStoredCart`, dentro de
    `try/catch` (RF-6 también cubre la lectura: si `localStorage` está
    deshabilitado, no debe romperse la página).
  - `useEffect` sobre `[items]`: vacío → `removeItem`; si no → `setItem`, todo en
    `try/catch`. Es idempotente y **auto-repara** la entrada corrupta.
  - Los cuatro mutadores (`addItem`, `removeItem`, `updateQuantity`, `clearCart`)
    **no se tocan**.
- Cubre RF-1, RF-2, RF-6, RF-7.

## Fase 4 — Vaciar tras enviar (T5)
- `src/app/cotizacion/page.tsx`: el `onSuccess` hace `setSubmitted(true)` **y**
  `clearCart()`. El efecto de la fase 3 ve el carrito vacío y borra la clave solo.
- El formulario **no** se toca: no debe conocer el carrito.
- Cubre RF-8.

## Fase 5 — Verificación (T6, T7)
- **T6** — `npm run check`: typecheck + lint + **82 tests existentes sin tocar** +
  los nuevos + build. Los 82 tienen que seguir pasando: si esta spec los rompe, es
  una regresión.
- **T7** — Manual en navegador, que es lo único que los tests no cubren:
  1. Añadir productos → recargar → **siguen** (RF-2).
  2. Cambiar cantidades → recargar → **conservadas** (RF-1).
  3. "Vaciar cotización" → recargar → vacía y **clave borrada** (RF-7).
  4. Enviar la solicitud → recargar → carrito **vacío** (RF-8).
  5. DevTools: `pingo-quote-cart` = `{"a":1}` → recargar → la página funciona con
     el carrito vacío (RF-4).
  6. DevTools: la clave con 999999 caracteres → la página carga igual (RF-5).
- Cubre RF-1 a RF-10 en su conjunto.

## Fase 6 — Documentación (T8)
- `docs/THREATS.md`: fila nueva — el almacenamiento del cliente es entrada no
  confiable y se valida con Zod.
- `docs/SDD.md`: §5 arquitectura y §9 testing mencionan el módulo puro.
- `README.md`: desaparece el límite conocido del carrito.
- `MEMORY.md` y `CHANGELOG.md`: estado real.
- `tasks.md`: checkboxes con la nota de verificación de cada tarea.

## Archivos tocados

| Archivo | Acción |
|---|---|
| `src/lib/quote-cart-storage.ts` | **Nuevo** — esquema, `parseStoredCart`, `serializeCart`, `STORAGE_KEY` |
| `tests/quote-cart-storage.test.ts` | **Nuevo** — 13 casos |
| `src/context/QuoteCartContext.tsx` | Import + inicializador + `useEffect` |
| `src/app/cotizacion/page.tsx` | `clearCart()` en `onSuccess` |
| `docs/THREATS.md`, `docs/SDD.md`, `README.md`, `MEMORY.md`, `CHANGELOG.md` | Documentación |

**Total: 4 de código (2 nuevos) + 5 de documentación.** Cero dependencias.

## Lo que esta spec NO toca

Los mutadores del contexto, `POST /api/quotes`, `quote-schema.ts`, la base de
datos, la autenticación, cualquier clase visual, `package.json` y los 82 tests
existentes. Si algo de eso necesita cambiar, es otra spec.