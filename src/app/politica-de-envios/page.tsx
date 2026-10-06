import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/LegalPage";

/**
 * Política de envíos.
 *
 * `force-dynamic` va **aqui**, en el `page.tsx`, y no en un componente: la pagina
 * lee `LegalData` para poder rellenar los datos del negocio, y una pagina
 * prerenderizada publicaria los marcadores de "falta este dato" congelados en el
 * momento del build.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Política de envíos | Pingo POP",
  description:
    "Cómo se entrega un pedido en Pingo POP: en qué territorios, en qué plazo se responde una cotización y por qué este documento no fija un plazo de entrega que el sistema no puede cumplir.",
};

export default function PoliticaEnviosPage() {
  return <LegalPage slug="politica-de-envios" />;
}
