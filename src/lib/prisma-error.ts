import { Prisma } from "@/generated/prisma/client";

/** Como se traduce un fallo de Prisma a una respuesta HTTP. */
export interface PrismaErrorDescription {
  /** Estado HTTP que corresponde al fallo. */
  status: number;
  /** Mensaje que ve el cliente. Nunca lleva detalles internos. */
  message: string;
  /** `true` si el fallo es del servidor y hay que registrarlo para diagnóstico. */
  serverFault: boolean;
}

/**
 * Fallos de Prisma que son culpa de lo que pidió el cliente, no del servidor.
 *
 * Cada uno se traduce a un estado que significa algo: 409 es "ya existe", 422 es
 * "no se puede cumplir" y 404 es "no está". Devolver 500 para todos ellos miente
 * sobre dónde está el problema, dispara alertas por entradas normales del
 * usuario y acaba ocultando los 500 de verdad entre el ruido.
 */
const CLIENT_FAULTS: Readonly<Record<string, { status: number; message: string }>> = {
  P2002: {
    status: 409,
    message: "Ya existe un registro con esos mismos datos.",
  },
  P2003: {
    status: 422,
    message: "Alguno de los datos referidos no existe.",
  },
  P2014: {
    status: 422,
    message: "Falta una relacion obligatoria entre los datos indicados.",
  },
  P2025: {
    status: 404,
    message: "El registro indicado no existe.",
  },
};

/**
 * Traduce un error de Prisma a un estado HTTP y a un mensaje seguro.
 *
 * La comprobacion es por codigo (`P2003`, `P2002`, ...) y no por el texto del
 * mensaje, que cambia entre versiones. Un error de Prisma siempre lleva codigo;
 * un fallo real de infraestructura no lo lleva, y ese es justo el criterio para
 * separar "el usuario se equivoco" de "el servidor se rompio".
 *
 * @param error - Lo que lanzo la llamada a Prisma.
 * @param fallbackMessage - Mensaje a devolver cuando el fallo es del servidor.
 * @returns Estado, mensaje y si conviene registrar el fallo.
 */
export function describePrismaError(
  error: unknown,
  fallbackMessage: string,
): PrismaErrorDescription {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    // Sin `code`: fallo de red, base de datos caida, pool agotado, error propio.
    return { status: 500, message: fallbackMessage, serverFault: true };
  }

  const conocido = CLIENT_FAULTS[error.code];
  if (conocido !== undefined) {
    return { ...conocido, serverFault: false };
  }

  // `PrismaClientKnownRequestError` significa, por definicion, que la peticion
  // fue invalida. Si el codigo no esta en el mapa, sigue siendo culpa del
  // cliente: se responde 400 con un mensaje generico en vez de un 500.
  return {
    status: 400,
    message: "Los datos enviados no son validos.",
    serverFault: false,
  };
}
