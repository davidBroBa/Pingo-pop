/**
 * Deteccion de caracteres de control en texto de entrada.
 *
 * Los caracteres C0 (0x00-0x08, 0x0B, 0x0C, 0x0E-0x1F) y DEL (0x7F) no son
 * utiles en un nombre, un telefono o una descripcion, y sirven para inyectar
 * saltos de linea o Caracteres que rompen la presentacion al devolverse el dato.
 *
 * El rango se construye con `new RegExp` sobre una cadena de escapes en lugar de
 * escribir los caracteres literales en el fuente: escribir un byte de control
 * directamente en el fichero es fragil, porque las herramientas de escritura
 * pueden alterarlo y romper el patron.
 */
const CONTROL_CHARACTERS = new RegExp(
  "[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F]",
);

/**
 * Indica si el texto contiene caracteres de control.
 *
 * El salto de linea y el retorno de carro se permiten y se ignoran: son
 * legitimos dentro de un campo de texto largo.
 *
 * @param value - Texto a inspeccionar.
 * @returns `true` si aparece algun caracter de control no permitido.
 */
export function hasControlChars(value: string): boolean {
  return CONTROL_CHARACTERS.test(value.replace(/[\r\n]/g, ""));
}