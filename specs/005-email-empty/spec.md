# Spec: Pingo POP - Email opcional vacío (005-email-empty)

> Estado: **BORRADOR**. Pendiente de ejecución tras aprobación implícita (elegido por el usuario).  
> Fecha: 2026-10-05. Problema encontrado al verificar spec 003 (H1).

## 1. Problema

El formulario de cotización marca el **email como opcional** (`placeholder="Correo electrónico (opcional)"`), pero cuando el usuario no lo rellena, `FormData.get("email")` devuelve **`""`** (cadena vacía). `CreateQuoteSchema` define `email: z.string().trim().email(...).max(254).nullish()`, y una cadena vacía **no** pasa `email()` → Zod rechaza con `Email no valido`, devolviendo **400 "Datos invalidos"** en `POST /api/quotes`.

Ese es el H1 documentado: una vía de negocio rota para quien quiere pedir cotización sin correo.

## 2. Objetivo

Que **email opcional = se envía o se omite**. Si el campo queda vacío (o solo espacios), tratarlo como **ausente** (`undefined`/`null`) para que pase la validación, sin cambiar el comportamiento cuando sí se envía un email válido.

## 3. Alcance

**Incluye:**
- Añadir un `preprocess` en `email` para convertir `""` o strings con solo espacios a `undefined`.
- Mínimo cambio, sin tocar UI, sin tocar carrito, sin tocar BD.
- Mantener `.email("Email no valido")` para emails no vacíos pero mal formados.

**No incluye:**
- Cambiar validación de otros campos.
- Arreglar H2/H3 (ya hechos/documentados).

## 4. Requisitos funcionales (EARS)

- **RF-1:** Si `email === ""` → se trata como ausente (`undefined`).
- **RF-2:** Si `email` tiene solo espacios → se trata como ausente (`undefined`).
- **RF-3:** Si `email` es válido (`usuario@dominio.com`) → se acepta.
- **RF-4:** Si `email` es inválido y no vacío (`"a@"`) → sigue devolviendo error de validación.
- **RF-5:** Cambio **puramente de validación** en borde (schema). No toca el formulario ni la API fuera del esquema.

## 5. Decisión

Usar `preprocess` igual que `imagePath` en otros esquemas: `z.preprocess(v => (typeof v==="string" && v.trim()==="" ? undefined : v), z.string().trim().email(...).max(254).nullish())`. O, más compacto, `z.union([z.literal(""), z.string().trim().email()]).transform(v => v===""?undefined:v)` pero con `.nullish()` al final. La forma más directa y coherente con el resto: preprocess → string opcional válido.

## 6. Archivos a tocar

- `src/lib/quote-schema.ts` (solo línea de `email`)

## 7. Tests

**No necesarios nuevos** (cambio de validación puntual). Verificación manual con `safeParse` y `npm run check`.

## 8. Verificación

- `node -e "..."` o `node --env-file=.env --import tsx` para probar:
  - `""` → OK (sin email)
  - `"   "` → OK
  - `"test@ejemplo.com"` → OK
  - `"a@"` → rechaza
- `npm run check` → exit 0 (107/107)

## 9. Entregable

Cambio mínimo + verificación + commit.