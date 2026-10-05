import { z } from "zod";

import { hasControlChars } from "@/lib/control-chars";

/** Convierte un nombre en un slug seguro para la URL. */
function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export { slugify };

/** Reglas comunes de texto corto: sin caracteres de control, longitud acotada. */
const shortText = (max: number) =>
  z
    .string({ error: "Se espera un texto" })
    .trim()
    .min(1, "No puede estar vacio")
    .max(max, `No puede pasar de ${max} caracteres`)
    .refine((value) => !hasControlChars(value), {
      message: "Contiene caracteres no permitidos",
    });

/** Slug: solo minusculas, digitos y guiones. Evita traversal en la URL. */
const slugText = shortText(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
  message: "El slug solo admite minusculas, digitos y guiones",
});

/**
 * Ruta de imagen ya almacenada. Solo admitimos nuestras propias rutas.
 *
 * Una cadena vacia (o de solo espacios) se traduce a ausencia, no a error. En un
 * formulario "sin imagen" es lo normal, y el cliente envia `""` tal cual porque
 * `JSON.stringify` conserva la cadena vacia y solo descarta `undefined`. Si aqui
 * se rechazara, el administrador no podria crear ningun producto sin imagen.
 *
 * Se normaliza en el `preprocess` y no despues porque el `.regex` corre antes
 * que cualquier `.transform`: la cadena vacia tiene que dejar de ser cadena
 * antes de llegar a la expresion regular.
 */
const imagePath = z.preprocess(
  (valor) =>
    typeof valor === "string" && valor.trim() === "" ? undefined : valor,
  z
    .string({ error: "Se espera una ruta de imagen" })
    .trim()
    .max(300)
    .regex(/^\/uploads\/products\/[a-f0-9]{32}\.(jpg|png|webp)$/, {
      message: "Ruta de imagen no valida",
    })
    .nullish(),
);

/** Texto largo opcional, con el mismo control de caracteres que el corto. */
const longText = (max: number) =>
  z
    .string({ error: "Se espera un texto" })
    .trim()
    .max(max, `No puede pasar de ${max} caracteres`)
    .refine((value) => !hasControlChars(value), {
      message: "Contiene caracteres no permitidos",
    })
    .nullish();

/** Id numerico de un registro. */
const recordId = z.coerce
  .number({ error: "Se espera un numero" })
  .int("Debe ser un numero entero")
  .positive("Debe ser mayor que cero");

/** Importe con dos decimales, en un rango razonable. */
const price = z.coerce
  .number({ error: "El precio no es valido" })
  .positive("El precio debe ser mayor que cero")
  .max(1_000_000, "El precio no puede pasar de 1000000");

/** Alta de producto. */
export const CreateProductSchema = z.object({
  name: shortText(120),
  slug: slugText.optional(),
  description: longText(4000),
  price,
  categoryId: recordId,
  featured: z.coerce.boolean().default(false),
  image: imagePath,
});

/** Edicion de producto: `id` obligatorio y el resto igual que en el alta. */
export const UpdateProductSchema = CreateProductSchema.extend({
  id: recordId,
  active: z.coerce.boolean().default(true),
});

/** Baja logica de producto. */
export const DeleteProductSchema = z.object({
  id: recordId,
});

/** Alta de categoria. */
export const CreateCategorySchema = z.object({
  name: shortText(120),
  slug: slugText.optional(),
  description: longText(2000),
});

/** Tipo de salida de `CreateProductSchema` tras aplicar el parseo. */
export type CreateProductInput = z.infer<typeof CreateProductSchema>;

/** Tipo de salida de `UpdateProductSchema` tras aplicar el parseo. */
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;

/** Tipo de salida de `CreateCategorySchema` tras aplicar el parseo. */
export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;

/**
 * Construye la respuesta de error de validacion.
 *
 * Solo devuelve el primer problema de cada campo para no filtrar el mapa
 * completo de reglas al cliente.
 */
export function validationError(
  issues: { path: PropertyKey[]; message: string }[],
): { error: string; fields: Record<string, string> } {
  const fields: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.length > 0 ? String(issue.path[0]) : "form";
    fields[key] ??= issue.message;
  }
  return { error: "Datos invalidos", fields };
}