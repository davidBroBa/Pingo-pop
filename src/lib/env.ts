/**
 * Acceso a la configuracion sensible del entorno.
 *
 * Centraliza dos garantias:
 *
 *  1. No hay credenciales escritas en el codigo. Cualquier valor que necesite
 *     venir del entorno se lee aqui y falla de forma explicita si falta.
 *  2. No hay un unico sitio donde buscar el secreto de sesion o la contrasena
 *     de la base de datos, lo que reduce la superficie en una fuga.
 */

/** Variables que la aplicacion no puede arrancar sin ellas. */
type RequiredEnv = "DATABASE_URL" | "SESSION_SECRET";

/**
 * Longitud minima del secreto de sesion.
 *
 * Un HMAC con clave corta se puede atacar por fuerza bruta offline. 32
 * caracteres (256 bits) es el minimo razonable para una clave de firma.
 */
const MIN_SECRET_LENGTH = 32;

/** Puerto de desarrollo, para construir la URL base si no hay `SITE_URL`. */
const DEV_URL = "http://localhost:3000";

/**
 * URL publica del sitio, sin barra final.
 *
 * **No** es obligatoria: solo la necesitan `robots.txt` y `sitemap.xml`, y
 * arrancar la tienda entera sin ellos seria peor que publicarlos con una URL
 * de ejemplo. En desarrollo cae a `localhost:3000`; en produccion, si falta,
 * cae tambien a `localhost`, que es visible a quien lea el sitemap y **delata
 * que nadie ha revisado la variable**. Por eso avisa una vez en el log.
 *
 * @returns La URL base, siempre sin barra al final.
 */
export function getSiteUrl(): string {
  const raw = process.env.SITE_URL;
  if (raw === undefined || raw.trim() === "") {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "SITE_URL no esta definida: robots.txt y sitemap.xml saldran con localhost. Definala en el servidor.",
      );
    }
    return DEV_URL;
  }
  const limpio = raw.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//.test(limpio)) {
    throw new Error(
      `SITE_URL debe empezar por http:// o https://, no "${limpio}".`,
    );
  }
  return limpio;
}

/**
 * Lee una variable de entorno obligatoria.
 *
 * @param name - Nombre de la variable.
 * @returns Su valor, no vacio.
 * @throws Si la variable no existe o esta vacia. Preferimos que el proceso no
 *   arranque a que arranque con la sesion rota o sin base de datos.
 */
export function requireEnv(name: RequiredEnv): string {
  const value = process.env[name];
  if (value === undefined || value.length === 0) {
    throw new Error(
      `Falta la variable de entorno ${name}. Copia .env.example a .env y rellenala.`,
    );
  }
  return value;
}

/**
 * Devuelve el secreto de firma de sesion.
 *
 * @returns El secreto, con al menos 32 caracteres.
 * @throws Si es mas corto: una clave debil aqui permite falsificar sesiones.
 */
export function getSessionSecret(): string {
  const secret = requireEnv("SESSION_SECRET");
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `SESSION_SECRET debe tener al menos ${MIN_SECRET_LENGTH} caracteres.`,
    );
  }
  return secret;
}

/** Configuracion de conexion que espera el adaptador de Prisma. */
export type DatabaseConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
};

/**
 * Deriva la configuracion del adaptador a partir de `DATABASE_URL`.
 *
 * Se parsea la URL en vez de tener host y usuario sueltos en el codigo: una
 * sola variable que significa una sola cosa, y no queda ningun `root` escrito
 * en un fichero fuente.
 *
 * @returns Los parametros de conexion.
 * @throws Si `DATABASE_URL` no es una URL valida con esquema `mysql`.
 */
export function getDatabaseConfig(): DatabaseConfig {
  const url = new URL(requireEnv("DATABASE_URL"));

  if (url.protocol !== "mysql:") {
    throw new Error(
      `DATABASE_URL debe usar el esquema mysql://, no ${url.protocol}`,
    );
  }

  const port = url.port === "" ? 3306 : Number(url.port);
  if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
    throw new Error(`Puerto invalido en DATABASE_URL: ${url.port}`);
  }

  // El nombre de la base de datos es el primer segmento tras la barra.
  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (database.length === 0) {
    throw new Error("DATABASE_URL no indica el nombre de la base de datos.");
  }

  return {
    host: url.hostname,
    port,
    // `decodeURIComponent` deshace el %-encoding: una contrasena con `@` o `:`
    // va codificada en la URL y debe llegar integra al adaptador.
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    connectionLimit: 5,
  };
}
