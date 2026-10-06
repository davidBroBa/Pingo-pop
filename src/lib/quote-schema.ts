import { z } from "zod";

import { hasControlChars } from "@/lib/control-chars";

/** Linea de producto dentro de una solicitud de cotizacion. */
const QuoteItemSchema = z.object({
  productId: z.coerce
    .number({ error: "El producto no es valido" })
    .int("El producto no es valido")
    .positive("El producto no es valido"),
  quantity: z.coerce
    .number({ error: "La cantidad no es valida" })
    .int("La cantidad debe ser un numero entero")
    .min(1, "La cantidad debe ser al menos 1")
    .max(10_000, "La cantidad maxima es 10000"),
});

/** Solicitud de cotizacion tal como llega del formulario publico. */
export const CreateQuoteSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Escribe tu nombre.")
    .max(120)
    .refine((value) => !hasControlChars(value), {
      message: "El nombre contiene caracteres no permitidos",
    }),
  email: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().email("Email no valido").max(254).nullish(),
  ),
  phone: z
    .string()
    .trim()
    .min(6, "Escribe un telefono de contacto.")
    .max(40)
    .refine((value) => !hasControlChars(value), {
      message: "El telefono contiene caracteres no permitidos",
    }),
  details: z
    .string()
    .trim()
    .min(10, "Cuentanos un poco mas sobre lo que necesitas.")
    .max(2000)
    .refine((value) => !hasControlChars(value), {
      message: "Los detalles contienen caracteres no permitidos",
    }),
  items: z
    .array(QuoteItemSchema)
    .min(1, "Elige al menos un producto")
    .max(50, "No puedes cotizar mas de 50 productos"),
});

/** Tipo de salida de `CreateQuoteSchema` tras aplicar el parseo. */
export type CreateQuoteInput = z.infer<typeof CreateQuoteSchema>;