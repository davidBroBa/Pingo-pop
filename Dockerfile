# Dockerfile para Pingo POP - Next.js 16 + MariaDB
#
# Build multi-stage: instala dependencias, compila la app y crea una imagen
# de producción ligera.

# --- Stage 1: Dependencias -------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app

# Copiar solo los archivos de dependencias para aprovechar la caché
COPY package.json package-lock.json ./
RUN npm ci

# --- Stage 2: Builder ------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app

# Copiar proyecto primero, luego node_modules (para no sobrescribir)
COPY . .
COPY --from=deps /app/node_modules ./node_modules

# Variables de entorno necesarias para el build
# (los valores reales se pasan en runtime, pero Next.js necesita que existan)
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build de producción
RUN npm run build

# --- Stage 3: Runner -------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Crear usuario no-root
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Copiar archivos necesarios del builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

USER nextjs

EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/ || exit 1

CMD ["npx", "next", "start", "-p", "3000"]
