import { CAMPOS_LEGALES, type EntradaLegal, type LegalDataInput } from "@/lib/legal-data";
import { prisma } from "@/lib/prisma";

/**
 * Lectura y escritura de la fila unica de `LegalData`.
 *
 * Modulo de **servidor**: es el unico sitio que habla con Prisma sobre estos
 * datos. `legal-data.ts` es puro y no sabe que existe una base de datos, y esto
 * al reves: aqui no se decide nada de negocio, solo se guarda y se lee.
 *
 * El `id` esta **fijado a 1** y no se busca "la primera fila": con id fijo no hay
 * ambiguedad, y `upsert` crea la fila la primera vez sin un paso de siembra que se
 * pueda olvidar. Es exactamente el mismo argumento que sostiene `SiteSettings`, y
 * por eso las dos tablas hacen lo mismo (D18).
 */

/** Id de la fila unica. Coincide con el `@default(1)` del esquema. */
export const SINGLETON_ID = 1;

/**
 * Lee los seis campos de `LegalData`, tal cual estan.
 *
 * **Tolerante a fallos a proposito (RF-1):** si la base de datos esta caida, no
 * existe la tabla todavia, o la consulta falla por lo que sea, aqui no se
 * propaga la excepcion. Se registra **solo el nombre del error** (el objeto puede
 * llevar la cadena de conexion) y se devuelve `{}`.
 *
 * El consumidor de esta funcion es `leerLegal()`, que convierte cada campo
 * ausente en `MARCADOR_PENDIENTE`. Devolver `{}` en vez de lanzar es lo que hace
 * que un problema de base de datos no convierta las paginas legales en un error
 * 500: el sitio sigue publicando los documentos, marcando lo que falta. Un dato
 * legal ausente no puede dejar la web sin pintar, igual que la foto del hero.
 *
 * @returns Los campos presentes, o `{}` si no hay fila o no se pudo leer.
 */
export async function readLegalData(): Promise<EntradaLegal> {
  try {
    const fila = await prisma.legalData.findUnique({
      where: { id: SINGLETON_ID },
      select: {
        razonSocial: true,
        rfc: true,
        domicilioFiscal: true,
        correoContacto: true,
        telefono: true,
        responsablePrivacidad: true,
      },
    });

    if (fila === null) return {};

    const leido: EntradaLegal = {};
    for (const campo of CAMPOS_LEGALES) {
      leido[campo] = fila[campo];
    }

    return leido;
  } catch (error) {
    // Solo el nombre del error: el objeto puede llevar la cadena de conexion.
    console.error(
      "No se pudieron leer los datos legales:",
      error instanceof Error ? error.name : "desconocido",
    );
    return {};
  }
}

/**
 * Guarda los seis datos legales en la fila unica, creandola si no existe.
 *
 * `""` y los espacios ya llegan como ausencia desde `LegalDataSchema`
 * (`preprocess`), asi que aqui solo se convierte `undefined` en `null`: es la
 * unica diferencia entre "campo vacio" y "campo presente", y en esta tabla los
 * dos casos son el mismo (no hay dato, se muestra el marcador).
 *
 * Los campos **no se validan aqui**: llegan validados por `LegalDataSchema` en el
 * endpoint. Este modulo es la capa de persistencia y no duplica las reglas, igual
 * que hace `writeHeroImage()` con `siteImagePath`.
 *
 * @param datos - Los seis campos ya validados, con `undefined` en los ausentes.
 * @returns Los seis campos tal y como quedaron guardados (nunca `undefined`).
 */
export async function writeLegalData(datos: LegalDataInput): Promise<EntradaLegal> {
  const fila = {
    razonSocial: datos.razonSocial ?? null,
    rfc: datos.rfc ?? null,
    domicilioFiscal: datos.domicilioFiscal ?? null,
    correoContacto: datos.correoContacto ?? null,
    telefono: datos.telefono ?? null,
    responsablePrivacidad: datos.responsablePrivacidad ?? null,
  };

  const guardada = await prisma.legalData.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, ...fila },
    update: fila,
    select: {
      razonSocial: true,
      rfc: true,
      domicilioFiscal: true,
      correoContacto: true,
      telefono: true,
      responsablePrivacidad: true,
    },
  });

  const leido: EntradaLegal = {};
  for (const campo of CAMPOS_LEGALES) {
    leido[campo] = guardada[campo];
  }

  return leido;
}