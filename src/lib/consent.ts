import { z } from "zod";

/**
 * Consentimiento y decision del visitante (D14).
 *
 * Modulo puro: sin React, sin DOM y **sin `localStorage`**. Recibe texto y
 * devuelve texto; el componente es quien lee y escribe. Es el mismo patron que
 * `quote-cart-storage.ts`, y por el mismo motivo: el runner es `node:test` sin
 * jsdom, asi que una funcion comprobable tiene que existir fuera de React.
 */

/**
 * Tecnologias que **no** son esenciales. **Vacio, y esta vacio a proposito.**
 *
 * El motivo, escrito aqui porque RF-15 lo exige y porque un array vacio sin
 * explicacion parece un descuido (D14):
 *
 *  - No hay analitica: ni script de terceros, ni CDN, ni etiqueta de eventos.
 *  - No hay publicidad ni de medicion.
 *  - La **unica** cookie es `pp_session`, que es necesaria para que exista la
 *    sesion, y la **unica** clave de `localStorage` es `pingo-quote-cart`, que
 *    es funcional: sin ella no se puede enviar una cotizacion.
 *
 * Por eso `hayQuePedirConsentimiento()` devuelve `false` y, mientras siga asi,
 * **no se escribe nada** en `localStorage` ni en cookies para registrar
 * consentimiento. Recolectar un dato que no se necesita tambien es un problema:
 * es informacion personal que el visitante no ha pedido dar.
 *
 * **El dia que se anada una tecnologia aqui, hay que anadirla tambien al modulo
 * de la decision de privacidad**, porque ahi es donde se explica que se guarda
 * y por que.
 */
export const TECNOLOGIAS_NO_ESENCIALES = [] as const;

/**
 * Las cuatro categorias del panel de RF-16. Se declaran aunque hoy no haya nada
 * que decidir, para que anadir una tecnologia no obligue a rediseniar el panel.
 */
export const CATEGORIAS_CONSENTIMIENTO = [
  "necesarias",
  "analiticas",
  "marketing",
  "preferencias",
] as const;

/** Categoria de consentimiento. */
export type CategoriaConsentimiento = (typeof CATEGORIAS_CONSENTIMIENTO)[number];

/**
 * Clave de `localStorage` donde se guardaria la decision.
 *
 * **No se usa hoy**, y es a proposito: con la lista de arriba vacia no se
 * escribe nada, ni aqui ni en ningun otro sitio. La constante se queda escrita
 * porque es el unico punto donde se decide el nombre, y cambiar el nombre de una
 * clave ya guardada pierde las decisiones del visitante sin avisar.
 */
export const CLAVE_CONSENTIMIENTO = "pingo-consentimiento";

/**
 * Version del formato de la decision guardada.
 *
 * Sube **solo** si cambia la forma de lo guardado, no si se anade una
 * tecnologia. Asi, un visitante que decidio con el formato viejo se lee
 * correctamente en vez de perder su decision en silencio.
 */
export const VERSION_DECISION = 1;

/** Documento legal sobre el que se decide. Los tres de `LegalDocType`. */
export const TIPOS_DOCUMENTO = ["TERMINOS", "PRIVACIDAD", "COOKIES"] as const;

/** Tipo de documento legal. */
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];

/** Las tres vias del panel de RF-16. */
export const DECISIONES = ["aceptar", "rechazar", "configurar"] as const;

/** Via de la decision. */
export type Decision = (typeof DECISIONES)[number];

/** El registro que se guardaria en `localStorage`. */
export const RegistroSchema = z.object({
  version: z.literal(VERSION_DECISION),
  tipo: z.enum(TIPOS_DOCUMENTO),
  decision: z.enum(DECISIONES),
  decidedAt: z.iso.datetime(),
});

/** Tipo de salida de {@link RegistroSchema}. El tipo sale del esquema. */
export type Registro = z.infer<typeof RegistroSchema>;

/**
 * Indica si hay que pedir consentimiento.
 *
 * La longitud de {@link TECNOLOGIAS_NO_ESENCIALES} decide, y nada mas. Que sea
 * una funcion y no una constante es lo que permite probarla **con** y **sin**
 * tecnologias: un test que solo pudiera ejecutarse con la lista vacia no
 * comprobaria que la regla funciona, sino que hoy no hay nada que pedir.
 *
 * @param tecnologias - Las no esenciales a comprobar; por defecto las del modulo.
 * @returns `true` solo si hay alguna.
 */
export function hayQuePedirConsentimiento(
  tecnologias: readonly string[] = TECNOLOGIAS_NO_ESENCIALES,
): boolean {
  return tecnologias.length > 0;
}

/**
 * Indica si un valor es una de las tres vias.
 *
 * @param valor - Lo que llega, de cualquier tipo.
 * @returns `true` solo si es "aceptar", "rechazar" o "configurar".
 */
export function esDecisionValida(valor: unknown): boolean {
  return (
    typeof valor === "string" &&
    (DECISIONES as readonly string[]).includes(valor)
  );
}

/**
 * Prepara el registro de una decision.
 *
 * `hoy` entra **siempre por parametro** y por eso el test puede comprobar que
 * el modulo no lee el reloj: si usara `new Date()`, la marca de tiempo seria
 * distinta en cuanto la maquina no coincidiera con la del test, y la prueba
 * pasaria o fallaria por casualidad.
 *
 * @param tipo - Documento sobre el que se decide.
 * @param decision - La via elegida.
 * @param hoy - Momento de la decision, ya fijo.
 * @returns El registro, listo para serializar.
 */
export function crearRegistro(
  tipo: TipoDocumento,
  decision: Decision,
  hoy: Date,
): Registro {
  return {
    version: VERSION_DECISION,
    tipo,
    decision,
    decidedAt: hoy.toISOString(),
  };
}

/**
 * Convierte el texto guardado en un registro usable.
 *
 * Devuelve `null` ante cualquier problema: texto corrupto, JSON que no es un
 * objeto, un tipo de documento que no existe, una version que no se reconoce o
 * una decision invalida. Es deliberado, igual que en `parseStoredCart`: lo
 * guardado es **entrada no confiable** y una decision corrupta se trata como
 * "no hay decision", que es lo unico que permite preguntar de nuevo.
 *
 * @param texto - Lo que hay en `localStorage`, o `null` si no hay nada.
 * @returns El registro, o `null` si no cuadra.
 */
export function leerRegistro(texto: string | null): Registro | null {
  if (typeof texto !== "string" || texto.trim() === "") return null;

  let analisis: unknown;
  try {
    analisis = JSON.parse(texto);
  } catch {
    return null;
  }

  const resultado = RegistroSchema.safeParse(analisis);

  return resultado.success ? resultado.data : null;
}

/**
 * Indica si cambiar una decision previa pide confirmacion (RF-18).
 *
 * Sin decision previa **no** hay nada que confirmar: la primera vez que alguien
 * elige, no se le pregunta "estas seguro". A partir de ahi, cambiar lo decidido
 * pregunta, porque sobrescribir en silencio es como se pierde una decision sin
 * que nadie se entere.
 *
 * @param previa - La decision guardada, o `null` si no hay ninguna.
 * @param nueva - La decision que se quiere tomar ahora.
 * @returns `true` solo si habia decision previa y es distinta.
 */
export function pideConfirmacion(
  previa: Decision | null | undefined,
  nueva: Decision,
): boolean {
  if (previa === null || previa === undefined) return false;

  return previa !== nueva;
}

/**
 * Base de clases de los tres botones del panel.
 *
 * **Un solo sitio decide** como se ve un boton de decision, y por eso las tres
 * vias se parecen en todo lo que no es el color. Va aqui lo que hace que sean
 * accesibles por igual: la misma altura (`h-12`), el mismo peso (`font-semibold`)
 * y el mismo foco visible (`cartoon-focus`), que es lo que permite usarlos con
 * el teclado.
 */
export const BOTON_BASE =
  "cartoon-border cartoon-focus inline-flex h-12 items-center rounded-2xl font-semibold";

/**
 * El unico acento por via. Una clase, ni una mas.
 *
 * Si aqui metiera dos, "aceptar" y "rechazar" dejarian de tener el mismo numero
 * de clases y RF-17 seeria solo una intencion. Ese es el motivo de que
 * {@link contarClases} exista.
 */
export const ACENTO_POR_VIA: Record<Decision, string> = {
  aceptar: "bg-accent",
  rechazar: "bg-white",
  configurar: "bg-cartoon-sky",
};

/**
 * Las clases de un boton de decision: la base mas su acento.
 *
 * @param via - Cual de las tres vias.
 * @returns La lista de clases, lista para `className`.
 */
export function botonClases(via: Decision): string {
  return `${BOTON_BASE} ${ACENTO_POR_VIA[via]}`;
}

/**
 * Cuenta las clases de una cadena de clases.
 *
 * Existe por RF-17, y por una razon que conviene entender: "aceptar" y
 * "rechazar" se ven iguales **a ojo**, pero un test de Node no ve pantallas.
 * Lo que si puede comprobar es que las dos cadenas tienen el mismo numero de
 * clases y que todas salen de la misma base, y eso es exactamente lo que hace
 * que el rechazo no sea un enlace atenuado al lado de un boton de verdad.
 *
 * @param clases - Una cadena de clases, como la devuelve `botonClases`.
 * @returns Cuantas clases tiene, sin contar los espacios sobrantes.
 */
export function contarClases(clases: string): number {
  return clases.split(/\s+/).filter((clase) => clase.length > 0).length;
}