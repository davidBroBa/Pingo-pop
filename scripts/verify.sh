#!/bin/bash
# Script de verificación post-despliegue de Pingo POP
# Ejecutar: bash ~/proyectos/pingo-pop/scripts/verify.sh

set -euo pipefail

PROJECT_DIR="/home/brolembservidor/proyectos/pingo-pop"

echo "=========================================="
echo "  Pingo POP - Verificación Post-Despliegue"
echo "=========================================="
echo ""

# --- 1. Contenedores Docker ---
echo "[1/7] Contenedores Docker:"
docker compose -f "$PROJECT_DIR/docker-compose.yml" ps
echo ""

# --- 2. Healthcheck de la app ---
echo "[2/7] Healthcheck de la app:"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/ 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    echo "  ✅ App responde 200 OK"
else
    echo "  ❌ App responde $HTTP_CODE (esperado 200)"
fi
echo ""

# --- 3. API de productos ---
echo "[3/7] API de productos:"
API_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/products 2>/dev/null || echo "000")
if [ "$API_CODE" = "200" ]; then
    echo "  ✅ API responde 200 OK"
else
    echo "  ❌ API responde $API_CODE (esperado 200)"
fi
echo ""

# --- 4. Base de datos ---
echo "[4/7] Base de datos:"
cd "$PROJECT_DIR"
if npx prisma migrate status 2>&1 | grep -q "up to date"; then
    echo "  ✅ Migraciones al día"
else
    echo "  ⚠️  Migraciones pendientes o error"
fi
echo ""

# --- 5. Caddy ---
echo "[5/7] Caddy:"
if systemctl is-active --quiet caddy; then
    echo "  ✅ Caddy activo"
else
    echo "  ❌ Caddy no activo"
fi
echo ""

# --- 6. UFW ---
echo "[6/7] UFW:"
if command -v ufw &> /dev/null; then
    ufw status | head -10
else
    echo "  ⚠️  UFW no instalado"
fi
echo ""

# --- 7. Servicio systemd ---
echo "[7/7] Servicio systemd:"
if systemctl is-enabled --quiet pingo-pop.service 2>/dev/null; then
    echo "  ✅ Servicio pingo-pop habilitado"
else
    echo "  ❌ Servicio pingo-pop no habilitado"
fi
echo ""

echo "=========================================="
echo "  Verificación completada"
echo "=========================================="
echo ""
echo "URLs a verificar:"
echo "  - http://127.0.0.1:3000 (app local)"
echo "  - https://pingopo.davidamador.dev (pública, requiere DNS)"
echo ""
