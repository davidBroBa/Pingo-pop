# Spec: Pingo POP Rework (Roles, Auth hasheada, Upload de imagenes, Rework visual)

## Objetivo
Aplicar rework manteniendo colores existentes, agregar sistema de roles (BUYER/ADMIN) con contrasenas hasheadas, permitir al admin subir imagenes al dar alta productos, y actualizar UI con estilo mas moderno coherente.

## Requisitos (EARS)
- WHEN usuario no autenticado intenta acceder a /admin/* THEN debe redirigir a /login (o 401 para API)
- WHEN usuario con rol BUYER intenta acceder a rutas/admin o APIs admin THEN responder 403
- WHEN se registra usuario THEN debe tener rol BUYER por defecto y password hasheado (argon2/bcrypt)
- IF no existe admin THEN permitir crear admin inicial via script/config seguro (no hardcodear en codigo)
- WHEN admin crea/edita producto con imagen THEN debe validar MIME+magic bytes, tamano max 5MB, whitelist extensiones, nombre aleatorio, sin path traversal
- WHEN imagen valida THEN guardar en public/uploads/products/ (o equivalente) y guardar ruta relativa en DB
- WHEN se muestra preview THEN mostrar solo imagenes servidas por app (rutas controladas)
- WHEN se guarda producto THEN no aceptar any, validar con esquema (Zod)
- WHILE se mantiene identidad THEN colores existentes deben conservarse exactamente (no reemplazar por otros)
- WHEN se renderiza UI THEN componentes accesibles y consistentes con tokens
