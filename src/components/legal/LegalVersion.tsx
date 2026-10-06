import type { Documento } from "@/lib/legal-versions";

/**
 * Linea de version y fecha de un documento legal (RF-6).
 *
 * ## Por que tiene que verse
 *
 * Un documento legal sin version ni fecha **no sirve para nada**: si el aviso se
 * publica hoy y cambia en seis meses, no hay forma de demostrar que version vio
 * la persona cuando acepto. El panel de cotizaciones guarda la version de cada
 * solicitud precisamente para poder exigir este documento (RF-21).
 *
 * Y la huella va aqui a proposito. Los **12 primeros hex** del sha256 del
 * contenido son lo que permite demostrar que una copia de este documento es
 * exactamente la que se publico. Sin duda, porque ese hash es lo que se firmo
 * arriba; con duda, porque asi se puede comprobar.
 *
 * @param documento - El documento ya resuelto.
 */
export function LegalVersion({ documento }: { documento: Documento }) {
  return (
    <p className="text-sm text-foreground-muted">
      Versión {documento.version} · Última actualización:{" "}
      {documento.actualizadoEn} · Identificador:{" "}
      <code className="rounded bg-cartoon-cream px-1.5 py-0.5 text-xs">
        {documento.huella}
      </code>
    </p>
  );
}
