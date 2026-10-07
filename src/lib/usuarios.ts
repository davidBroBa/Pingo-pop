import { z } from "zod";

import {
  BUYER_PASSWORD_MIN_LENGTH,
  meetsPasswordPolicy,
  PASSWORD_MAX_LENGTH,
  PROFILE_NAME_MAX_LENGTH,
  PROFILE_NAME_MIN_LENGTH,
  type Rol,
} from "@/lib/account-schema";
import { ACCIONES_USUARIO } from "@/lib/usuarios-panel";
import { Role } from "@/generated/prisma/client";

/**
 * Esquemas y validacion de la gestion de cuentas (spec 007), **lado servidor**.
 *
 * Modulo **puro**: sin Prisma, sin React, sin reloj y sin base de datos. El runner
 * de tests es `node:test` **sin jsdom**, asi que lo comprobable vive aqui y el panel y
 * las rutas solo lo aplican.
 *
 * ## Lo que NO esta aqui, y por que importa
 *
 * La lista de roles, las cuatro acciones y los textos de confirmacion estan en
 * `usuarios-panel.ts`, no aqui. La razon es tecnica y dura: este fichero importa el
 * cliente generado de Prisma, y ese cliente pide `node:module`. Un Client Component
 * que lo importe hace fallar el troceado de Turbopack y la pagina no compila. Por eso
 * el panel lee su lista de `usuarios-panel.ts` y hay un test que ata las dos para que
 * no se desincronicen.
 *
 * `usuarios-panel.ts` importa este modulo, nunca al reves: el que tiene dependencia de
 * Node es el que se queda en el servidor.
 *
 * ## Lo que este modulo NO hace, y por que importa
 *
 * **No valida la contrasena con una regla propia.** Reutiliza
 * `meetsPasswordPolicy(contrasena, rol)` de `account-schema.ts`, que ya implementa
 * la decision de la spec 006: `BUYER` 8+ sin complejidad, `ADMIN` 12+ con
 * mayuscula, minuscula, digito y puntuacion. Escribir una regla nueva aqui
 * significaria dos politicas de contrasena en el repositorio, y en cuanto
 * divergieran nadie sabria cual manda. Por eso el test comprueba que la misma
 * contrasena valida para un rol y **no** para el otro: si alguien dejara el rol
 * fijo en el esquema, ese test se pondria rojo.
 *
 * ## El correo es la identidad
 *
 * `email` es la columna `@unique` del esquema, o sea que **es** la identidad de la
 * cuenta. Por eso {@link normalizarEmail} existe: sin ella, "Ana@x.com" y
 * "ana@x.com" serian dos cuentas distintas de la misma persona, y la segunda
 * creacion soltaria un `409` sin explicacion.
 */

export { ACCIONES_USUARIO, type AccionUsuario } from "@/lib/usuarios-panel";

/**
 * Correo de una cuenta, ya normalizado.
 *
 * A diferencia de los datos legales, aqui **no** hay `preprocess` que convierta
 * `""` en ausencia: un usuario **necesita** correo. Una cuenta sin correo no
 * tiene identidad, y `email` es unico y obligatorio en el esquema.
 */
export function normalizarEmail(entrada: string): string {
  return entrada.trim().toLowerCase();
}

/** Un correo de cuenta: se normaliza y se valida. */
export const EmailSchema = z
  .string({ error: "El correo es obligatorio" })
  .trim()
  .min(1, "El correo es obligatorio")
  .toLowerCase()
  .max(254, "El correo es demasiado largo")
  .email("El correo no es válido");

/**
 * Los dos roles, leidos del enum generado.
 *
 * Se leen del cliente y no se escriben a mano: si manana se anade un rol al
 * esquema, esta lista lo recoge sin que nadie se acuerde de updating el panel. Y
 * como el enum es tambien lo que Prisma acepta, un rol fuera de aqui **no puede**
 * llegar a la base de datos.
 *
 * El panel **no** usa esta lista, sino la de `usuarios-panel.ts`, porque este
 * fichero no se puede importar desde un Client Component. Las dos estan atadas por
 * un test, asi que la garantia no se pierde por el cambio.
 */
const ROLES_DEL_ESQUEMA = Object.values(Role) as readonly Rol[];

/**
 * Queja de contraseña, reutilizando el texto que ya da `account-schema.ts`.
 *
 * No se escribe aquí un mensaje nuevo: el panel y el usuario tienen que leer lo
 * mismo que leen al cambiar su propia contraseña, o van a tener dos reglas
 * distintas en la cabeza.
 */
function quejaDePolitica(rol: Rol): string {
  return rol === "ADMIN"
    ? `La contraseña de un ADMIN necesita ${BUYER_PASSWORD_MIN_LENGTH} caracteres o más, con mayúscula, minúscula, un dígito y un símbolo.`
    : `La contraseña necesita ${BUYER_PASSWORD_MIN_LENGTH} caracteres o más.`;
}

/**
 * Comprueba la contraseña contra la política **del rol que se le pasa**.
 *
 * @param contrasena - La contraseña tal cual la escribió alguien.
 * @param rol - El rol de la cuenta que se va a crear.
 * @returns `null` si cumple, o el mensaje con el motivo.
 */
export function compruebaContrasena(
  contrasena: string,
  rol: Rol,
): string | null {
  if (contrasena.length > PASSWORD_MAX_LENGTH) {
    return `La contraseña es demasiado larga (máximo ${PASSWORD_MAX_LENGTH}).`;
  }
  if (!meetsPasswordPolicy(contrasena, rol)) {
    return quejaDePolitica(rol);
  }
  return null;
}

/**
 * Creación de una cuenta desde el panel (RF-3).
 *
 * El `superRefine` es lo que ata la contraseña al rol: en un `z.object` normal no
 * se puede, porque el rol **viene del propio cuerpo** y la regla depende de él.
 * Con `superRefine` se lee el rol ya validado y se aplica su política, de modo que
 * un rol inventado falla por el enum y una contraseña corta falla por la política.
 */
export const NuevoUsuarioSchema = z
  .object({
    email: EmailSchema,
    nombre: z.string().trim().min(PROFILE_NAME_MIN_LENGTH).max(PROFILE_NAME_MAX_LENGTH).optional(),
    rol: z.enum(ROLES_DEL_ESQUEMA as unknown as [Rol, ...Rol[]], {
      error: `El rol debe ser uno de: ${ROLES_DEL_ESQUEMA.join(", ")}.`,
    }),
    contrasena: z
      .string({ error: "La contraseña es obligatoria" })
      .min(1, "La contraseña es obligatoria")
      .max(PASSWORD_MAX_LENGTH, "La contraseña es demasiado larga"),
  })
  .superRefine((datos, ctx) => {
    const problema = compruebaContrasena(datos.contrasena, datos.rol);
    if (problema !== null) {
      ctx.addIssue({
        code: "custom",
        path: ["contrasena"],
        message: problema,
      });
    }
  });

/**
 * Un cambio sobre una cuenta existente.
 *
 * La contraseña y el rol son **condicionales**, y cada acción exige el suyo:
 * `restablecer_contrasena` sin contraseña sería un `PATCH` que dice "hecho" sin
 * cambiar nada, y `cambiar_rol` sin rol dejaría la cuenta con el rol viejo. Los
 * dos se validan aquí, no en la ruta, para que el panel y la API miren lo mismo.
 *
 * `ACCIONES_USUARIO` viene de `usuarios-panel.ts`, no se declara aquí: es la misma
 * lista que pinta el panel, y tener dos sería el comienzo de un forget. Se
 * reexporta arriba.
 */
export const CambioUsuarioSchema = z
  .object({
    id: z.coerce
      .number({ error: "La cuenta no es válida" })
      .int("La cuenta no es válida")
      .positive("La cuenta no es válida"),
    accion: z.enum(ACCIONES_USUARIO, {
      error: `La acción debe ser una de: ${ACCIONES_USUARIO.join(", ")}.`,
    }),
    rol: z.enum(ROLES_DEL_ESQUEMA as unknown as [Rol, ...Rol[]]).optional(),
    contrasena: z
      .string()
      .min(1, "La contraseña es obligatoria")
      .max(PASSWORD_MAX_LENGTH, "La contraseña es demasiado larga")
      .optional(),
  })
  .superRefine((datos, ctx) => {
    if (datos.accion === "cambiar_rol" && datos.rol === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["rol"],
        message: "Indica el rol nuevo.",
      });
    }

    if (datos.accion === "restablecer_contrasena") {
      // Aqui **no** se comprueba la politica, y el motivo es concreto: la politica
      // depende del rol, y el rol de la cuenta **no viene en el cuerpo** de esta
      // llamada — hay que leerlo de la base de datos. Si se validara aqui contra un
      // rol por defecto, restablecer la contrasena de un ADMIN pasaria con la
      // politica de un BUYER (8 caracteres, sin simbolos), que es justo el fallo que
      // D21 viene a cerrar.
      //
      // Asi que aqui solo se exige que la contrasena **venga**, y quien valida es
      // `compruebaContrasena(contrasena, cuenta.role)` en la ruta, ya con el rol
      // leido. Es la misma funcion, no hay dos reglas.
      if (datos.contrasena === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["contrasena"],
          message: "Indica la contraseña nueva.",
        });
      }
    }
  });
