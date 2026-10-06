import { redirect } from "next/navigation";

import AdminNavLinks from "@/app/admin/AdminNavLinks";
import { CotizacionesView } from "@/app/admin/cotizaciones/CotizacionesView";
import { getSession } from "@/lib/auth/session";

/**
 * Panel de cotizaciones: las solicitudes que ha enviado la gente.
 *
 * ## Por que esta pagina es la mas importante de las tres
 *
 * El formulario de cotizacion es el unico camino por el que entra trabajo. Sin
 * esta pantalla, una solicitud que llega el martes se descubre el jueves, si
 * alguien se acordaba de mirar en la base de datos. Antes de la spec 009
 * `prisma.quoteRequest` aparecia **una sola vez** en todo el repositorio, la del
 * `create`: nadie podia leer, cambiar ni borrar una solicitud. Por eso el
 * borrado, el cambio de estado y la cuenta de vencidas son parte de este bloque y
 * no extras.
 *
 * ## `force-dynamic`, y por que va aqui y no en el componente
 *
 * Lee la sesion y pinta el instante actual. Si el HTML se prerenderizara, la
 * antiguedad de cada fila y el contador de vencidas serian los del momento del
 * build, que es justo el dato que deja de servir para trabajar. Va en el
 * `page.tsx` porque es la pagina la que lee: un componente no lo declara.
 *
 * La comprobacion de sesion se repite aunque el middleware ya proteja
 * `/admin/*`, por las mismas dos razones que se explican en
 * `src/app/admin/apariencia/page.tsx`: el middleware corre en Edge y no puede
 * consultar la base de datos, asi que **no puede revocar** una sesion invalidada
 * por un cambio de contrasena. El 401 de verdad llega aqui y en `requireAdmin()`.
 */
export const dynamic = "force-dynamic";

export default async function AdminCotizacionesPage() {
  const session = await getSession();
  if (session === null || session.role !== "ADMIN") {
    redirect("/login");
  }

  /**
   * Se lee **aqui dentro**, no en el modulo: el codigo de nivel de modulo se
   * ejecuta una vez al arrancar el proceso, y un reloj ahi congelado haria que
   * todas las antiguedades del panel fueran las del arranque. Ese error se ve
   * en un servidor que lleva semanas en pie, y es de los que nadie atribuye al
   * sitio.
   */
  const hoy = new Date();

  return (
    <main className="min-h-screen bg-cartoon-cream px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <AdminNavLinks />

        <div className="mb-10">
          <p className="cartoon-border cartoon-shadow-sm mb-4 inline-block rotate-[-1deg] rounded-full bg-white px-3 py-1 text-sm font-semibold uppercase tracking-[0.15em] text-primary">
            Administración
          </p>

          <h1 className="font-heading text-4xl font-bold text-primary">
            Cotizaciones
          </h1>

          <p className="mt-3 text-foreground-muted">
            Lo que ha pedido la gente. Enviar una solicitud{" "}
            <strong className="text-primary">no es comprar</strong>: el precio
            se acuerda por escrito antes de cobrar nada.
          </p>
        </div>

        {/* El reloj se lee aqui, en el servidor, y viaja como prop. El panel lo
            usa para las antiguedades y para decirlas contra el MISMO instante
            con el que la API conto las vencidas: si cada uno leyera su reloj,
            los dos numeros no cuadrarian. */}
        <CotizacionesView hoy={hoy.toISOString()} />
      </div>
    </main>
  );
}
