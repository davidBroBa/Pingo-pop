import * as argon2 from "argon2";

/**
 * Hashea y verifica contrasenas con argon2id.
 *
 * Sin `server-only` a proposito: este modulo es criptografia pura, sin secretos
 * ni acceso a datos, y lo necesitan tanto los route handlers como el seed de
 * `npm run db:seed`, que corre fuera del bundler de Next.
 *
 * argon2id es la variante hibrida que recomienda OWASP: resiste tanto ataques
 * de GPU como de hardware ASIC. Los parametros son el minimo recomendado
 * (64 MiB de memoria, 3 iteraciones, 1 lane).
 */

/** Memoria en KiB. 64 MiB: el minimo que fija la guia de OWASP. */
const MEMORY_COST_KIB = 65_536;

/** Iteraciones sobre la memoria. */
const TIME_COST = 3;

/** Lazily Parallelism. 1 mantiene el coste predecible en un host pequeno. */
const PARALLELISM = 1;

/**
 * Hashea una contrasena con argon2id.
 *
 * @param password - Contrasena en claro. Nunca se registra ni se persiste.
 * @returns Hash argon2id con su salt y parametros incrustados.
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: MEMORY_COST_KIB,
    timeCost: TIME_COST,
    parallelism: PARALLELISM,
  });
}

/**
 * Comprueba una contrasena contra su hash.
 *
 * @param hash - Hash argon2 almacenado.
 * @param password - Contrasena en claro aportada por el usuario.
 * @returns `true` si coincide; `false` si no coincide o si el hash es ilegible.
 */
export async function verifyPassword(
  hash: string,
  password: string,
): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    // Un hash corrupto no debe propagarse como error 500 hacia el cliente: se
    // trata igual que una contrasena incorrecta.
    return false;
  }
}

/**
 * Comprueba que una contrasena cumple la politica minima del proyecto.
 *
 * No reemplaza a un validador de lista contra brechas, pero descarta lo que de
 * forma trivial se compromiso: vacias, cortisimas o tipicamente de ejemplo.
 *
 * @param password - Contrasena candidata.
 * @returns `true` si cumple la politica.
 */
export function meetsPasswordPolicy(password: string): boolean {
  return (
    password.length >= 12 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password)
  );
}
