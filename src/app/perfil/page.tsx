import { redirect } from "next/navigation";

import ProfileView from "@/app/perfil/ProfileView";
import { MainLayout } from "@/components/layout";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

/**
 * Carga de la pagina de perfil.
 *
 * Se protege con `getSessionUser()` y no con `getSession()`: esta pagina decide si
 * puede mostrar datos de la cuenta, y una cookie firmada puede estar caducada de
 * verdad (contrasena cambiada) aunque todavia no haya expirado (spec 006).
 *
 * El `select` **no incluye nunca `passwordHash`**: el bloque de administrador recibe
 * estos datos en el HTML del servidor, asi que un campo de mas aqui seria una fuga
 * (RF-7). Para anadir algo hay que decidir conscientemente que puede un ADMIN ver.
 */
export default async function PerfilPage() {
  const session = await getSessionUser();
  if (session === null) {
    redirect("/login?next=/perfil");
  }

  const usuario = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      sessionVersion: true,
    },
  });

  // La sesion se comprobo hace un momento contra la misma tabla; si el usuario ha
  // desaparecido entre medias (baja manual), no hay perfil que mostrar.
  if (usuario === null) {
    redirect("/login?next=/perfil");
  }

  const esAdmin = usuario.role === "ADMIN";

  return (
    <MainLayout haySesion>
      <ProfileView
        usuario={{
          id: usuario.id,
          email: usuario.email,
          name: usuario.name,
          role: usuario.role,
          createdAt: usuario.createdAt.toISOString(),
          updatedAt: usuario.updatedAt.toISOString(),
        }}
        sesion={{
          emitidaEn: new Date(session.iat).toISOString(),
          caducaEn: new Date(session.exp).toISOString(),
        }}
        esAdmin={esAdmin}
        /* La verdad es `session.swc`, que `getSessionUser()` acaba de releer de la
           base de datos (spec 007). No se lee `usuario.debeCambiarContrasena` de
           este `findUnique` a proposito: el `select` de arriba no lo pide, y
           duplicar el dato en dos sitios invita a que se usen desparejados. La
           sesion ya lo tiene y viene de la misma tabla. */
        debeCambiarContrasena={session.swc === 1}
      />
    </MainLayout>
  );
}
