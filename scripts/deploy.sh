#!/bin/bash
# Script de despliegue de Pingo POP
# Ejecutar con: sudo bash ~/proyectos/pingo-pop/scripts/deploy.sh

set -euo pipefail

PROJECT_DIR="/home/brolembservidor/proyectos/pingo-pop"
CADDYFILE="/etc/caddy/Caddyfile"
SYSTEMD_SERVICE="/etc/systemd/system/pingo-pop.service"

echo "=========================================="
echo "  Pingo POP - Script de Despliegue"
echo "=========================================="
echo ""

# --- 1. Verificar que Docker está corriendo ---
echo "[1/8] Verificando Docker..."
if ! systemctl is-active --quiet docker; then
    echo "  Iniciando Docker..."
    sudo systemctl start docker
    sudo systemctl enable docker
fi
echo "  Docker OK"
echo ""

# --- 2. Detener next-server existente (si existe) ---
echo "[2/8] Deteniendo next-server existente..."
if pgrep -f "next-server" > /dev/null; then
    echo "  Deteniendo next-server..."
    pkill -f "next-server" || true
    sleep 2
fi
echo "  OK"
echo ""

# --- 3. Construir imagen de la app ---
echo "[3/8] Construyendo imagen de la app..."
cd "$PROJECT_DIR"
docker compose build app
echo "  Imagen construida"
echo ""

# --- 4. Levantar contenedores ---
echo "[4/8] Levantando contenedores..."
docker compose up -d
echo "  Contenedores levantados"
echo ""

# --- 5. Verificar healthcheck ---
echo "[5/8] Verificando healthcheck..."
sleep 10
if docker compose ps | grep -q "healthy\|running"; then
    echo "  Contenedores saludables"
else
    echo "  WARNING: Contenedores no saludables, revisa logs con: docker compose logs"
fi
echo ""

# --- 6. Aplicar configuración de Caddy ---
echo "[6/8] Aplicando configuración de Caddy..."
if [ -f "$CADDYFILE" ]; then
    # Verificar si ya está configurado
    if grep -q "pingopo.davidamador.dev" "$CADDYFILE"; then
        echo "  Caddyfile ya configurado"
    else
        echo "  Configuración de Caddy pendiente de aplicar manualmente"
    fi
else
    echo "  ERROR: No se encuentra $CADDYFILE"
fi
echo ""

# --- 7. Configurar UFW ---
echo "[7/8] Configurando UFW..."
if command -v ufw &> /dev/null; then
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    sudo ufw allow 22/tcp comment 'SSH'
    sudo ufw allow 80/tcp comment 'HTTP'
    sudo ufw allow 443/tcp comment 'HTTPS'
    sudo ufw --force enable
    echo "  UFW configurado"
else
    echo "  UFW no instalado, saltando..."
fi
echo ""

# --- 8. Crear servicio systemd ---
echo "[8/8] Creando servicio systemd..."
sudo tee "$SYSTEMD_SERVICE" > /dev/null <<EOF
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

sudo systemctl daemon-reload
sudo systemctl enable pingo-pop.service
echo "  Servicio systemd creado y habilitado"
echo ""

echo "=========================================="
echo "  Despliegue completado"
echo "=========================================="
echo ""
echo "Verificación:"
echo "  - docker compose ps"
echo "  - curl -I http://127.0.0.1:3000"
echo "  - curl -I https://pingopo.davidamador.dev"
echo ""
