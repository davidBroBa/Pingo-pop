import {
  CAMPOS_LEGALES,
  MARCADOR_PENDIENTE,
  type CampoLegal,
} from "@/lib/legal-data";

/**
 * Textos del panel de datos legales (`/admin/legal`).
 *
 * Modulo **puro**, sin React y sin base de datos, por lo mismo que todos los de
 * `src/lib/`: el runner de tests es `node:test` sin jsdom y lo comprobable no
 * puede vivir dentro de un componente.
 *
 * ## Lo unico que hace de verdad
 *
 * El aviso de RF-3 tiene que **enumerar exactamente los campos que faltan**, y la
 * lista sale de `camposFaltantes()` en el mismo orden de `CAMPOS_LEGALES`. Aqui
 * solo se convierte esa lista en texto. La lista **no** se escribe a mano en el
 * componente, porque una lista escrita a mano se queda vieja en cuanto se anade un
 * campo y el aviso pasa a mentir con toda la buena fe.
 *
 * ## Por que este archivo y no dentro de `legal-data.ts`
 *
 * Porque son cosas distintas: `legal-data.ts` decide **que es un dato valido** y
 * como se sustituye un token; esto decide **como se le dice a un administrador lo
 * que le falta**. Y `legal-data.ts` es codigo de la spec 009 que ya tiene sus
 * tests escritos; mezclarlo haria que un cambio de etiqueta pareciera un cambio de
 * validacion.
 */

/** Etiqueta de cada campo, tal y como aparece en el formulario. */
export const ETIQUETA_POR_CAMPO: Record<CampoLegal, string> = {
  razonSocial: "Razón social",
  rfc: "RFC",
  domicilioFiscal: "Domicilio fiscal",
  correoContacto: "Correo de contacto",
  telefono: "Teléfono",
  responsablePrivacidad: "Responsable de los datos personales",
};

/**
 * Ayuda de cada campo: **para qué** lo necesita el negocio.
 *
 * Sin esto el formulario son seis cajas y el propietario no sabe cuál se le puede
 * dejar vacía. Y ninguno puede: los seis aparecen en documentos publicados.
 */
export const AYUDA_POR_CAMPO: Record<CampoLegal, string> = {
  razonSocial:
    "Aparece en el aviso de privacidad y en la información legal. Es el nombre que figura en el registro fiscal, no el nombre comercial.",
  rfc:
    "12 o 13 caracteres, letras y dígitos, sin espacios. Se comprueban la longitud y los caracteres, pero **no** el dígito de verificación: esa tabla la tiene el SAT y una comprobación inventada rechazaría RFC válidos.",
  domicilioFiscal:
    "Aparece en la información legal. Con calle, número, colonia, código postal y ciudad.",
  correoContacto:
    "Es el medio por el que se responden las cotizaciones y se ejercen los derechos de acceso, rectificación y supresión. Si se queda vacío, el aviso de privacidad no dice a quién escribir.",
  telefono:
    "Opcional en la práctica, pero recomendado: mucha gente prefiere llamar antes que escribir. Aparece en el aviso de privacidad.",
  responsablePrivacidad:
    "Quién atiende las solicitudes de datos personales. Puede ser el mismo negocio o una persona concreta, y el aviso tiene que poder decirlo con nombre.",
};

/**
 * Texto del aviso de RF-3: qué campos están sin rellenar.
 *
 * La última frase es la que hace útil el aviso. Un campo vacío **no** es un campo
 * opcional: mientras falte, la página legal pública lo sustituye por
 * `MARCADOR_PENDIENTE`, que es exactamente la marca de "esto está sin terminar" que
 * el propietario pidió no dejar publicada. Sin recordarlo, la lectura razonable es
 * "lo dejo en blanco y ya".
 *
 * El texto del marcador se **importa**, no se escribe: hay un test de F1 que
 * recorre `src/` y falla si el literal aparece en cualquier fichero que no sea
 * `legal-data.ts`, precisamente para que no haya dos copias que se desincronicen.
 *
 * @param faltantes - Lo que devuelve `camposFaltantes()`, en su orden.
 * @returns El aviso, o la constancia de que no falta nada.
 */
export function textoAvisoFaltantes(faltantes: readonly CampoLegal[]): string {
  if (faltantes.length === 0) {
    return "Los seis datos están rellenados. Las páginas legales se publicarán con estos valores.";
  }

  const nombres = faltantes.map((campo) => ETIQUETA_POR_CAMPO[campo]);

  // `Intl.ListFormat` en español da "a, b y c", que es lo que se espera leer; el
  // respaldo manual existe para cuando el runtime no lo trae.
  const enumeracion =
    typeof Intl.ListFormat === "function"
      ? new Intl.ListFormat("es", { style: "long", type: "conjunction" }).format(
          nombres,
        )
      : `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;

  const cabeza =
    faltantes.length === 1
      ? `Falta 1 de los 6 datos legales: ${enumeracion}.`
      : `Faltan ${faltantes.length} de los 6 datos legales: ${enumeracion}.`;

  return (
    `${cabeza} Mientras no se rellenen, la página legal pública los sustituye por ` +
    `${MARCADOR_PENDIENTE}, que es una marca de texto sin terminar.`
  );
}

/**
 * Recuento corto para la cabecera del formulario: "4 de 6".
 *
 * @param faltantes - Lo que devuelve `camposFaltantes()`.
 * @returns Cuantos faltan sobre el total, en texto.
 */
export function resumenFaltantes(faltantes: readonly CampoLegal[]): string {
  return `${CAMPOS_LEGALES.length - faltantes.length} de ${CAMPOS_LEGALES.length}`;
}
