import { z } from "zod";

import { hasControlChars } from "@/lib/control-chars";

/**
 * Esquemas y politicas de la cuenta del cliente.
 *
 * Modulo puro: sin DOM, sin `localStorage` y sin base de datos, a proposito. El
 * runner de tests es `node:test` **sin jsdom**, asi que toda la logica comprobable
 * de la cuenta tiene que vivir fuera de los componentes y de los route handlers.
 *
 * Hay **dos politicas de contrasena**, y no es arbitrario: un cliente que quiere un
 * pin de 8 digitos no deberia verse obligado a inventar una mayuscula y un simbolo,
 * mientras que una cuenta de administrador si deberia exigir un largo y una
 * complejidad que la haga resistente a la fuerza bruta.
 */

/** Rol, tal y como lo guarda el enum `Role` de Prisma. */
export type Rol = "BUYER" | "ADMIN";

/**
 * Suelo de longitud para un BUYER.
 *
 * No baja de 8 a proposito: `LoginSchema` (`src/app/api/auth/login/route.ts`) ya
 * rechaza menos de 8, asi que permitir 6 seria ofrecerle al usuario una contrasena
 * que despues no puede usar. Se relaja la complejidad, no la longitud.
 */
export const BUYER_PASSWORD_MIN_LENGTH = 8;

/** Suelo de longitud para un ADMIN. */
export const ADMIN_PASSWORD_MIN_LENGTH = 12;

/** Tope que aceptan tanto el login como las dos politicas. */
export const PASSWORD_MAX_LENGTH = 200;

/** Longitud admitida para el nombre visible de la cuenta. */
export const PROFILE_NAME_MIN_LENGTH = 2;
export const PROFILE_NAME_MAX_LENGTH = 120;

/**
 * Un signo de puntuacion es cualquier cosa que no sea letra, ni digito, ni espacio,
 * ni caracter de control. Con el flag `u` y las propiedades Unicode se cuentan
 * tambien los alfabetos no latinos, que si son "letras" para este proposito.
 */
const PUNCTUATION = /[^\p{L}\p{N}\s]/u;

/**
 * Comprueba una contrasena contra la politica del rol indicado.
 *
 * Devuelve la **lista de motivos** en vez de un booleano porque el endpoint puede
 * devolverlos tal cual al cliente: decir "le falta una mayuscula" es mas util que
 * "contrasena invalida", y no filtra nada, porque son reglas publicas que no dependen
 * de la cuenta ni de su contrasena guardada.
 *
 * @param password - Contrasena candidata, en claro.
 * @param rol - Rol para el que se valida.
 * @returns `string[]` vacio si cumple; en caso contrario, un motivo por cada regla
 *   incumplida, en castellano y sin acentos.
 */
export function passwordPolicyProblems(
  password: string,
  rol: Rol,
): string[] {
  const problemas: string[] = [];
  const minimo =
    rol === "ADMIN" ? ADMIN_PASSWORD_MIN_LENGTH : BUYER_PASSWORD_MIN_LENGTH;

  if (password.length < minimo) {
    problemas.push(
      `La contrasena debe tener al menos ${minimo} caracteres.`,
    );
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    problemas.push(
      `La contrasena no puede pasar de ${PASSWORD_MAX_LENGTH} caracteres.`,
    );
  }

  // Se comprueba siempre, en los dos roles: un salto de linea dentro de una
  // contrasena se cuela en logs y en formularios, y no aporta nada.
  if (hasControlChars(password)) {
    problemas.push("La contrasena contiene caracteres no permitidos.");
  }

  if (rol === "ADMIN") {
    if (!/\p{Lu}/u.test(password)) {
      problemas.push("La contrasena debe llevar al menos una mayuscula.");
    }

    if (!/\p{Ll}/u.test(password)) {
      problemas.push("La contrasena debe llevar al menos una minuscula.");
    }

    if (!/\p{N}/u.test(password)) {
      problemas.push("La contrasena debe llevar al menos un digito.");
    }

    if (!PUNCTUATION.test(password)) {
      problemas.push("La contrasena debe llevar al menos un signo de puntuacion.");
    }
  }

  return problemas;
}

/**
 * Indica si una contrasena cumple la politica del rol.
 *
 * @param password - Contrasena candidata, en claro.
 * @param rol - Rol para el que se valida.
 * @returns `true` si no hay ningun problema.
 */
export function meetsPasswordPolicy(password: string, rol: Rol): boolean {
  return passwordPolicyProblems(password, rol).length === 0;
}

/**
 * Edicion del perfil: **solo el nombre visible**.
 *
 * `.strict()` a proposito: el `email` no se cambia por aqui (RF-4), y sin `strict`
 * un `PATCH` podria colar campos que el endpoint ni mira, con la falsa impresion de
 * que se han guardado.
 */
export const UpdateProfileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(PROFILE_NAME_MIN_LENGTH, "Escribe tu nombre.")
      .max(PROFILE_NAME_MAX_LENGTH, "El nombre es demasiado largo.")
      .refine((value) => !hasControlChars(value), {
        message: "El nombre contiene caracteres no permitidos",
      }),
  })
  .strict();

/**
 * Cambio de contrasena: actual, nueva y su confirmacion.
 *
 * **No comprueba la politica de longitud ni de complejidad.** Se comprueba en el
 * endpoint, porque depende del rol de quien cambia, y el rol no se deduce de este
 * esquema. Aqui solo se valida la forma y que las dos nuevas coincidan.
 */
export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Escribe tu contrasena actual."),
    newPassword: z.string().min(1, "Escribe la contrasena nueva."),
    confirmPassword: z.string().min(1, "Repite la contrasena nueva."),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Las contrasenas nuevas no coinciden.",
    path: ["confirmPassword"],
  });

/** Tipo de salida de {@link UpdateProfileSchema} tras aplicar el parseo. */
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

/** Tipo de salida de {@link ChangePasswordSchema} tras aplicar el parseo. */
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
