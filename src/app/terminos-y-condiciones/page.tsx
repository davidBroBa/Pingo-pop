import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/LegalPage";

/**
 * Términos y condiciones.
 *
 * `force-dynamic` va **aqui**, en el `page.tsx`, y no en un componente: la pagina
 * lee `LegalData` para poder rellenar los datos del negocio, y una pagina
 * prerenderizada publicaria los marcadores de "falta este dato" congelados en el
 * momento del build.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Términos y condiciones | Pingo POP",
  description:
    "Condiciones de uso del sitio de Pingo POP: qué es este negocio, qué se puede pedir, cómo se cierra una venta y qué se acepta al solicitar una cotización.",
};

export default function TerminosPage() {
  return <LegalPage slug="terminos-y-condiciones" />;
}
