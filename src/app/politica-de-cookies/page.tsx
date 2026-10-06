import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/LegalPage";

/**
 * Política de cookies.
 *
 * `force-dynamic` va **aqui**, en el `page.tsx`, y no en un componente: la pagina
 * lee `LegalData` para poder rellenar los datos del negocio, y una pagina
 * prerenderizada publicaria los marcadores de "falta este dato" congelados en el
 * momento del build.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Política de cookies | Pingo POP",
  description:
    "Qué cookies usa este sitio: una sola cookie de sesión y el almacenamiento local del carrito. No hay cookies de terceros, ni publicidad, ni medición de audiencia.",
};

export default function PoliticaCookiesPage() {
  return <LegalPage slug="politica-de-cookies" />;
}
