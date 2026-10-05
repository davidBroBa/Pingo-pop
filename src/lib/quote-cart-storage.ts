import { z } from "zod";

import { imagePath, shortText, slugText } from "@/lib/validation";

/**
 * Lectura y escritura del carrito de cotizacion en `localStorage`.
 *
 * El carrito es **entrada no confiable**: vive en el navegador del usuario, que
 * puede editarlo desde las herramientas de desarrollo o dejar una version
 * antigua de una sesion previa. Por eso lo que sale de aqui siempre pasa por un
 * esquema y, si algo no cuadra, se devuelve un carrito vacio. Nunca se lanza una
 * excepcion hacia la interfaz: un carrito roto no puede dejar la pagina sin
 * servir.
 *
 * Este modulo **no toca el DOM** a proposito. Asi se puede testear con
 * `node:test`, que en este proyecto no tiene jsdom.
 */

/** Clave de `localStorage` donde vive el carrito. No cambiar sin migrar. */
export const STORAGE_KEY = "pingo-quote-cart";

/**
 * Tope del texto guardado, en caracteres.
 *
 * No es un limite de negocio: es la frontera contra analisar entradas
 * patologicas. Un carrito de 50 productos legitimos ocupa unos pocos kilobytes.
 */
export const MAX_STORED_CART_LENGTH = 64 * 1024;

/** Maximo de productos, alineado con `CreateQuoteSchema` del servidor. */
export const MAX_CART_ITEMS = 50;

/** Maximo por producto, alineado con `CreateQuoteSchema` del servidor. */
export const MAX_ITEM_QUANTITY = 10_000;

/**
 * Precio del producto tal como lo muestra el catalogo: el Decimal de Prisma
 * convertido a cadena.
 *
 * Se comprueba que sea un numero finito porque la pagina hace
 * `Number(item.price) * item.quantity` para el total estimado: sin esta
 * comprobacion, un valor manipulado se pintaria como "NaN MXN".
 */
const cartPrice = z
  .string({ error: "Se espera un precio" })
  .trim()
  .min(1, "No puede estar vacio")
  .max(32, "Precio demasiado largo")
  .refine(
    (value) => Number.isFinite(Number(value)) && Number(value) > 0,
    "El precio no es valido",
  );

/** Un producto dentro del carrito, ya validado. */
export const QuoteCartItemSchema = z.object({
  id: z
    .number({ error: "El producto no es valido" })
    .int("El producto no es valido")
    .positive("El producto no es valido"),
  name: shortText(120),
  slug: slugText,
  price: cartPrice,
  // `imagePath` ya rechaza rutas externas y normaliza "" a ausencia; el
  // `transform` deja siempre `string | null` para que el tipo no dependa de si
  // la clave venia presente o no.
  image: imagePath.transform((value) => value ?? null),
  quantity: z
    .number({ error: "La cantidad no es valida" })
    .int("La cantidad debe ser un numero entero")
    .min(1, "La cantidad debe ser al menos 1")
    .max(MAX_ITEM_QUANTITY, `La cantidad maxima es ${MAX_ITEM_QUANTITY}`),
});

/** Carrito completo, con los mismos topes que aplica el servidor. */
export const QuoteCartSchema = z.array(QuoteCartItemSchema).max(MAX_CART_ITEMS);

/** Producto del carrito. El tipo se infiere del esquema, no al reves. */
export type QuoteCartItem = z.infer<typeof QuoteCartItemSchema>;

/**
 * Convierte el texto guardado en un carrito usable.
 *
 * Devuelve un array vacio ante cualquier problema: no hay datos, el texto es
 * demasiado grande, el JSON esta corrupto, no es un array, o algun item no
 * cumple el esquema. Es una decision deliberada: preferimos que el usuario
 * empiece un carrito nuevo antes que mostrarle una pagina rota.
 */
export function parseStoredCart(raw: string | null): QuoteCartItem[] {
  if (!raw || raw.length > MAX_STORED_CART_LENGTH) {
    return [];
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  const result = QuoteCartSchema.safeParse(parsed);

  return result.success ? result.data : [];
}

/** Prepara el carrito para guardarlo. */
export function serializeCart(items: QuoteCartItem[]): string {
  return JSON.stringify(items);
}