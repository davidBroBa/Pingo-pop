import { readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * Barrido de caracteres que no tienen nada que ver con un proyecto en espanol.
 *
 * Los ideogramas se han colado varias veces en este repositorio, casi siempre
 * por pasar texto por una tuberia de PowerShell en lugar de escribir el
 * fichero con la herramienta de edicion. Por eso el script **no se fia de su
 * propio resultado**: primero busca una cadena CJK que se sabe que existe, y si
 * no la encuentra es que el patron esta roto y el barrido no vale.
 *
 * Se ejecuta con un argumento opcional: la ruta de una cadena CONTROL que debe
 * encontrar. Sin el, el control es un temporal que se crea y se borra.
 */

const RAIZ = process.argv[2] ?? process.cwd();

/** Ideogramas CJK, cirilico, ancho completo y el caracter de reemplazo. */
const SOSPECHOSO = /[　-鿿Ѐ-ӿ＀-￯�]/;

/** Ficheros que se inspeccionan. */
const EXTENSIONES = [".ts", ".tsx", ".md", ".json", ".prisma", ".css"];
const OMITIR = new Set(["node_modules", ".next", ".git", "dist"]);

/**
 * El propio barrido se queda fuera, y no por hacen la vista: **tiene que**
 * contener los caracteres que busca, porque son su patron y su control. Si se
 * inspeccionara a si mismo, siempre encontraria dos lineas propias y el
 * resultado seria "hay dos problemas" siendo los dos el problema.
 */
const NO_INSPECCIONAR = "barrido-caracteres.ts";

function recorrer(directorio: string): string[] {
  const encontrados: string[] = [];
  for (const entrada of readdirSync(directorio)) {
    if (OMITIR.has(entrada)) continue;
    const completa = path.join(directorio, entrada);
    if (statSync(completa).isDirectory()) {
      encontrados.push(...recorrer(completa));
    } else if (
      entrada !== NO_INSPECCIONAR &&
      EXTENSIONES.some((e) => entrada.endsWith(e))
    ) {
      encontrados.push(completa);
    }
  }
  return encontrados;
}

function buscar(ficheros: string[]): Array<{ fichero: string; linea: number }> {
  const fallos: Array<{ fichero: string; linea: number }> = [];
  for (const fichero of ficheros) {
    const lineas = readFileSync(fichero, "utf8").split(/\r?\n/);
    lineas.forEach((linea, indice) => {
      if (SOSPECHOSO.test(linea)) fallos.push({ fichero, linea: indice + 1 });
    });
  }
  return fallos;
}

// --- CONTROL POSITIVO -------------------------------------------------------
// Un fichero con CJK tiene que salir. Si no sale, el patron no funciona.
const control = path.join(RAIZ, "__control_cjk__.ts");
const RELATIVO = path.relative(RAIZ, control).split(path.sep).join("/");
const VALOR_CONTROL = "你好";
writeFileSync(control, `export const c = "${VALOR_CONTROL}";\n`, "utf8");

const delControl = buscar([control]);
unlinkSync(control);

if (delControl.length === 0) {
  console.error(
    "FALLO DEL CONTROL: el patron no encontro el CJK que se le puso. El barrido no vale.",
  );
  process.exit(2);
}
console.log(
  `control positivo: OK (${RELATIVO} con "${VALOR_CONTROL}" detectado, patron vivo)`,
);
console.log("");

// --- BARRIDO REAL -----------------------------------------------------------
const ficheros = recorrer(RAIZ);
const fallos = buscar(ficheros);

console.log(`ficheros inspeccionados: ${ficheros.length}`);
if (fallos.length === 0) {
  console.log("RESULTADO: 0 coincidencias. Limpio.");
  process.exit(0);
}

console.log(`RESULTADO: ${fallos.length} lineas con caracteres sospechosos:`);
for (const fallo of fallos.slice(0, 40)) {
  console.log(
    `  ${path.relative(RAIZ, fallo.fichero).split(path.sep).join("/")}:${fallo.linea}`,
  );
}
process.exit(1);
