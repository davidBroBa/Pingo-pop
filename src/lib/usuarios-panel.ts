import { type Rol } from "@/lib/account-schema";

/**
 * Lo del panel de cuentas que necesita un **Client Component** (spec 007, T10).
 *
 * ## Por que esto vive aparte de `usuarios.ts`
 *
 * `usuarios.ts` importa el cliente generado de Prisma, para leer `Role` del enum y
 * que la lista de roles no se pueda quedar vieja. Ese cliente pide `node:module`, y
 * Turbopack **no puede trocearlo para el navegador**: `/admin/usuarios` reventaba con
 * un panic de chunking ("the chunking context does not support external modules") en
 * cuanto el componente de cliente importo el modulo.
 *
 * Es exactamente el error que ya se cometio dos veces en este repositorio, con
 * `legal-versions.ts` y su `node:crypto` (800 KB medidos). Por eso la regla del sitio es
 * que un modulo con dependencia de Node **nunca** se importa desde un Client
 * Component.
 *
 * ## El coste de esto, y como se paga
 *
 * {@link ROLES} esta **escrito a mano**, no ledo del enum. Podria desincronizarse si
 * mañana se anade un rol al esquema. Se paga con un test: `tests/usuarios.test.ts`
 * compara esta lista con `Object.values(Role)` y se pone rojo si divergen. Es el
 * mismo trato que `tests/cotizaciones-panel.test.ts` aplica a los titulos de los
 * documentos legales, y por el mismo motivo.
 *
 * ## Lo que si queda en `usuarios.ts`
 *
 * Los esquemas de Zod y `compruebaContrasena()`, que solo corren en el servidor. Si
 * algo de alli hiciera falta en el navegador habria que moverlo aqui **con su test**,
 * no al reves.
 */

/**
 * Los dos roles, escritos a mano.
 *
 * El orden es el que usa el panel: primero el de menos permisos. El enum los declara
 * en orden alfabetico y este no; el test compara **el mismo conjunto**, y el
 * `deepEqual` sobre el array obliga a que coincidan tambien en el orden, asi que si
 * alguien reordena el enum hay que reordenar esta lista.
 */
export const ROLES = ["BUYER", "ADMIN"] as const satisfies readonly Rol[];

/** Como se escribe cada rol para quien lo lee. */
export const ETIQUETA_ROL: Record<Rol, string> = {
  BUYER: "Comprador",
  ADMIN: "Administración",
};

/** Las cuatro acciones del panel. Una lista **cerrada**, no un `string` libre. */
export const ACCIONES_USUARIO = [
  "cambiar_rol",
  "desactivar",
  "reactivar",
  "restablecer_contrasena",
] as const;

/** Nombre de una de las cuatro acciones. */
export type AccionUsuario = (typeof ACCIONES_USUARIO)[number];

/**
 * Texto de confirmacion antes de una accion.
 *
 * **Por que esta en un modulo puro y no en el componente**: es un texto que se lee
 * justo antes de hacer clic, que es de las pocas cosas que un usuario lee **antes** de
 * confirmar. Poder probarlo sin navegador es la diferencia entre "suena bien" y "no se
 * pierde nada".
 *
 * Los avisos dicen lo que **de verdad** pasa, que no siempre es lo obvio:
 * `desactivar` cierra las sesiones abiertas, y `restablecer_contrasena` devuelve la
 * cuenta al modo temporal. Sin decirlo, alguien podria pensar que restablecer es solo
 * cambiar una contrasena y no volver a bloquear el panel.
 *
 * @param accion - La accion que se va a confirmar.
 * @param email - El correo de la cuenta afectada, para que el aviso sea inequivoco.
 * @returns El texto del aviso.
 */
export function textoConfirmacion(accion: AccionUsuario, email: string): string {
  switch (accion) {
    case "desactivar":
      return (
        `¿Desactivar la cuenta ${email}? Deja de poder entrar y cierra sus ` +
        "sesiones abiertas. La cuenta se conserva y se puede reactivar. " +
        "Esto no se puede deshacer con un clic."
      );
    case "reactivar":
      return `¿Reactivar la cuenta ${email}? Volverá a poder entrar con su contraseña.`;
    case "cambiar_rol":
      return `¿Cambiar el rol de ${email}? Tendrá los permisos del rol nuevo.`;
    case "restablecer_contrasena":
      return (
        `¿Restablecer la contraseña de ${email}? Volverá a ser una contraseña ` +
        "temporal: la persona tendrá que cambiarla al entrar, y sus sesiones " +
        "abiertas se cerrarán."
      );
  }
}