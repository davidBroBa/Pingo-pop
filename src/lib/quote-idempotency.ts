/**
 * Clave de idempotencia de `POST /api/quotes` (RF-27).
 *
 * Modulo puro: sin React, sin base de datos y sin DOM. Lo unico que hay aqui es
 * la forma del token y la decision que sale de compararlo.
 *
 * **Por que un token y no la IP.** La clave la genera el cliente con
 * `crypto.randomUUID()`, que ya existe en el navegador: no hay ninguna
 * dependencia nueva ni una funcion nueva que nadie llama. La IP **no** sirve,
 * por dos razones concretas: es del visitante y no del solicitante, asi que dos
 * personas detras del mismo router comparte clave; y usarla como clave unica
 * haria que la segunda cotizacion de una tienda con NAT no se guardara nunca.
 *
 * **Lo que este modulo NO demuestra, y hay que decirlo en la nota de
 * verificacion:** que la base de datos **no** duplique la solicitud es cosa del
 * indice unico de la migracion y de la transaccion del endpoint, y se comprueba
 * en **V9**. Aqui se demuestra la otra mitad: que el token se valida, se
 * normaliza y decide bien. Un test que afirmara lo que no comprueba seria peor
 * que no tener test.
 */

/**
 * UUID version 4, en su forma canonica en minusculas.
 *
 * El patron es exacto a proposito: la `4` del tercer grupo marca la version y la
 * `[89ab]` del cuarto la variante RFC 4122. Aceptar "algo que parece un UUID"
 * abriria la puerta a que un cliente antiguo, o alguien a mano, mandara una
 * clave estable y todas las cotizaciones siguientes se comieran la primera.
 *
 * No se acepta en mayusculas a proposito: {@link normalizarToken} las baja antes
 * de validar. La validacion es la puerta de seguridad y no perdona nada; la
 * normalizacion, si.
 */
export const FORMATO_TOKEN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** La fila que ya existe con esa clave, o `null` si no hay ninguna. */
export type SolicitudExistente = { id: number } | null;

/**
 * Que hacer con la peticion. **Tres cosas y solo tres**, y cada una se
 * reconoce por una clave distinta para que el endpoint no pueda confundirlas:
 *
 *  - `{ error }`      -> el token no vale. 400, **antes** de mirar la base de
 *                        datos. Un token invalido no se trata como "primera
 *                        vez": eso seria una puerta abierta a crear solicitudes
 *                        sin clave.
 *  - `{ reutilizar }` -> existe la fila. Se devuelve **esa misma** solicitud,
 *                        con 200 y no con 201.
 *  - `{ reutilizar }` -> no existe. Se crea, con 201.
 */
export type DecisionIdempotencia =
  | { error: "token invalido" }
  | { reutilizar: true; id: number }
  | { reutilizar: false };

/**
 * Deja el token en su forma canonica, o `null` si no vale.
 *
 * Recorta y baja a minusculas **antes** de validar, porque un token puede
 * llegar con espacios del `FormData` o en mayusculas de un cliente distinto, y
 * eso no es un ataque: es el mismo token. Lo que no se perdona es lo otro: si
 * despues de normalizar no parece un UUID v4, es `null`.
 *
 * @param token - Lo que llega del cliente, de cualquier tipo.
 * @returns El token en minusculas, o `null` si no es un UUID v4.
 */
export function normalizarToken(token: unknown): string | null {
  if (typeof token !== "string") return null;

  const limpio = token.trim().toLowerCase();
  return FORMATO_TOKEN.test(limpio) ? limpio : null;
}

/**
 * Indica si el token es un UUID v4 **tal cual**, sin normalizar.
 *
 * Es la version dura de {@link normalizarToken}, y la que se usa en tests y en
 * cualquier sitio donde no se admita tolerancia. Que exista aparte es lo que
 * deja claro que "normalizar" y "dar por bueno" no son lo mismo.
 *
 * @param token - Lo que llega del cliente, de cualquier tipo.
 * @returns `true` solo si cumple el formato exacto.
 */
export function esTokenValido(token: unknown): boolean {
  return typeof token === "string" && FORMATO_TOKEN.test(token);
}

/**
 * Decide si la peticion crea una solicitud nueva o devuelve una existente.
 *
 * El orden de las reglas no es arbitrario y por eso estan en este orden:
 *
 *  1. **Se valida el token antes de tocar nada.** Si no vale, 400. Consultar la
 *     base de datos con una clave que nadie va a aceptar despues es trabajo
 *     tirado, y devolver "crea una nueva" seria dejar la deduplicacion abierta.
 *  2. Si ya hay fila con esa clave, se **reutiliza** ese id.
 *  3. Si no hay, se crea.
 *
 * @param token - El token del cliente, todavia sin normalizar.
 * @param existente - La fila con esa clave, o `null`.
 * @returns Que hacer con la peticion. Ver {@link DecisionIdempotencia}.
 */
export function decisionDeIdempotencia(
  token: unknown,
  existente: SolicitudExistente,
): DecisionIdempotencia {
  if (normalizarToken(token) === null) {
    return { error: "token invalido" };
  }

  if (existente !== null) {
    return { reutilizar: true, id: existente.id };
  }

  return { reutilizar: false };
}