import { readFileSync, writeFileSync } from "node:fs";

/**
 * Recalcula las huellas de los siete documentos tras corregir el texto.
 *
 * La huella **es** un sha256 del contenido, y el contenido cambio al poner las
 * tildes: dejarlas desfasadas haria que el guard que construye este modulo
 * marcara "huella desfasada", que es exactamente lo que debe pasar si alguien
 * edita el texto sin actualizar la firma.
 *
 * No se inventa nada: se llama a la **misma** funcion que usa el modulo
 * (`huellaDe`), con el contenido tal y como queda en el fichero.
 */

const RUTA = "src/lib/legal-versions.ts";

async function main(): Promise<void> {
  const { DOCUMENTOS, huellaDe } = await import("../src/lib/legal-versions");
  const fuente = readFileSync(RUTA, "utf8");

  const cambios: string[] = [];
  let actualizado = fuente;

  for (const documento of DOCUMENTOS) {
    const real = huellaDe(documento.contenido);
    if (real === documento.huella) continue;

    // Solo se sustituye la huella de ESE documento, no la primera coincidencia.
    const patron = new RegExp(
      `(slug: "${documento.slug}",[\\s\\S]{0,400}?huella: ")${documento.huella}(")`,
    );
    if (!patron.test(actualizado)) {
      console.error(
        `ABORTA: no encuentro la huella ${documento.huella} de ${documento.slug}.`,
      );
      process.exit(1);
    }
    actualizado = actualizado.replace(patron, `$1${real}$2`);
    cambios.push(`  ${documento.slug}: ${documento.huella} -> ${real}`);
  }

  if (cambios.length === 0) {
    console.log("ninguna huella estaba desfasada");
    return;
  }

  writeFileSync(RUTA, actualizado, "utf8");
  console.log(`huellas recalculadas: ${cambios.length}`);
  for (const c of cambios) console.log(c);
}

void main().then(
  () => process.exit(0),
  (e: unknown) => {
    console.error("FALLO:", e instanceof Error ? e.message : String(e));
    process.exit(1);
  },
);