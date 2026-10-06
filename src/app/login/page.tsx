import Link from "next/link";
import { redirect } from "next/navigation";

import LoginForm from "@/app/login/LoginForm";
import { getSession } from "@/lib/auth/session";

/**
 * Pantalla de acceso.
 *
 * Server Component: lee `searchParams` y la sesion actual, y deja el formulario
 * como Client Component. Asi el componente cliente no necesita `useSearchParams`,
 * que en App Router obliga a envolver la pagina en un `Suspense` para no romper
 * el prerender.
 */

/**
 * Metadatos de la pagina. Impide que un buscador indexe un formulario de acceso.
 */
export const metadata = {
  title: "Iniciar sesión | Pingo POP",
  robots: { index: false, follow: false },
};

/**
 * @param searchParams - Parametros de la URL; `next` lo inyecta el middleware.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; contrasena?: string | string[] }>;
}) {
  // Quien ya tiene sesion no deberia ver el formulario.
  const session = await getSession();
  if (session !== null) {
    redirect(session.role === "ADMIN" ? "/admin/productos" : "/perfil");
  }

  const params = await searchParams;
  const raw = params.next;
  // Solo se acepta una ruta interna: una absoluta o un `//host` permitiria
  // redirigir al usuario a otro sitio tras identificarse. `/perfil` se acepta
  // ademas porque el perfil lo usa cualquier usuario con sesion, no solo ADMIN.
  const next =
    typeof raw === "string" &&
    !raw.startsWith("//") &&
    (raw.startsWith("/admin") || raw === "/perfil")
      ? raw
      : null;

  // Aviso de que la contrasena se acaba de cambiar: el cambio revoca todas las
  // sesiones, asi que el usuario aterriza aqui y merece saber por que.
  const contrasenaCambiada = params.contrasena === "cambiada";

  return (
    <main className="flex min-h-screen items-center justify-center bg-cartoon-cream px-6 py-16">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <span className="cartoon-border cartoon-shadow-sm inline-block -rotate-2 rounded-full bg-accent px-4 py-1 text-sm font-semibold uppercase tracking-[0.15em] text-primary">
            Pingo
          </span>
          <h1 className="mt-4 text-4xl font-bold text-primary">
            Iniciar sesión
          </h1>
          <p className="mt-3 text-foreground-muted">
            Accede al panel para administrar el catálogo.
          </p>
        </div>

        {contrasenaCambiada ? (
          <p className="cartoon-border cartoon-shadow-sm mb-6 rounded-2xl bg-cartoon-mint px-4 py-3 text-sm font-medium text-primary">
            Contrasena cambiada. Entra de nuevo con la nueva.
          </p>
        ) : null}

        <LoginForm next={next} />

        <p className="mt-6 text-center text-sm text-foreground-muted">
          <Link
            href="/"
            className="cartoon-focus rounded-[8px] underline"
          >
            Volver a la tienda
          </Link>
        </p>
      </div>
    </main>
  );
}
