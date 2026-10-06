import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/LegalPage";

/**
 * Accesibilidad.
 *
 * `force-dynamic` va **aqui**, en el `page.tsx`, y no en un componente: la pagina
 * lee `LegalData` para poder rellenar los datos del negocio, y una pagina
 * prerenderizada publicaria los marcadores de "falta este dato" congelados en el
 * momento del build.
 *
 * ## Lo que este documento NO dice (V14)
 *
 * **No dice que el sitio cumpla WCAG AA.** No se ha hecho una auditoria
 * externa, asi que afirmarlo seria mentira, y una mentira en un documento de
 * accesibilidad es de las peores: alguien podria fiarse de ella y no mirar.
 *
 * El texto del documento dice que se toma **como referencia** el estándar, que se
 * revisa la navegacion con teclado y el contraste, y que lo que no se ha
 * comprobado no se da por comprobado. Esa distincion es el contenido.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Accesibilidad | Pingo POP",
  description:
    "Qué se ha revisado en este sitio en materia de accesibilidad: navegación con teclado, visibilidad del foco, contraste y lenguaje. Incluye cómo reportar un problema.",
};

export default function AccesibilidadPage() {
  return <LegalPage slug="accesibilidad" />;
}
