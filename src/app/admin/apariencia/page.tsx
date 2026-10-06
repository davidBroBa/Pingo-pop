import { redirect } from "next/navigation";

import AdminNavLinks from "@/app/admin/AdminNavLinks";
import { AparienciaView } from "@/app/admin/apariencia/AparienciaView";
import { getSession } from "@/lib/auth/session";
import { readHeroImage } from "@/lib/site-settings";

/**
 * Panel de apariencia del sitio (D10).
 *
 * Vive en su propia pagina y no dentro de `/admin/productos` porque "ajustes del
 * sitio" y "catalogo" son cosas distintas: dentro de un mes habra mas ajustes
 * y meterlos en el formulario de productos los habria escondido.
 *
 * La comprobacion de sesion se repite aqui aunque el middleware ya proteja
 * `/admin/*`, por las mismas dos razones que se explican en
 * `src/app/admin/categorias/page.tsx`: el middleware es una capa conveniente,
 * no la unica barrera, y esta pagina necesita renderizarse en cada peticion para
 * que una cache no pueda servir el HTML sin pasar por el.
 */
export default async function AdminAparienciaPage() {
  const session = await getSession();
  if (session === null || session.role !== "ADMIN") {
    redirect("/login");
  }

  const heroImage = await readHeroImage();

  return (
    <main className="min-h-screen bg-cartoon-cream px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <AdminNavLinks />

        <div className="mb-10">
          <p className="cartoon-border cartoon-shadow-sm mb-4 inline-block rotate-[-1deg] rounded-full bg-white px-3 py-1 text-sm font-semibold uppercase tracking-[0.15em] text-primary">
            Administración
          </p>

          <h1 className="font-heading text-4xl font-bold text-primary">
            Apariencia del sitio
          </h1>

          <p className="mt-3 text-foreground-muted">
            La foto que aparece en la parte alta de la portada.
          </p>
        </div>

        <AparienciaView heroImage={heroImage} />
      </div>
    </main>
  );
}