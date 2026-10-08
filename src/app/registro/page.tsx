import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";

import { RegisterForm } from "./RegisterForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Crea tu cuenta | Pingo POP",
  robots: { index: false, follow: false },
};

/**
 * Pantalla de creacion de cuenta de cliente.
 *
 * Server Component: comprueba la sesion (quien ya tiene cuenta no debe ver el
 * formulario) y deja el formulario como Client Component, igual que /login.
 */
export default async function RegistroPage(): Promise<React.ReactElement> {
  const session = await getSession();
  if (session !== null) {
    redirect(session.role === "ADMIN" ? "/admin/productos" : "/perfil");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-cartoon-cream px-6 py-16">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <span className="cartoon-border cartoon-shadow-sm inline-block -rotate-2 rounded-full bg-accent px-4 py-1 text-sm font-semibold uppercase tracking-[0.15em] text-primary">
            Pingo
          </span>
          <h1 className="mt-4 text-4xl font-bold text-primary">Crear cuenta</h1>
          <p className="mt-3 text-foreground-muted">
            Es un minuto: quedará lista para solicitar cotizaciones.
          </p>
        </div>

        <RegisterForm />

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