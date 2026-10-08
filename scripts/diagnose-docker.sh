#!/bin/bash
# Script de diagnóstico de Docker
# Ejecutar: bash ~/proyectos/pingo-pop/scripts/diagnose-docker.sh

echo "=========================================="
echo "  Diagnóstico de Docker"
echo "=========================================="
echo ""

echo "[1] Estado del servicio:"
systemctl status docker --no-pager -l
echo ""

echo "[2] Logs de Docker (últimas 50 líneas):"
journalctl -u docker --no-pager -n 50
echo ""

echo "[3] Configuración de override:"
cat /etc/systemd/system/docker.service.d/override.conf 2>/dev/null || echo "No hay override.conf"
echo ""

echo "[4] Propiedades del servicio:"
systemctl show docker
echo ""

echo "[5] Socket de Docker:"
ls -la /var/run/docker.sock 2>/dev/null || echo "Socket no existe"
echo ""

echo "[6] Módulos del kernel:"
lsmod | grep -E 'overlay|br_netfilter' || echo "Módulos no cargados"
echo ""

echo "[7] Versión de Docker:"
docker --version 2>/dev/null || echo "Docker no disponible"
echo ""

echo "[8] Información de Docker:"
docker info 2>&1 | head -30
echo ""

echo "[9] Contenedores existentes:"
docker ps -a 2>/dev/null || echo "No se pueden listar contenedores"
echo ""

echo "[10] Redes de Docker:"
docker network ls 2>/dev/null || echo "No se pueden listar redes"
echo ""

echo "=========================================="
echo "  Diagnóstico completado"
echo "=========================================="
