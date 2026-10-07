import { redirect } from "next/navigation";

import AdminNavLinks from "@/app/admin/AdminNavLinks";
import { UsuariosView } from "@/app/admin/usuarios/UsuariosView";
import { getSessionUser } from "@/lib/auth/session";

/**
 * Panel de cuentas de usuario (spec 007).
 *
 * ## Por que esta pagina consulta `getSessionUser()` y no `getSession()`
 *
 * Las otras paginas de administracion usan `getSession()` y comprueban el rol. Aqui
 * no, y es a proposito: una sesion revocada (contrasena cambiada por otra persona, o
 * cuenta desactivada) sigue teniendo una cookie **firmada y sin expirar**, asi que
 * `getSession()` la daria por buena. Esta pagina no consulta datos de cuentas, pero
 * si muestra el boton de activacion: si la sesion esta revocada, el panel tiene que
 * saberlo. `getSessionUser()` contrasta contra la base de datos y devuelve `null` si
 * la sesion ya no manda.
 *
 * Y hay un motivo mas especifico de la spec 007: una cuenta con contrasena temporal
 * **no debe entrar al panel**. El `proxy` ya le pone un 403, pero el `proxy` corre en
 * Edge y solo mira la cookie. Comprobar aqui que `swc !== 1` hace que la **base de
 * datos** tambien lo diga, sin depender de una cookie que alguien pueda haber
 * reemitido con otro dispositivo.
 *
 * ## `force-dynamic`
 *
 * Igual que en `/admin/cotizaciones`: lee la sesion, asi que el HTML no puede
 * prerenderizarse. Va en el `page.tsx` y no en el componente, porque es la pagina la
 * que lee.
 */
export const dynamic = "force-dynamic";

export default async function AdminUsuariosPage() {
  const session = await getSessionUser();
  if (session === null || session.role !== "ADMIN") {
    redirect("/login");
  }

  /**
   * Segunda linea del limite de D21, en el servidor y contra la base de datos.
   *
   * El `proxy` ya devuelve 403 para este caso, asi que en una navegacion normal aqui
   * no se llega. Se comprueba igualmente por defensa en profundidad: el `proxy` corre
   * en **Edge**, no tiene Prisma y solo ve la cookie firmada. Si el limite de la
   * cookie y el de la base de datos se desincronizasen, esta linea es la que evita
   * que el panel se abra.
   */
  if (session.swc === 1) {
    redirect("/perfil");
  }

  return (
    <main className="min-h-screen bg-cartoon-cream px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <AdminNavLinks />

        <div className="mb-10">
          <p className="cartoon-border cartoon-shadow-sm mb-4 inline-block rotate-[-1deg] rounded-full bg-white px-3 py-1 text-sm font-semibold uppercase tracking-[0.15em] text-primary">
            Administración
          </p>

          <h1 className="font-heading text-4xl font-bold text-primary">
            Cuentas
          </h1>

          <p className="mt-3 max-w-2xl text-foreground-muted">
            Quién puede entrar al sitio. La contraseña que pongas aquí es{" "}
            <strong className="text-primary">temporal</strong>: la persona tendrá que
            cambiarla al entrar, y hasta que lo haga no podrá entrar al panel.
          </p>
        </div>

        <UsuariosView />
      </div>
    </main>
  );
}