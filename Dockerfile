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

# Uploads escribibles por la app (spec 011, RF-5). Sin este chown la primera
# escritura da EACCES: `public/uploads` llega root:root del COPY y la app corre
# como nextjs (uid 1001). El volumen de docker-compose montado sobre
# `public/uploads` hereda este owner la primera vez que se crea.
#
# Se borran los `.gitkeep` (RF-3): son de git, no de produccion. Si llegan a la
# imagen, Next los registra como estaticos al arrancar y responde 500 al
# pedirlos; sin ellos, la peticion cae en el route handler de `/uploads` que ya
# valida la extension.
RUN find /app/public/uploads -name '.gitkeep' -delete \
    && mkdir -p /app/public/uploads/products /app/public/uploads/site \
    && chown -R nextjs:nodejs /app/public/uploads

USER nextjs

EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/ || exit 1

CMD ["npx", "next", "start", "-p", "3000"]
