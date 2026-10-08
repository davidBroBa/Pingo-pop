import { z } from "zod";

import { meetsPasswordPolicy, type Rol } from "@/lib/account-schema";
import { hasControlChars } from "@/lib/control-chars";
import {
  DOCUMENTO_POR_TIPO,
  sonVersionesValidas,
  versionDe,
} from "@/lib/legal-versions";

/**
 * Versión mostrada de un documento legal.
 */
const versionMostrada = z
  .string({ error: "Falta la version del documento" })
  .trim()
  .min(1, "Falta la version del documento")
  .max(20, "La version del documento no es valida");

const AceptacionSchema = z
  .object({
    acepta: z.literal(true, {
      error: "Debes aceptar los documentos legales.",
    }),
    terminos: versionMostrada,
    privacidad: versionMostrada,
    cookies: versionMostrada.optional().default(versionDe(DOCUMENTO_POR_TIPO.COOKIES) ?? "1.0"),
  })
  .refine(
    (aceptacion) =>
      sonVersionesValidas({
        [DOCUMENTO_POR_TIPO.TERMINOS]: aceptacion.terminos,
        [DOCUMENTO_POR_TIPO.PRIVACIDAD]: aceptacion.privacidad,
        [DOCUMENTO_POR_TIPO.COOKIES]:
          aceptacion.cookies ?? versionDe(DOCUMENTO_POR_TIPO.COOKIES) ?? "",
      }),
    {
      message: "Los documentos se han actualizado. Recarga la pagina y vuelve a aceptarlos.",
      path: ["acepta"],
    },
  );



export const RegisterSchema = z
  .object({
    email: z
      .string({ error: "Escribe tu correo electronico." })
      .trim()
      .toLowerCase()
      .email("El correo no es valido")
      .min(1, "Escribe tu correo electronico.")
      .max(254, "El correo es demasiado largo"),
    name: z
      .string({ error: "Escribe tu nombre." })
      .trim()
      .min(2, "Tu nombre debe tener al menos 2 caracteres")
      .max(80, "Tu nombre es demasiado largo")
      .refine((value) => !hasControlChars(value), {
        message: "El nombre contiene caracteres no permitidos",
      })
      .optional(),
    password: z
      .string({ error: "Escribe una contrasena." })
      .min(8, "La contrasena debe tener al menos 8 caracteres")
      .max(200, "La contrasena es demasiado larga"),
    confirmPassword: z.string({ error: "Repite tu contrasena." }),
    aceptacion: AceptacionSchema,
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Las contrasenas no coinciden",
    path: ["confirmPassword"],
  })
  .refine(
    (value) => meetsPasswordPolicy(value.password, "BUYER" as Rol),
    {
      message: "La contrasena no cumple la politica para cuentas de cliente.",
      path: ["password"],
    },
  );

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type AceptacionInput = z.infer<typeof AceptacionSchema>;
