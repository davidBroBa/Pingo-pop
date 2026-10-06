import Link from "next/link";

/**
 * Enlaces entre las paginas de administracion (RF-37, RF-38).
 *
 * Antes de este componente **`/admin/categorias` no tenia ni un solo enlace
 * entrante**: el navbar no enlaza a ninguna ruta de administracion, asi que esa
 * pantalla solo se podia abrir escribiendo la URL a mano. Una pagina que no se
 * puede llegar no existe para quien tiene que usarla.
 *
 * Se monta en las cinco paginas de administracion en vez de meterse en
 * `MainLayout`, porque el navbar es publico y no debe mostrar enlaces de
 * administracion a quien no es administrador.
 *
 * El orden no es alfabetico y es a proposito: primero lo que se usa todos los
 * dias, despues lo que se usa cada pocos meses. Cotizaciones va la primera
 * porque es la unica via por la que entra trabajo, y Datos legales el ultimo
 * porque se escribe una vez y no se vuelve a tocar.
 *
 * `/admin/legal` entra en la tarea siguiente, junto con su pagina. Publicar el
 * enlace antes que la pagina seria repetir el fallo que este componente existe
 * para evitar.
 */
const PAGINAS = [
  { href: "/admin/cotizaciones", label: "Cotizaciones" },
  { href: "/admin/productos", label: "Productos" },
  { href: "/admin/categorias", label: "Categorías" },
  { href: "/admin/apariencia", label: "Apariencia" },
] as const;

export default function AdminNavLinks() {
  return (
    <nav
      aria-label="Secciones de administración"
      className="mb-10 flex flex-wrap gap-3"
    >
      {PAGINAS.map((pagina) => (
        <Link
          key={pagina.href}
          href={pagina.href}
          className="cartoon-border cartoon-shadow-sm cartoon-focus rounded-full bg-white px-4 py-2 text-sm font-semibold text-primary transition-transform duration-200 hover:-translate-y-0.5"
        >
          {pagina.label}
        </Link>
      ))}
    </nav>
  );
}