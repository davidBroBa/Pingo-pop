/**
 * Regenera los iconos del sitio desde el logo de la empresa.
 *
 * Fuente unica: `public/images/logo/logo.png`. Salida en `src/app/`, donde
 * Next App Router los publica automaticamente:
 *   - favicon.ico     (ICO 32x32, contenedor clasico con PNG embebido)
 *   - icon.png        (link rel="icon" moderno)
 *   - apple-icon.png  (iOS, 180px)
 *
 * Usage: node specs/012-favicon-404-registro/iconos.mjs
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const logoPath = path.join(root, "public", "images", "logo", "logo.png");
const outDir = path.join(root, "src", "app");

/** Envuelve un PNG en un contenedor ICO (formato Vista+: PNG embebido). */
function icoFromPng(png) {
  const offset = 6 + 16;
  const header = Buffer.alloc(offset);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // count
  header.writeUInt8(32, 6); // width
  header.writeUInt8(32, 7); // height
  header.writeUInt8(0, 8); // palette: 0
  header.writeUInt8(0, 9); // reserved
  header.writeUInt16LE(1, 10); // planes
  header.writeUInt16LE(32, 12); // bpp
  header.writeUInt32LE(png.length, 14); // bytes in res
  header.writeUInt32LE(offset, 18); // offset to image data
  return Buffer.concat([header, png]);
}

async function main() {
  const meta = await sharp(logoPath).metadata();
  if (meta.width !== meta.height) {
    throw new Error(`El logo debe ser cuadrado: ${meta.width}x${meta.height}`);
  }

  // 32x32 para la pestaña y el .ico clasico. El PNG embebido en el ICO debe
  // ser RGBA (con canal alfa): el decodificador de Next lo exige.
  const png32 = await sharp(logoPath)
    .resize(32, 32, { fit: "inside" })
    .ensureAlpha()
    .png()
    .toBuffer();

  // 180x180 para iOS
  const png180 = await sharp(logoPath)
    .resize(180, 180, { fit: "inside" })
    .ensureAlpha()
    .png()
    .toBuffer();

  await writeFile(path.join(outDir, "favicon.ico"), icoFromPng(png32));
  await writeFile(path.join(outDir, "icon.png"), png32);
  await writeFile(path.join(outDir, "apple-icon.png"), png180);

  // Asserts: los ficheros existen con las dimensiones pedidas.
  const pngMeta = await sharp(png32).metadata();
  if (pngMeta.width !== 32 || pngMeta.height !== 32) {
    throw new Error(`icon.png: ${pngMeta.width}x${pngMeta.height} != 32x32`);
  }
  const appleMeta = await sharp(png180).metadata();
  if (appleMeta.width !== 180 || appleMeta.height !== 180) {
    throw new Error(
      `apple-icon.png: ${appleMeta.width}x${appleMeta.height} != 180x180`,
    );
  }

  // El ICO no es legible por sharp (solo salida): se valida su cabecera.
  const ico = await readFile(path.join(outDir, "favicon.ico"));
  if (ico.length < 22) throw new Error("favicon.ico: cabecera incompleta");
  if (ico.readUInt16LE(2) !== 1) throw new Error("favicon.ico: type != icon");
  if (ico.readUInt16LE(4) !== 1) throw new Error("favicon.ico: count != 1");
  if (ico.readUInt8(6) === 0 || ico.readUInt8(6) === 256) {
    throw new Error(`favicon.ico: ancho inesperado ${ico.readUInt8(6)}`);
  }

  console.log("iconos generados OK");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});