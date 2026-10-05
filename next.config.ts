import type { NextConfig } from "next";

/**
 * Content-Security-Policy.
 *
 * `script-src 'self' 'unsafe-inline'` no es lo que querriamos, pero Next.js
 * inyecta scripts en linea para hidratar los Client Components y las
 * `nonce` exijen middleware, que todavia no hay. Es un compromise
 * documentado: quita 'unsafe-inline' en cuanto exista la capa de nonces.
 *
 * `img-src` incluye `blob:` y `data:` porque las vistas previas de la
 * administracion pueden construirse en el cliente.
 *
 * `unsafe-eval` solo entra en desarrollo: React lo necesita para sus
 * herramientas de depuracion (callstacks entre entornos). En produccion
 * React nunca usa eval() y la directiva queda fuera de la cabecera.
 */
const isDev = process.env.NODE_ENV !== "production";

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "connect-src 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "upgrade-insecure-requests",
].join("; ");

/**
 * Cabeceras de seguridad aplicadas a todas las respuestas.
 *
 * Se Perrin de defensa en profundidad: ninguna depende de que el codigo de la
 * aplicacion este libre de XSS, CSRF o clickjacking.
 */
const securityHeaders = [
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // La tienda no necesita camara, microfono ni geolocalizacion.
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    // Solo tiene efecto sobre HTTPS; en `http://localhost` el navegador lo ignora.
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
