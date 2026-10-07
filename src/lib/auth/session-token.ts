/**
 * Firmas y verificacion de tokens de sesion (HMAC-SHA256).
 *
 * Usa Web Crypto para que el mismo codigo funcione tanto en el runtime Edge
 * (middleware) como en el runtime Node (route handlers, server components).
 * Un token es `base64url(payload).base64url(hmac)`; el payload lleva `exp`.
 */

const encoder = new TextEncoder();

export type SessionPayload = {
  /** Id del usuario en la base de datos. */
  userId: number;
  /** Rol con el que se emitio la sesion. */
  role: "BUYER" | "ADMIN";
  /** Version de sesion del usuario al emitirla. */
  sv: number;
  /**
   * `1` si la cuenta sigue con la **contrasena temporal** que le puso un
   * administrador y todavia no la ha cambiado (spec 007, D21).
   *
   * Viaja **dentro del token firmado**, no en una cookie aparte, y por eso el
   * `proxy` puede fiarse de el sin consultar la base de datos: el `proxy` corre en
   * **Edge** y no tiene Prisma. Si alguien edita el valor a mano, la firma ya no
   * cuadra y el token se rechaza; hay un test que lo comprueba.
   *
   * La **verdad** sigue estando en la base de datos: `getSessionUser()` relee
   * `debeCambiarContrasena` y pisa este valor, igual que hace con el rol. La cookie
   * da la decision rapida del `proxy`; la base de datos manda.
   *
   * Un `swc` ausente se interpreta como `0`, igual que `sv`, para que un
   * despliegue no expulse a las cookies ya emitidas.
   */
  swc: number;
  /** Instante de emision, en milisegundos epoch. */
  iat: number;
  /** Instante de expiracion, en milisegundos epoch. */
  exp: number;
};

/**
 * Decide si una sesion sigue vigente frente a la version guardada en la base de datos.
 *
 * Es **pura a proposito**: la revocacion necesita la BD, pero la decision de si una
 * sesion continua vigente no. Separarlas permite comprobar la matriz entera con
 * `node:test`, sin base de datos ni navegador.
 *
 * Cuando se cambia la contrasena se incrementa `sessionVersion` del usuario, con lo
 * que toda cookie emitida antes queda en una version anterior y deja de valer. Asi
 * el cambio de contrasena cierra tambien las demas sesiones abiertas.
 *
 * @param sessionVersion - Version que viajaba en la cookie.
 * @param userVersion - `sessionVersion` actual del usuario en la base de datos.
 * @returns `true` solo si coinciden exactamente.
 */
export function isSessionCurrent(
  sessionVersion: number,
  userVersion: number,
): boolean {
  // Una version negativa o no entera no puede ser real: se rechaza en vez de
  // confiar. `verifySession` ya lo filtra, pero esta es la ultima linea de defensa.
  if (
    !Number.isInteger(sessionVersion) ||
    !Number.isInteger(userVersion) ||
    sessionVersion < 0 ||
    userVersion < 0
  ) {
    return false;
  }

  return sessionVersion === userVersion;
}

/**
 * Devuelve la clave de firma desde el entorno.
 *
 * Lanza si no esta definida: sin secreto la sesion seria falsificable, y es
 * preferible fallar en el arranque a levantar el servidor con auth rota.
 */
function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret === undefined || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET debe estar definido y tener al menos 32 caracteres",
    );
  }
  return secret;
}

/** Convierte texto a base64url sin depender de Buffer (compatible con Edge). */
function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  const base64 =
    typeof btoa === "function" ? btoa(binary) : Buffer.from(binary, "binary").toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Revierte {@link toBase64Url}.
 *
 * @throws Si la entrada no es base64 valido. Se propaga a proposito: quien
 *   llama decide, y un token corrupto se trata como token invalido en lugar de
 *   dejar que la excepcion suba hasta el middleware.
 */
function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  if (typeof atob === "function") {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  return new Uint8Array(Buffer.from(padded, "base64"));
}

/** Importa la clave de firma desde el secreto del entorno. */
async function importKey(): Promise<CryptoKey> {
  const raw = encoder.encode(getSecret());
  return crypto.subtle.importKey(
    "raw",
    raw as unknown as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/**
 * Serializa el payload y lo firma, produciendo el valor de la cookie.
 *
 * @param payload - Datos de sesion a firmar; su `exp` es la fecha de expiracion.
 * @returns Token con formato `base64url(payload).base64url(hmac)`.
 */
export async function signSession(payload: SessionPayload): Promise<string> {
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const key = await importKey();
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body) as unknown as ArrayBuffer);
  return `${body}.${toBase64Url(new Uint8Array(signature))}`;
}

/**
 * Verifica firma y expiracion de un token de sesion.
 *
 * @param token - Valor de la cookie a validar.
 * @returns El payload si el token es autentico y vigente; `null` en cualquier
 *   otro caso (token mal formado, firma invalida o expirado).
 */
export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (token === undefined || token === "") {
    return null;
  }
  const separator = token.lastIndexOf(".");
  if (separator <= 0) {
    return null;
  }
  const body = token.slice(0, separator);
  const provided = token.slice(separator + 1);

  let expected: Uint8Array;
  try {
    const key = await importKey();
    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(body) as unknown as ArrayBuffer,
    );
    expected = new Uint8Array(signature);
  } catch {
    return null;
  }

  // Compara en tiempo constante para no filtrar informacion por temporizacion.
  // Una firma mal formada se trata como firma incorrecta: una cookie corrupta
  // debe producir un 401 limpio, nunca una excepcion en el middleware.
  let actual: Uint8Array;
  try {
    actual = fromBase64Url(provided);
  } catch {
    return null;
  }
  if (actual.length !== expected.length) {
    return null;
  }
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= (actual[i] ?? 0) ^ (expected[i] ?? 0);
  }
  if (diff !== 0) {
    return null;
  }

  let payload: unknown;
  try {
    payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body)));
  } catch {
    return null;
  }
  if (typeof payload !== "object" || payload === null) {
    return null;
  }
  const candidate = payload as Partial<SessionPayload>;
  if (typeof candidate.userId !== "number" || !Number.isInteger(candidate.userId)) {
    return null;
  }
  if (candidate.role !== "BUYER" && candidate.role !== "ADMIN") {
    return null;
  }
  if (typeof candidate.exp !== "number" || candidate.exp <= Date.now()) {
    return null;
  }
  // `sv` ausente se trata como version 0 a proposito: las cookies emitidas antes de
  // que existiera esta columna no deben expulsar a nadie en el despliegue. Un `sv`
  // presente pero no entero (un ataque con firma ajena o un dato corrupto) si se
  // rechaza: no hay ningun caso legitimo en el que ocurra.
  let sv: number;
  if (candidate.sv === undefined) {
    sv = 0;
  } else if (
    typeof candidate.sv !== "number" ||
    !Number.isInteger(candidate.sv) ||
    candidate.sv < 0
  ) {
    return null;
  } else {
    sv = candidate.sv;
  }

  // `swc` se valida **igual que `sv` y por el mismo motivo**: ausente vale 0
  // (despliegue), presente pero no entero o negativo se rechaza (corrupto o
  // manipulado). Copiar el patron en vez de inventar otro deja las dos reglas
  // Parecidas, que es lo que hace que se entiendan juntas.
  let swc: number;
  if (candidate.swc === undefined) {
    swc = 0;
  } else if (
    typeof candidate.swc !== "number" ||
    !Number.isInteger(candidate.swc) ||
    candidate.swc < 0
  ) {
    return null;
  } else {
    swc = candidate.swc;
  }

  return {
    userId: candidate.userId,
    role: candidate.role,
    sv,
    swc,
    iat: typeof candidate.iat === "number" ? candidate.iat : 0,
    exp: candidate.exp,
  };
}

/** Duracion de la sesion: 8 horas. */
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

/** Opciones de la cookie de sesion, centralizadas para que todo el app las respete. */
export const SESSION_COOKIE = {
  name: "pp_session",
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  httpOnly: true,
  path: "/",
} as const;

/**
 * Crea el payload de sesion para un usuario, con expiracion relativa.
 *
 * @param userId - Id del usuario autenticado.
 * @param role - Rol efectivo del usuario.
 * @param sessionVersion - `sessionVersion` del usuario, para poder revocar todas sus
 *   sesiones al cambiar la contrasena. Obligatorio a proposito: omitirlo en algun
 *   sitio emitiria una sesion que no se podria revocar nunca.
 * @param swc - `1` si la cuenta sigue con la contrasena temporal (spec 007, D21).
 *   **Obligatorio, sin valor por defecto**, y esa es la parte importante: con un
 *   `swc = 0` por defecto, un sitio que se olvidara de pasarlo emitiria sesiones
 *   sin limite en silencio, y ni el compilador ni un test lo dirian. Obligatorio,
 *   el compilador obliga a cada llamador a decidir cual de los dos es.
 * @returns Payload listo para firmar.
 */
export function buildSessionPayload(
  userId: number,
  role: "BUYER" | "ADMIN",
  sessionVersion: number,
  swc: number,
): SessionPayload {
  const now = Date.now();
  return {
    userId,
    role,
    sv: sessionVersion,
    swc,
    iat: now,
    exp: now + SESSION_TTL_MS,
  };
}