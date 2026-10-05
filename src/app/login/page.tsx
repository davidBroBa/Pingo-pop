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
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  // Quien ya tiene sesion no deberia ver el formulario.
  const session = await getSession();
  if (session !== null) {
    redirect(session.role === "ADMIN" ? "/admin/productos" : "/");
  }

  const params = await searchParams;
  const raw = params.next;
  // Solo se acepta una ruta interna: una absoluta o un `//host` permitiria
  // redirigir al usuario a otro sitio tras identificarse.
  const next =
    typeof raw === "string" && raw.startsWith("/admin") && !raw.startsWith("//")
      ? raw
      : null;

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
