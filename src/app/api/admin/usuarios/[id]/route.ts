import { NextResponse } from "next/server";

import { z } from "zod";

import { hashPassword } from "@/lib/auth/password";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";
import { describePrismaError } from "@/lib/prisma-error";
import { CambioUsuarioSchema, compruebaContrasena } from "@/lib/usuarios";
import { validationError } from "@/lib/validation";

/**
 * Un cambio sobre **una** cuenta (spec 007).
 *
 * ## `DELETE` no existe, y no va a existir (RF-11)
 *
 * Desactivar es la operacion de retirada. Borrar una cuenta perderia el registro de
 * que existio, y no hay ningun log de auditoria que lo reconstruya. Que no haya un
 * verbo `DELETE` aqui es la unica forma de que el panel no ofrezca esa opcion por
 * descuido; `tests/usuarios.test.ts` lo comprueba leyendo este fichero.
 *
 * ## Cada accion va en su propia actualizacion
 *
 * No hay un `switch` que acabe en un `data` comun, porque cada accion necesita
 * campos distintos y una transaccion distinta. Un `default` que hiciera un update
 * generico seria justo el fallo que `CambioUsuarioSchema` evita en el borde: una
 * accion inventada que "sale bien" sin hacer nada.
 */

/** `params` llega como promesa: convencion del App Router, igual que en `/quotes/[id]`. */
type Contexto = { params: Promise<{ id: string }> };

/** Id numerico de la cuenta, validado antes de tocar la base de datos. */
const IdSchema = z.coerce
  .number({ error: "La cuenta no es válida" })
  .int("La cuenta no es válida")
  .positive("La cuenta no es válida");

/**
 * Aplica una de las cuatro acciones a una cuenta.
 *
 * Las dos autoprestaciones van **antes** de tocar nada y devuelven **400**, no 403:
 * no es un problema de permisos sino de una operacion que no tiene sentido sobre
 * uno mismo, y un 403 haria creer que falta rol cuando lo que falta es no apuntarse
 * a uno mismo.
 *
 * @param request - Peticion JSON con `{ id, accion, rol?, contrasena? }`.
 * @param context - Params de la ruta, con el id de la cuenta.
 * @returns 200 con la cuenta actualizada, o el motivo del rechazo.
 */
export async function PATCH(
  request: Request,
  context: Contexto,
): Promise<NextResponse> {
  const { denial, session } = await requireAdmin();
  if (denial !== null) {
    return denial;
  }

  const { id: idCrudo } = await context.params;
  const idParseado = IdSchema.safeParse(idCrudo);
  if (!idParseado.success) {
    return NextResponse.json(
      { error: "La cuenta indicada no es válida." },
      { status: 400 },
    );
  }
  const id = idParseado.data;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida" }, { status: 400 });
  }

  /**
   * El id **sale de la URL**, asi que no se fia del cuerpo. Un cuerpo con otro id
   * se ignora en lugar de confiarse, que si no, un panel con un bug podria cambiar
   * la cuenta 3 cuando el usuario eligio la 7.
   *
   * Un cuerpo que no sea un objeto se convierte en `{}` y lo rechaza el esquema por
   * falta de `accion`. No se intenta extender un `unknown`, que no compila, y no se
   * acepta un array: `{...array}` daria indices numericos como campos y el error
   * seria incomprensible.
   */
  const esObjeto =
    typeof raw === "object" && raw !== null && !Array.isArray(raw);
  const base = esObjeto ? (raw as Record<string, unknown>) : {};

  const parsed = CambioUsuarioSchema.safeParse({ ...base, id });
  if (!parsed.success) {
    return NextResponse.json(validationError(parsed.error.issues), {
      status: 400,
    });
  }
  const { accion, rol, contrasena } = parsed.data;

  /**
   * RF-10: nadie se quita a si mismo el panel ni la cuenta.
   *
   * Sin esto, un administrador puede desactivar su propia cuenta y dejar el sitio
   * sin nadie que lo administre, que es justo el problema que esta spec viene a
   * arreglar (perder el acceso). Con esta comprobacion, perderlo exige al menos
   * dos personas o un acesso por SSH.
   */
  if (id === session.userId && (accion === "desactivar" || accion === "cambiar_rol")) {
    return NextResponse.json(
      {
        error:
          accion === "desactivar"
            ? "No puedes desactivar tu propia cuenta."
            : "No puedes cambiar tu propio rol.",
      },
      { status: 400 },
    );
  }

  try {
    const cuenta = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });

    if (cuenta === null) {
      return NextResponse.json(
        { error: "La cuenta indicada no existe." },
        { status: 404 },
      );
    }

    /**
     * `restablecer_contrasena` se valida aqui y no en el esquema, porque la
     * politica depende del **rol que tiene la cuenta**, que solo se sabe ahora.
     * Es la unica accion que necesita leer la fila antes de decidir.
     *
     * El hash se calcula **despues** de validar la politica y no antes: hashear con
     * argon2 es caro, y no tiene sentido gastarlo en una contrasena que va a ser
     * rechazada.
     */
    let hash: string | null = null;
    if (accion === "restablecer_contrasena" && contrasena !== undefined) {
      const problema = compruebaContrasena(contrasena, cuenta.role);
      if (problema !== null) {
        return NextResponse.json({ contrasena: problema }, { status: 400 });
      }
      hash = await hashPassword(contrasena);
    }

    const actualizado = await prisma.user.update({
      where: { id },
      data: datosDeAccion(accion, { rol, hash }),
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        activo: true,
        debeCambiarContrasena: true,
      },
    });

    return NextResponse.json({ usuario: actualizado });
  } catch (error) {
    const fallo = describePrismaError(error, "No se pudo modificar la cuenta.");
    if (fallo.serverFault) {
      console.error("PATCH /api/admin/usuarios/[id] error:", fallo.message);
    }
    return NextResponse.json({ error: fallo.message }, { status: fallo.status });
  }
}

/** Lo que cada accion escribe. Se pasa ya calculada a `prisma.user.update`. */
type DatosAccion = {
  rol?: "BUYER" | "ADMIN";
  hash: string | null;
};

/**
 * Que escribe cada accion, en una funcion aparte para que se pueda leer de un
 * vistazo sin recorrer un `switch` dentro de la ruta.
 *
 * ## Por que desactivar y restablecer **suman `sessionVersion`**
 *
 * Es lo que hace que quitar el acceso quite el acceso de verdad (D23, RF-8/RF-9):
 * toda cookie emitida antes queda en una version anterior y deja de valer. Poner
 * solo `activo: false` dejaria sessions vivas de una cuenta desactivada, que es
 * justo el fallo tipico de estos sistemas.
 *
 * Y restablecer **vuelve a poner `debeCambiarContrasena: true`** (RF-9): la
 * contrasena que pone el administrador es temporal otra vez, y el flujo de D21 se
 * repite entero.
 */
function datosDeAccion(
  accion: "cambiar_rol" | "desactivar" | "reactivar" | "restablecer_contrasena",
  entrada: DatosAccion,
): Record<string, unknown> {
  switch (accion) {
    case "cambiar_rol":
      return { role: entrada.rol };
    case "desactivar":
      return { activo: false, sessionVersion: { increment: 1 } };
    case "reactivar":
      return { activo: true };
    case "restablecer_contrasena":
      return {
        // El hash lo inyecta la ruta antes de llamar; aqui solo se propaga.
        ...(entrada.hash === null ? {} : { passwordHash: entrada.hash }),
        debeCambiarContrasena: true,
        sessionVersion: { increment: 1 },
      };
  }
}
