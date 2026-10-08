#!/bin/bash
# Script de configuración del servidor para Pingo POP (Node.js directo)
# Ejecutar con: sudo bash ~/proyectos/pingo-pop/scripts/setup-node.sh

set -euo pipefail

PROJECT_DIR="/home/brolembservidor/proyectos/pingo-pop"
CADDYFILE="/etc/caddy/Caddyfile"
SYSTEMD_SERVICE="/etc/systemd/system/pingo-pop.service"

echo "=========================================="
echo "  Pingo POP - Configuración (Node.js directo)"
echo "=========================================="
echo ""

# --- 1. Instalar MariaDB si no está ---
echo "[1/6] Verificando MariaDB..."
if ! command -v mariadb &> /dev/null; then
    echo "  Instalando MariaDB..."
    apt-get update
    apt-get install -y mariadb-server
    systemctl start mariadb
    systemctl enable mariadb
    echo "  MariaDB instalado"
else
    echo "  MariaDB ya instalado"
fi
echo ""

# --- 2. Configurar MariaDB ---
echo "[2/6] Configurando MariaDB..."
# Crear base de datos y usuario si no existen
mariadb -e "CREATE DATABASE IF NOT EXISTS pingo_pop CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null || true
mariadb -e "CREATE USER IF NOT EXISTS 'pingo'@'localhost' IDENTIFIED BY '$(grep DB_PASSWORD $PROJECT_DIR/.env | cut -d'"' -f2)';" 2>/dev/null || true
mariadb -e "GRANT ALL PRIVILEGES ON pingo_pop.* TO 'pingo'@'localhost';" 2>/dev/null || true
mariadb -e "FLUSH PRIVILEGES;" 2>/dev/null || true
echo "  MariaDB configurado"
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
cat > "$SYSTEMD_SERVICE" <<EOF
[Unit]
Description=Pingo POP - Next.js App
After=network.target mariadb.service

[Service]
Type=simple
User=brolembservidor
WorkingDirectory=$PROJECT_DIR
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=DATABASE_URL=$(grep DATABASE_URL $PROJECT_DIR/.env | cut -d'"' -f2)
Environment=SESSION_SECRET=$(grep SESSION_SECRET $PROJECT_DIR/.env | cut -d'"' -f2)
Environment=SITE_URL=https://pingopo.davidamador.dev
ExecStart=/usr/bin/node $PROJECT_DIR/node_modules/.bin/next start -p 3000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable pingo-pop.service
echo "  Servicio systemd creado y habilitado"
echo ""

# --- 6. Detener next-server existente y arrancar servicio ---
echo "[6/6] Arrancando servicio..."
pkill -f "next-server" 2>/dev/null || true
sleep 2
systemctl start pingo-pop.service
echo "  Servicio arrancado"
echo ""

echo "=========================================="
echo "  Configuración completada"
echo "=========================================="
echo ""
echo "Verificación:"
echo "  systemctl status pingo-pop"
echo "  curl -I http://127.0.0.1:3000"
echo "  curl -I https://pingopo.davidamador.dev"
echo ""
