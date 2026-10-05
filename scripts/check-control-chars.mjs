/**
 * Comprobacion auxiliar: detecta bytes de control en ficheros de texto.
 *
 * Los bytes C0 (0x00-0x08, 0x0B, 0x0C, 0x0E-0x1F) y DEL (0x7F) no deberian
 * aparecer nunca dentro de codigo fuente: se colaron al escribir ficheros desde
 * la shell y rompen el parseo de TypeScript.
 *
 * Uso: node scripts/check-control-chars.cjs <fichero> [<fichero>...]
 */
import { readFileSync } from "node:fs";

const files = process.argv.slice(2);
let found = 0;

for (const file of files) {
  const bytes = readFileSync(file);
  const bad = [];
  for (let i = 0; i < bytes.length; i += 1) {
    const c = bytes[i];
    if (c < 9 || (c > 13 && c < 32) || c === 127) {
      bad.push(`${i}:0x${c.toString(16)}`);
    }
  }
  if (bad.length > 0) {
    found += 1;
    console.log(
      `${file}: ${bad.length} control byte(s) -> ${bad.slice(0, 12).join(" ")}`,
    );
  }
}

console.log(
  found === 0 ? "OK: sin bytes de control" : `FAIL: ${found} fichero(s) con controles`,
);
process.exit(found === 0 ? 0 : 1);