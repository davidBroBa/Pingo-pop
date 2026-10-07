import type { ReactNode } from "react";

import { Footer, Navbar } from "../";

interface MainLayoutProps {
  children: ReactNode;
  /**
   * Si el visitante tiene sesion, para que el navbar ofrezca "Mi perfil" en lugar de
   * "Iniciar sesion".
   *
   * Lo decide **cada pagina** y se lo pasa como propiedad, en vez de leer las cookies
   * aqui dentro. El motivo es concreto: `MainLayout` lo usan paginas que Next
   * prerenderiza como HTML estatico (`/contacto`, `/novedades`), y ahi no hay
   * `cookies()` disponible. Si este componente fuera `async` y leyera la sesion,
   * esas paginas dejarian de poder prerenderizarse. Quien necesite el dato de verdad
   * (como `/perfil`) ya es dinamica y comprueba la sesion por su cuenta.
   *
   * @defaultValue `false`
   */
  haySesion?: boolean;
}

export function MainLayout({ children, haySesion = false }: MainLayoutProps) {
  return (
    <>
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] cartoon-focus focus:rounded-2xl focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary"
      >
        Saltar al contenido
      </a>

      <Navbar haySesion={haySesion} />

      {/* El tabIndex=-1 hace que `main` sea enfocable por programa, que es lo
          que necesita el enlace "Saltar al contenido" (WCAG 2.4.1). No entra
          en el orden de tabulacion natural. */}
      <main id="contenido" tabIndex={-1}>
        {children}
      </main>

      <Footer />
    </>
  );
}
