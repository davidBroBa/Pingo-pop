/**
 * Limitador de peticiones en memoria, por clave y ventana temporal.
 *
 * Suficiente para un despliegue de un solo proceso (un contenedor, un host). Si
 * el servicio escala horizontalmente el limite deja de ser global: en ese caso
 * hay que mover el contador a Redis o a la base de datos. No se presenta como
 * una garantia distribuida.
 */

/** Ventana por defecto: 15 minutos. */
const WINDOW_MS = 15 * 60 * 1000;

/** Maximo de peticiones por clave dentro de la ventana. */
const DEFAULT_MAX = 10;

/** Numero maximo de claves vigiladas antes de purgar las caducadas. */
const MAX_TRACKED_KEYS = 10_000;

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Elimina las entradas cuya ventana ya paso. */
function purgeExpired(now: number): void {
  if (buckets.size <= MAX_TRACKED_KEYS) {
    return;
  }
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

/**
 * Registra un intento y dice si debe rechazarse.
 *
 * @param key - Identificador del cliente (por ejemplo su IP).
 * @param max - Maximo de intentos permitidos en la ventana.
 * @param windowMs - Duracion de la ventana en milisegundos.
 * @returns `true` si el intento se permite, `false` si se agoto el cupo.
 */
export function consume(key: string, max = DEFAULT_MAX, windowMs = WINDOW_MS): boolean {
  const now = Date.now();
  purgeExpired(now);

  const bucket = buckets.get(key);
  if (bucket === undefined || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= max) {
    return false;
  }
  bucket.count += 1;
  return true;
}

/**
 * Devuelve los segundos restantes hasta que la cuota se libere.
 *
 * @param key - Identificador del cliente.
 * @returns Segundos que faltan para la siguiente ventana; 0 si no hay cuota activa.
 */
export function retryAfterSeconds(key: string): number {
  const bucket = buckets.get(key);
  if (bucket === undefined) {
    return 0;
  }
  return Math.max(0, Math.ceil((bucket.resetAt - Date.now()) / 1000));
}

/**
 * Extrae la IP del cliente de las cabeceras de la peticion.
 *
 * `x-forwarded-for` la fija el proxy que hay delante; si no hay proxy (desarrollo
 * local) cae a `127.0.0.1`, lo que agrupa a todos los clientes en una sola
 * cuota. Es un trade-off explicito: preferimos agrupar antes que permitir
 * saltarse el limite manipulando una cabecera.
 */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded !== null && forwarded.length > 0) {
    const first = forwarded.split(",")[0];
    if (first !== undefined && first.trim().length > 0) {
      return first.trim();
    }
  }
  return headers.get("x-real-ip") ?? "127.0.0.1";
}