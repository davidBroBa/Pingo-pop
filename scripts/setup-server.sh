#!/bin/bash
# Script de configuración del servidor para Pingo POP
# Ejecutar con: sudo bash ~/proyectos/pingo-pop/scripts/setup-server.sh

set -euo pipefail

PROJECT_DIR="/home/brolembservidor/proyectos/pingo-pop"
CADDYFILE="/etc/caddy/Caddyfile"

echo "=========================================="
echo "  Pingo POP - Configuración del Servidor"
echo "=========================================="
echo ""

# --- 1. Iniciar Docker ---
echo "[1/6] Iniciando Docker..."
systemctl start docker
systemctl enable docker
echo "  Docker OK"
echo ""

# --- 2. Detener next-server existente ---
echo "[2/6] Deteniendo next-server existente..."
pkill -f "next-server" 2>/dev/null || true
sleep 2
echo "  OK"
echo ""

# --- 3. Aplicar configuración de Caddy ---
echo "[3/6] Aplicando configuración de Caddy..."
cat > "$CADDYFILE" <<'EOF'
# Caddyfile for Pingo POP and API
# Caddy maneja HTTPS automático (Let's Encrypt)

pingopo.davidamador.dev {
    reverse_proxy 127.0.0.1:3000

    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
        Permissions-Policy "geolocation=(), microphone=(), camera=()"
        -Server
    }

    log {
        output stdout
        format json
    }
}

api.davidamador.dev {
    reverse_proxy 127.0.0.1:8000

    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
        Permissions-Policy "geolocation=(), microphone=(), camera=()"
        Access-Control-Allow-Origin "https://davidamador.dev"
        Access-Control-Allow-Methods "POST, OPTIONS"
        Access-Control-Allow-Headers "Content-Type, Authorization"
        Access-Control-Max-Age "600"
        -Server
    }

    log {
        output stdout
        format json
    }
}
EOF
systemctl reload caddy
echo "  Caddy configurado y recargado"
echo ""

# --- 4. Configurar UFW ---
echo "[4/6] Configurando UFW..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable
echo "  UFW configurado"
echo ""

# --- 5. Crear servicio systemd ---
echo "[5/6] Creando servicio systemd..."
cat > /etc/systemd/system/pingo-pop.service <<EOF
[Unit]
Description=Pingo POP - Next.js App
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$PROJECT_DIR
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable pingo-pop.service
echo "  Servicio systemd creado y habilitado"
echo ""

# --- 6. Construir y levantar contenedores ---
echo "[6/6] Construyendo y levantando contenedores..."
cd "$PROJECT_DIR"
docker compose build
docker compose up -d
echo "  Contenedores levantados"
echo ""

echo "=========================================="
echo "  Configuración completada"
echo "=========================================="
echo ""
echo "Verificación:"
echo "  docker compose ps"
echo "  curl -I http://127.0.0.1:3000"
echo "  curl -I https://pingopo.davidamador.dev"
echo ""
