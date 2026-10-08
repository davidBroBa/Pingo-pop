import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";

import { RegisterForm } from "./RegisterForm";

export const dynamic = "force-dynamic";

export default async function RegistroPage(): Promise<React.ReactElement> {
  const session = await getSession();
  if (session !== null) {
    redirect("/");
  }

  return (
    <main className="main-column flex flex-col gap-8 py-10">
      <section className="rounded-lg border border-border bg-card p-8 shadow-cartoon-sm">
        <h1 className="text-3xl font-bold tracking-tight text-ink">Crear cuenta</h1>
        <p className="mt-2 text-sm text-muted">
          Crea una cuenta de cliente para solicitar cotizaciones y gestionar tu perfil.
        </p>
        <div className="mt-8">
          <RegisterForm />
        </div>
      </section>
    </main>
  );
}
