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
      <Navbar haySesion={haySesion} />

      <main>{children}</main>

      <Footer />
    </>
  );
}
