import { z } from "zod";

import { hasControlChars } from "@/lib/control-chars";
import { hayQuePedirConsentimiento } from "@/lib/consent";
import {
  DOCUMENTO_POR_TIPO,
  sonVersionesValidas,
  versionDe,
  type TipoLegalDoc,
} from "@/lib/legal-versions";

/**
 * Version mostrada de un documento: `1.0`, `1.1`. Corta y acotada.
 *
 * No se acepta **cualquier** cadena porque lo que se registra es prueba (RF-21):
 * si el valor no es una version del registro, el registro no demuestra nada. El
 * contraste de verdad lo hace `sonVersionesValidas()` mas abajo, contra
 * `legal-versions.ts`, que es el modulo unico del que salen version y fecha (RF-6).
 */
const versionMostrada = z
  .string({ error: "Falta la version del documento" })
  .trim()
  .min(1, "Falta la version del documento")
  .max(20, "La version del documento no es valida");

/**
 * Version de un documento **tal y como la pondria el visitante que la leyo**.
 *
 * El `default` es la decision de fondo de este bloque, y conviene entenderla:
 * **la version que se registra la pone el servidor, no el cliente.** El motivo
 * es que la version vigente es un dato del servidor, y es el unico que no se
 * puede falsear: si el cliente declara una version, se contrasta con la del
 * registro y, si no coincide, el envio es un 400. Asi el registro nunca puede
 * decir que alguien acepto un texto que el sitio no estaba publicando.
 *
 * El navegador **no** manda la version, y no es un descuido. Importar
 * `legal-versions.ts` desde un componente de cliente arrastraria su
 * `node:crypto` al paquete del navegador: son ~800 KB de `crypto-browserify` en
 * una pagina que no calcula ni un hash. Por eso la casilla del formulario solo
 * **enlaza** a los dos documentos (que son los que muestran su version, RF-6) y
 * no lleva el numero escrito al lado.
 */
const versionDeLaCasilla = (tipo: TipoLegalDoc) =>
  versionMostrada.default(versionDe(DOCUMENTO_POR_TIPO[tipo]) ?? "");

/**
 * La casilla de aceptacion del formulario de cotizacion (RF-19).
 *
 * Tres reglas, y las tres estan aqui dentro y no en el endpoint:
 *
 *  1. **`acepta` es `z.literal(true)`.** No vale `"on"` del checkbox, ni `1`, ni
 *     `true` como texto. Sin la afirmacion no hay parseo, y por tanto **ni una
 *     fila**: es la forma de que RF-19 no dependa de una comprobacion que se
 *     pueda olvidar.
 *  2. **Las versiones tienen que ser las vigentes.** `sonVersionesValidas()` las
 *     contrasta contra el registro de `legal-versions.ts`. Un cliente con una
 *     pagina abierta de antes de un cambio de version recibe un 400 en vez de
 *     dejar un registro que dice una version que no es la que se lenio.
 *  3. **Cookies solo se validan si se muestran** (P6). Hoy
 *     `TECNOLOGIAS_NO_ESENCIALES` esta vacia, asi que no hay casilla de cookies y
 *     su version se contrasta contra la vigente para no exigir un dato que el
 *     visitante nunca vio. Cuando se anada una tecnologia no esencial, el
 *     esquema empieza a exigirla **sin tocar este fichero**: lo decide
 *     `hayQuePedirConsentimiento()`.
 */
export const AceptacionSchema = z
  .object({
    acepta: z.literal(true, {
      error: "Tienes que aceptar los terminos y el aviso de privacidad.",
    }),
    terminos: versionDeLaCasilla("TERMINOS"),
    privacidad: versionDeLaCasilla("PRIVACIDAD"),
    // Cookies solo se aceptan si se muestran (P6). Hoy
    // `TECNOLOGIAS_NO_ESENCIALES` esta vacia, asi que no hay casilla de cookies y
    // su version se contrasta contra la vigente para no exigir un dato que el
    // visitante nunca vio. Cuando se anada una tecnologia no esencial, el esquema
    // empieza a exigirla **sin tocar este fichero**: lo decide
    // `hayQuePedirConsentimiento()`.
    cookies: hayQuePedirConsentimiento()
      ? versionDeLaCasilla("COOKIES")
      : versionDeLaCasilla("COOKIES").optional(),
  })
  .refine(
    (aceptacion) =>
      sonVersionesValidas({
        [DOCUMENTO_POR_TIPO.TERMINOS]: aceptacion.terminos,
        [DOCUMENTO_POR_TIPO.PRIVACIDAD]: aceptacion.privacidad,
        [DOCUMENTO_POR_TIPO.COOKIES]:
          aceptacion.cookies ?? versionDe(DOCUMENTO_POR_TIPO.COOKIES) ?? "",
      }),
    {
      message: "Los documentos se han actualizado. Recarga la pagina y vuelve a aceptarlos.",
      path: ["acepta"],
    },
  );

/** Tipo de la casilla ya validada. */
export type AceptacionInput = z.infer<typeof AceptacionSchema>;

/**
 * Un registro de `LegalAcceptance` listo para crear (RF-20): **cuatro** campos y
 * ni uno mas. El `quoteRequestId` lo pone el endpoint, porque solo se conoce
 * dentro de la transaccion.
 */
export type RegistroAceptacion = {
  tipo: TipoLegalDoc;
  version: string;
};

/**
 * Los registros de aceptacion que corresponden a una casilla marcada (P6).
 *
 * **Son los que el visitante ve, no los siete documentos ni los tres tipos.** Hoy
 * son dos, porque no hay tecnologias no esenciales que obliguen a pedir
 * consentimiento: si se registra una aceptacion de cookies que nadie acepto, el
 * registro deja de ser prueba para ser una afirmacion, que es justo lo que RF-21
 * prohibe.
 *
 * La version que se guarda es la del **registro vigente**, no la que envio el
 * cliente, y no por desconfianza: `AceptacionSchema` ya ha comprobado que coinciden
 * (`sonVersionesValidas`), asi que las dos son la misma y esta sale de la fuente
 * unica. Escribirla aqui evita que un endpoint futuro acepte un valor arbitrario.
 *
 * @returns Un registro por cada documento que la casilla declara.
 */
export function registrosDeAceptacion(): RegistroAceptacion[] {
  const tipos: TipoLegalDoc[] = hayQuePedirConsentimiento()
    ? ["TERMINOS", "PRIVACIDAD", "COOKIES"]
    : ["TERMINOS", "PRIVACIDAD"];

  return tipos.map((tipo) => ({
    tipo,
    version: versionDe(DOCUMENTO_POR_TIPO[tipo]) ?? "",
  }));
}

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
  /**
   * La decision afirmativa del visitante y las versiones que vio (RF-19).
   *
   * **Va dentro del esquema y no suelta en el endpoint a proposito:** sin la
   * casilla marcada no hay parseo, y sin parseo no hay fila. Asi el "no hay
   * registro sin aceptacion" no depende de que alguien recuerde una comprobacion
   * en el controlador: es que el cuerpo entero es invalido.
   */
  aceptacion: AceptacionSchema,
});

/** Tipo de salida de `CreateQuoteSchema` tras aplicar el parseo. */
export type CreateQuoteInput = z.infer<typeof CreateQuoteSchema>;