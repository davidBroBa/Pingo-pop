import { z } from "zod";

import { shortText } from "@/lib/validation";

/**
 * Datos legales del responsable, y el unico sitio donde se decide que se ve
 * cuando **falta** un dato.
 *
 * Modulo puro: sin React, sin base de datos, sin DOM y sin reloj. El runner de
 * tests es `node:test` **sin jsdom**, asi que la logica comprobable vive aqui y
 * no dentro de `/admin/legal` ni de las paginas legales.
 *
 * **El principio que manda es otro, y va escrito porque es el mas importante de
 * este modulo: no se inventa ni un solo dato legal.** El documento de origen
 * prohibe expresamente rellenar a mano la razon social, el RFC o el domicilio, y
 * `docs/THREATS.md` no los tiene. Lo que hay hoy es el nombre comercial, que si
 * se conoce. Todo lo demas lo rellena el propietario desde el panel; mientras
 * tanto, las paginas legales muestran {@link MARCADOR_PENDIENTE}.
 *
 * Eso **no bloquea el despliegue**: son datos de la base de datos, no variables
 * de entorno (D18), asi que el build no depende de que existan.
 */

/**
 * El marcador de dato pendiente. **Constante unica y exportada** (RF-2).
 *
 * El texto literal de este marcador no puede escribirse a mano en ningun otro
 * fichero del repositorio, y eso no es una intencion: `tests/legal-data.test.ts`
 * recorre `src/` con `node:fs` y **falla** si aparece en cualquier fichero que no
 * sea este. Sin ese test, "una constante unica" seria solo un buen deseo.
 */
export const MARCADOR_PENDIENTE = "[REQUIERE DATO DEL PROPIETARIO]";

/**
 * El unico dato legal que **si** se conoce (ver `spec.md`, seccion 3): es el nombre
 * comercial, no la razon social. No son lo mismo y no se confunden.
 */
export const NOMBRE_COMERCIAL = "Pingo POP";

/**
 * Los seis campos de `LegalData`, **en el orden en que se piden** en el panel y
 * en el que se listan los que faltan.
 *
 * El orden importa: `camposFaltantes()` devuelve este mismo orden, y una lista
 * de pendientes que cambia de un render al siguiente no se puede revisar.
 */
export const CAMPOS_LEGALES = [
  "razonSocial",
  "rfc",
  "domicilioFiscal",
  "correoContacto",
  "telefono",
  "responsablePrivacidad",
] as const;

/** Nombre de uno de los seis campos de `LegalData`. */
export type CampoLegal = (typeof CAMPOS_LEGALES)[number];

/**
 * Token de cada campo en los textos legales: `razonSocial` se escribe
 * `{{RAZON_SOCIAL}}` dentro de una plantilla.
 *
 * Vive aqui, al lado de los campos, y no en los textos: si un texto trajera su
 * propio token, el dia que se renombre un campo el texto se quedaria con un
 * `{{TOKEN}}` viejo que ya nadie rellena, y el marcador no saldria porque el
 * token ya no existe en ningun sitio.
 */
export const TOKEN_POR_CAMPO: Record<CampoLegal, string> = {
  razonSocial: "RAZON_SOCIAL",
  rfc: "RFC",
  domicilioFiscal: "DOMICILIO_FISCAL",
  correoContacto: "CORREO_CONTACTO",
  telefono: "TELEFONO",
  responsablePrivacidad: "RESPONSABLE_PRIVACIDAD",
};

/** Token del nombre comercial, que no viene de la base de datos. */
export const TOKEN_NOMBRE_COMERCIAL = "NOMBRE_COMERCIAL";

/** Tokens que {@link interpolar} reconoce. */
export const TOKENS_LEGALES: readonly string[] = [
  TOKEN_NOMBRE_COMERCIAL,
  ...CAMPOS_LEGALES.map((campo) => TOKEN_POR_CAMPO[campo]),
];

/** Lo que se lee de la fila unica de `LegalData`: cualquier campo puede faltar. */
export type EntradaLegal = Partial<Record<CampoLegal, string | null>>;

/** Lo que devuelve {@link leerLegal}: los seis campos, siempre con un valor. */
export type LegalLeido = Record<CampoLegal, string>;

/**
 * El `preprocess` de los campos de texto: `""` y `"   "` son "sin dato", no un
 * error.
 *
 * Es **el mismo** que usa `imagePath` en `validation.ts`, y por el mismo motivo:
 * un formulario manda `""` cuando el campo se deja vacio, y `JSON.stringify`
 * conserva la cadena vacia. Si aqui se rechazara, el administrador no podria
 * guardar unos datos legales a medio rellenar sin inventarse un valor.
 */
const ausenteSiVacio = (valor: unknown): unknown =>
  typeof valor === "string" && valor.trim() === "" ? undefined : valor;

/** Texto obligatorio en el esquema, ausente si viene vacio. */
const textoLegal = (max: number) =>
  z.preprocess(ausenteSiVacio, shortText(max).nullish());

/**
 * RFC mexicano: 12 o 13 caracteres, letras y digitos, sin espacios.
 *
 * **No se comprueba el digito de verificacion.** El digito lo valida el SAT con
 * una tabla oficial que no cabe en este repositorio, y una comprobacion
 * inventada seria peor que ninguna: rechazaria RFC validos. Aqui solo se acotan
 * longitud y caracteres, que es lo que evita un texto inyectado cualquiera en
 * una pagina legal.
 *
 * Se pasa a mayusculas porque el RFC se emite en mayusculas y comparar
 * `vpa101010hsa` con `VPA101010HSA` no tiene sentido.
 */
const rfc = z.preprocess(
  ausenteSiVacio,
  z
    .string({ error: "Se espera un RFC" })
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{12,13}$/, {
      message: "El RFC debe tener 12 o 13 caracteres, sin espacios",
    })
    .nullish(),
);

/**
 * Correo de contacto: opcional de verdad.
 *
 * Es el medio por el que se ejercen los derechos ARCO y se responden las
 * solicitudes (RF-12), asi que se valida como correo y no como texto libre. Que
 * sea opcional no significa que deba estar vacio: si no hay correo, el panel lo
 * avisa y las paginas muestran el marcador.
 */
const correoOpcional = z.preprocess(
  ausenteSiVacio,
  z
    .string({ error: "Se espera un correo" })
    .trim()
    .toLowerCase()
    .max(254, "El correo es demasiado largo")
    .email("El correo no es valido")
    .nullish(),
);

/**
 * Los seis campos de `LegalData`. El tipo sale de aqui, no al reves.
 *
 * `.nullish()` en todos: la fila aparece sola la primera vez (como
 * `SiteSettings`) y nace **vacia**, no con datos de ejemplo. Un valor inventado
 * seria exactamente lo que RF-2 prohibe.
 */
export const LegalDataSchema = z.object({
  razonSocial: textoLegal(120),
  rfc,
  domicilioFiscal: textoLegal(300),
  correoContacto: correoOpcional,
  telefono: textoLegal(40),
  responsablePrivacidad: textoLegal(120),
});

/** Tipo de salida de {@link LegalDataSchema} tras aplicar el parseo. */
export type LegalDataInput = z.infer<typeof LegalDataSchema>;

/** Un token `{{CLAVE}}` de una plantilla legal. */
const TOKEN = /\{\{([A-Z_]+)\}\}/g;

/** Texto de un campo ya recortado, o `null` si esta ausente. */
function valorDe(entrada: EntradaLegal, campo: CampoLegal): string | null {
  const valor = entrada[campo];

  if (typeof valor !== "string") return null;

  const recortado = valor.trim();
  return recortado === "" ? null : recortado;
}

/**
 * Lee la fila de `LegalData` y devuelve los seis campos **siempre con un texto**:
 * el dato si esta, el marcador si no.
 *
 * Devolver el marcador aqui y no en cada pagina es lo que hace que RF-2 sea una
 * regla del sistema y no una costumbre de cada plantilla. Una pagina nueva no
 * puede "olvidarse" de ponerlo: no tiene el valor crudo.
 *
 * @param entrada - La fila de la base de datos, con los campos que falten.
 * @returns Los seis campos, sin `null` y sin `undefined`.
 */
export function leerLegal(entrada: EntradaLegal): LegalLeido {
  const leido = {} as LegalLeido;

  for (const campo of CAMPOS_LEGALES) {
    leido[campo] = valorDe(entrada, campo) ?? MARCADOR_PENDIENTE;
  }

  return leido;
}

/**
 * Lista los campos que **no** estan rellenados, en el orden de
 * {@link CAMPOS_LEGALES}.
 *
 * Es lo que `/admin/legal` avisa antes de que se publiquen las paginas: un
 * aviso sin medio de contacto, o un aviso que no dice cual falta, no sirve de
 * nada (RF-3).
 *
 * @param entrada - La fila de la base de datos, con los campos que falten.
 * @returns Solo los que faltan; lista vacia si estan todos.
 */
export function camposFaltantes(entrada: EntradaLegal): CampoLegal[] {
  return CAMPOS_LEGALES.filter((campo) => valorDe(entrada, campo) === null);
}

/**
 * Rellena los tokens `{{CLAVE}}` de una plantilla legal.
 *
 * Regla unica: **un token que no se puede resolver sale como marcador, nunca
 * como `{{CLAVE}}`**. Un token sin sustituir se veria en pantalla como
 * `{{RFC}}`, que es feo y, peor, parece un texto publicado.
 *
 * @param plantilla - Texto con tokens `{{CLAVE}}`.
 * @param datos - Los campos ya leidos con {@link leerLegal}. Se acepta
 *   tambien el token literal (`RFC`) ademas del nombre del campo (`rfc`).
 * @returns El texto con todos los tokens sustituidos.
 */
export function interpolar(
  plantilla: string,
  datos: Partial<Record<CampoLegal | string, string | null | undefined>>,
): string {
  return plantilla.replace(TOKEN, (_coincidencia, token: string) => {
    if (token === TOKEN_NOMBRE_COMERCIAL) return NOMBRE_COMERCIAL;

    const campo = CAMPOS_LEGALES.find(
      (nombre) => TOKEN_POR_CAMPO[nombre] === token || nombre === token,
    );
    const valor = campo === undefined ? datos[token] : valorDe(datos, campo);

    return typeof valor === "string" && valor.trim() !== ""
      ? valor.trim()
      : MARCADOR_PENDIENTE;
  });
}