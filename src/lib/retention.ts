/**
 * Politica de retencion de las solicitudes de cotizacion (D15).
 *
 * Modulo puro: sin React, sin base de datos y **sin reloj**. `hoy` entra siempre
 * como parametro, y eso no es purismo: una funcion que lee el reloj no se puede
 * probar, y un plazo de meses comprobado a ojo no es un plazo comprobado.
 *
 * **Lo que este modulo NO hace, y es la decision mas importante de todos
 * (RF-22): no borra nada.** Cumplidos los meses, la solicitud queda **marcada**
 * para revision y el borrado lo decide una persona. Un borrado automatico y
 * silencioso es irreversible, y una solicitud puede estar en litigio. Marcar
 * avisa; borrar sin que nadie lo decida, no.
 */

/** Meses que se conserva una solicitud desde su `createdAt`. Decision D15. */
export const MESES_RETENCION = 12;

/**
 * Estados en los que una solicitud ya termino (RF-26).
 *
 * Son los unicos que pueden marcarse por antiguedad: una solicitud **en curso**
 * no se marca nunca (RF-23), por muy vieja que sea. Una conversacion en curso de
 * hace dos anios no es un dato caducado, es una conversacion abierta.
 */
export const ESTADOS_TERMINALES = ["ACCEPTED", "REJECTED", "CANCELLED"] as const;

/** Estado terminal de `QuoteStatus`. */
export type EstadoTerminal = (typeof ESTADOS_TERMINALES)[number];

/** Lo minimo de `QuoteRequest` que hace falta para decidir. */
export type SolicitudRetenible = {
  id: number;
  status: string;
  createdAt: Date;
};

/** Una solicitud vencida, tal y como la pinta el panel. */
export type MarcadaParaRevision = {
  id: number;
  status: string;
  /** Meses cumplidos desde `createdAt`, no el plazo: el panel lo muestra. */
  meses: number;
  /** `createdAt` en ISO, para mostrarlo sin depender del locale. */
  creadaEl: string;
};

/** El mismo `String` que hay hoy en la base de datos, sin enumerar todavia. */
function esTerminal(status: string): boolean {
  return (ESTADOS_TERMINALES as readonly string[]).includes(status);
}

/**
 * Meses **completos** que han pasado desde `createdAt` hasta `hoy`.
 *
 * "Completos" es lo que hace que 12 meses y un dia no cuenten como 12. Se
 * calcula con el dia del mes, no dividiendo dias por 30: dividir por 30 daria
 * 12 meses a los 360 dias, y un plazo que se cumple antes de tiempo es un
 * plazo que no se cumple.
 *
 * @param createdAt - Fecha de creacion de la solicitud.
 * @param hoy - Fecha de referencia. **Siempre por parametro.**
 * @returns Numero entero de meses cumplidos; 0 si la solicitud es del futuro.
 */
export function mesesTranscurridos(createdAt: Date, hoy: Date): number {
  if (Number.isNaN(createdAt.getTime()) || Number.isNaN(hoy.getTime())) {
    return 0;
  }

  let meses =
    (hoy.getUTCFullYear() - createdAt.getUTCFullYear()) * 12 +
    (hoy.getUTCMonth() - createdAt.getUTCMonth());

  if (meses <= 0) return 0;

  const diaAniversario = createdAt.getUTCDate();
  const diaDeHoy = hoy.getUTCDate();
  if (diaDeHoy < diaAniversario) meses -= 1;

  return Math.max(0, meses);
}

/**
 * Indica si una solicitud ha superado el plazo y se puede marcar para revision.
 *
 * Tres reglas, en este orden:
 *
 *  1. Un plazo de 0 **no marca nada**. Es el borde que pide la spec, y es lo
 *     que hace que la funcion sea segura en una pantalla de administracion:
 *     "sin plazo" se ve igual que "0 meses".
 *  2. Una solicitud **en curso** no se marca nunca (RF-23).
 *  3. A partir de `meses` meses cumplidos, si.
 *
 * @param solicitud - Id, estado y fecha de creacion.
 * @param hoy - Fecha de referencia.
 * @param meses - Plazo en meses; por defecto {@link MESES_RETENCION}.
 * @returns `true` si hay que marcarla.
 */
export function esVencida(
  solicitud: SolicitudRetenible,
  hoy: Date,
  meses: number = MESES_RETENCION,
): boolean {
  if (meses <= 0) return false;
  if (!esTerminal(solicitud.status)) return false;

  return mesesTranscurridos(solicitud.createdAt, hoy) >= meses;
}

/**
 * Filtra las solicitudes vencidas y las devuelve con lo que el panel muestra.
 *
 * **No muta la lista recibida**, porque quien llama la tiene en el estado y la
 * va a pintar entera: un filtro que ordenara el array original dejaria el listado
 * en un orden distinto del que se pinto.
 *
 * @param lista - Las solicitudes que haya.
 * @param hoy - Fecha de referencia.
 * @param meses - Plazo en meses; por defecto {@link MESES_RETENCION}.
 * @returns Solo las vencidas, con id, estado, meses cumplidos y fecha.
 */
export function marcarParaRevision(
  lista: readonly SolicitudRetenible[],
  hoy: Date,
  meses: number = MESES_RETENCION,
): MarcadaParaRevision[] {
  return lista
    .filter((solicitud) => esVencida(solicitud, hoy, meses))
    .map((solicitud) => ({
      id: solicitud.id,
      status: solicitud.status,
      meses: mesesTranscurridos(solicitud.createdAt, hoy),
      creadaEl: solicitud.createdAt.toISOString(),
    }));
}

/**
 * Cuantas solicitudes han superado el plazo (RF-24).
 *
 * Es el numero que el panel muestra arriba del listado, para que el administrador
 * sepa si hay algo que revisar antes de recorrer la tabla entera.
 *
 * @param lista - Las solicitudes que haya.
 * @param hoy - Fecha de referencia.
 * @param meses - Plazo en meses; por defecto {@link MESES_RETENCION}.
 * @returns Cuantas hay que marcar.
 */
export function contarAntiguas(
  lista: readonly SolicitudRetenible[],
  hoy: Date,
  meses: number = MESES_RETENCION,
): number {
  return lista.reduce(
    (total, solicitud) => (esVencida(solicitud, hoy, meses) ? total + 1 : total),
    0,
  );
}