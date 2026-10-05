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
  /** Instante de emision, en milisegundos epoch. */
  iat: number;
  /** Instante de expiracion, en milisegundos epoch. */
  exp: number;
};

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
  return {
    userId: candidate.userId,
    role: candidate.role,
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
 * @returns Payload listo para firmar.
 */
export function buildSessionPayload(
  userId: number,
  role: "BUYER" | "ADMIN",
): SessionPayload {
  const now = Date.now();
  return { userId, role, iat: now, exp: now + SESSION_TTL_MS };
}