import { redirect } from "next/navigation";

import AdminNavLinks from "@/app/admin/AdminNavLinks";
import { LegalView } from "@/app/admin/legal/LegalView";
import { getSession } from "@/lib/auth/session";
import { camposFaltantes, type EntradaLegal } from "@/lib/legal-data";
import { readLegalData } from "@/lib/legal-settings";

/**
 * Panel de datos legales (D18).
 *
 * ## Que resuelve
 *
 * Los seis datos del responsable (razón social, RFC, domicilio fiscal, correo,
 * teléfono y responsable de datos personales) son **de la base de datos**, no
 * variables de entorno. Antes de este panel la única forma de rellenarlos era
 * escribir en la tabla a mano, y como `PATCH /api/admin/legal` no lo llamaba
 * nadie, rellenarlos no cambiaba nada visible. Esta pagina es la via.
 *
 * ## Por qué lee los datos aquí y no los pide al cliente
 *
 * Al revés que el panel de cotizaciones, y el motivo es que **aquí no hay datos
 * personales de terceros**: son datos del propio negocio, que además van a estar
 * publicados en las páginas legales. La revocación de sesión la resuelve
 * `requireAdmin()` en cada escritura, igual que en cualquier otro sitio.
 *
 * La comprobación de sesión se repite aunque el middleware ya proteja `/admin/*`,
 * por las mismas dos razones que se explican en `src/app/admin/apariencia/page.tsx`:
 * el middleware corre en Edge y no puede consultar la base de datos, así que no
 * puede revocar.
 */
export default async function AdminLegalPage() {
  const session = await getSession();
  if (session === null || session.role !== "ADMIN") {
    redirect("/login");
  }

  // Lectura tolerante a fallos: si la base de datos cae, el panel se abre con los
  // seis campos vacíos en vez de dar un 500. Es el mismo `readLegalData()` que
  // usarán las páginas legales, así que el panel ve exactamente lo que se
  // publicaría.
  const datos: EntradaLegal = await readLegalData();

  // El aviso de RF-3 sale de la función pura, no de una lista escrita aquí: si se
  // escribiera a mano, se quedaría corto en cuanto `LegalData` ganara un campo.
  const faltantes = camposFaltantes(datos);

  return (
    <main className="min-h-screen bg-cartoon-cream px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <AdminNavLinks />

        <div className="mb-10">
          <p className="cartoon-border cartoon-shadow-sm mb-4 inline-block rotate-[-1deg] rounded-full bg-white px-3 py-1 text-sm font-semibold uppercase tracking-[0.15em] text-primary">
            Administración
          </p>

          <h1 className="font-heading text-4xl font-bold text-primary">
            Datos legales
          </h1>

          <p className="mt-3 text-foreground-muted">
            Los seis datos que aparecen en los documentos legales. Mientras no estén
            todos, las páginas públicas los sustituyen por una marca de texto sin
            terminar.
          </p>
        </div>

        <LegalView datos={datos} faltantes={faltantes} />
      </div>
    </main>
  );
}
