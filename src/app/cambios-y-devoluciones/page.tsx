import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/LegalPage";

/**
 * Cambios, cancelaciones y devoluciones.
 *
 * `force-dynamic` va **aqui**, en el `page.tsx`, y no en un componente: la pagina
 * lee `LegalData` para poder rellenar los datos del negocio, y una pagina
 * prerenderizada publicaria los marcadores de "falta este dato" congelados en el
 * momento del build.
 *
 * El nombre de la ruta lleva una "y" (`cambios-y-devoluciones`) porque es lo que
 * dice el titulo del documento, y el `LEGAL_LINKS` y el pie lo toman de ahi.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cambios, cancelaciones y devoluciones | Pingo POP",
  description:
    "Cómo se cancela una solicitud de cotización, qué cubre la garantía de los productos entregados y por qué en este sitio no hay reembolso: no hay pago en línea.",
};

export default function CambiosDevolucionesPage() {
  return <LegalPage slug="cambios-y-devoluciones" />;
}
