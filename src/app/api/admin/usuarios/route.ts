import { NextResponse } from "next/server";

import { hashPassword } from "@/lib/auth/password";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";
import { describePrismaError } from "@/lib/prisma-error";
import { NuevoUsuarioSchema } from "@/lib/usuarios";
import { validationError } from "@/lib/validation";

/**
 * Gestion de cuentas de usuario (spec 007).
 *
 * `requireAdmin()` corre **antes de tocar nada**: sin sesion **401**, con un rol
 * que no sea ADMIN **403**.
 *
 * ## Lo que hay aqui y lo que NO
 *
 * - **`GET`**: listar, y **nada de escritura**.
 * - **`POST`**: crear.
 * - **`DELETE`: no existe, y no existe a proposito** (RF-11). Desactivar es la
 *   operacion de retirada, en el `PATCH` de `[id]`. Que no exista un verbo que
 *   borre cuentas es la unica forma de que el panel no ofrezca esa opcion por
 *   descuido, y hay un test que lo comprueba con un `grep`.
 *
 * ## El listado no lleva el hash (RF-2, T6)
 *
 * El `select` es **explicito** y no un `include` de todo: asi `passwordHash` no
 * sale por sorpresa. Un hash de argon2id en una respuesta HTTP es una fuga aunque
 * no se pueda revertir, asi que la lista de cuentas no lo lleva nunca.
 */

/**
 * Lista las cuentas. Solo administradores.
 *
 * @returns 200 con `{ usuarios }`, sin `passwordHash` en ninguna parte.
 */
export async function GET(): Promise<NextResponse> {
  const { denial } = await requireAdmin();
  if (denial !== null) {
    return denial;
  }

  try {
    const usuarios = await prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        activo: true,
        debeCambiarContrasena: true,
        // `passwordHash` esta **expresamente ausente**: es la razon de que el
        // `select` sea explicito y no un `findMany` a pelo.
      },
    });

    return NextResponse.json({ usuarios });
  } catch (error) {
    const fallo = describePrismaError(error, "No se pudieron obtener las cuentas.");
    if (fallo.serverFault) {
      console.error("GET /api/admin/usuarios error:", fallo.message);
    }
    return NextResponse.json({ error: fallo.message }, { status: fallo.status });
  }
}

/**
 * Crea una cuenta. Solo administradores (D22: cualquier ADMIN puede crear otro
 * ADMIN; es una decision consciente del propietario, escrita en la spec para que no
 * parezca un descuido).
 *
 * La cuenta **nace con `debeCambiarContrasena: true`** (D21). Quien la creo conoce
 * una contrasena que sirve hasta que la persona entre y la cambie, y hasta entonces
 * no puede entrar al panel: lo comprueba el `proxy` con el `swc` de la cookie y lo
 * vuelve a comprobar `getSessionUser()` contra la base de datos.
 *
 * El correo es la identidad de la cuenta y es `@unique` en el esquema, asi que un
 * duplicado llega de Prisma como `P2002` y `describePrismaError` lo traduce a
 * **409** (RF-4). Sin esa traduccion seria un 500, que diria "el servidor esta
 * roto" cuando lo que esta mal es que el correo ya existe.
 *
 * @param request - Peticion JSON con `{ email, nombre?, rol, contrasena }`.
 * @returns 201 con la cuenta creada, 400 si el cuerpo no cuadra, 409 si el correo ya
 *   existe, 401/403 sin permisos.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const { denial } = await requireAdmin();
  if (denial !== null) {
    return denial;
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida" }, { status: 400 });
  }

  const parsed = NuevoUsuarioSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(validationError(parsed.error.issues), {
      status: 400,
    });
  }

  const { email, nombre, rol, contrasena } = parsed.data;

  try {
    // El hash va **antes** del `create`: si la contrasena no cumpliera la politica
    // se habria escrito ya. El esquema ya la valida, asi que esto es una segunda
    // linea de defensa y no una regla nueva.
    const passwordHash = await hashPassword(contrasena);

    const creada = await prisma.user.create({
      data: {
        email,
        name: nombre ?? null,
        role: rol,
        passwordHash,
        // D21: la cuenta nace marcada. No es un defecto que se pueda olvidar
        // desmarcar mas adelante, porque cambiarlo es un acto deliberado.
        debeCambiarContrasena: true,
        activo: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        activo: true,
        debeCambiarContrasena: true,
      },
    });

    return NextResponse.json({ usuario: creada }, { status: 201 });
  } catch (error) {
    const fallo = describePrismaError(
      error,
      "No se pudo crear la cuenta. Revisa que el correo no esté en uso.",
    );
    if (fallo.serverFault) {
      console.error("POST /api/admin/usuarios error:", fallo.message);
    }
    return NextResponse.json({ error: fallo.message }, { status: fallo.status });
  }
}
