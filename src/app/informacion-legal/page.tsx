import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/LegalPage";

/**
 * Informacion legal.
 *
 * `force-dynamic` va **aqui**, en el `page.tsx`, y no en un componente: la pagina
 * lee `LegalData` para poder rellenar los datos del negocio, y una pagina
 * prerenderizada publicaria los marcadores de "falta este dato" congelados en el
 * momento del build.
 *
 * ## Lo que este documento contiene
 *
 * Razon social, RFC, domicilio fiscal, correo de contacto, telefono y responsable
 * de los datos personales. Todos vienen de `LegalData`; si falta alguno sale el
 * marcador definido en `MARCADOR_PENDIENTE` (se importa, nunca se escribe a mano).
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Información legal | Pingo POP",
  description:
    "Datos de identificacion del responsable: razon social, RFC, domicilio fiscal, correo, telefono y responsable de proteccion de datos.",
};

export default function InformacionPage() {
  return <LegalPage slug="informacion-legal" />;
}