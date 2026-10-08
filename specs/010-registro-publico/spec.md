# Spec: Pingo POP - Registro público de clientes (010-registro-publico)

> **Estado:** `implementada` (2026-10-08, aprobada y cerrada por el usuario)
> **Fecha:** 2026-10-07
> **Constitución:** [`../../constitution.md`](../../constitution.md) · **SDD:** [`../../docs/SDD.md`](../../docs/SDD.md)
> Specs base: `006-user-profile` (sesiones, contraseña), `007-crear-usuarios`
> (cuentas, roles, D21/D22/D24), `009-legal-compliance-privacy` (auditoría de
> consentimientos RF-19/RF-20, política de mínimo de datos D14)

> **Decisiones del usuario (2026-10-07):**
> - **D25:** registro **inmediato**, sin verificación por email (el proyecto no
>   tiene infraestructura de correo).
> - **D26:** el formulario exige aceptar **Términos y Privacidad** (casillas).
> - **D27:** tras registrarse se abre **sesión automática** (misma cookie firmada de sesión).
> - **D28 (confirmada 2026-10-08):** la aceptación legal se **guarda en base de
>   datos** con `LegalAcceptance` ligado al usuario. Requirió añadir la columna
>   `userId Int?` (`SetNull`) al modelo de la spec 009 —migración
>   `20261008000000_add_legal_acceptance_user`—, decisión del usuario tomada
>   explícitamente el 2026-10-08. No se recoge fecha de nacimiento (mínimo de
>   datos). La mayoría de edad se declara en los Términos aceptados. Se registran
>   únicamente `TERMINOS` y `PRIVACIDAD` (versión vigente en el momento del
>   registro).

## 1. Contexto y objetivo

Hoy un cliente no tiene forma de crearse una cuenta en la tienda: `/login` solo ofrece entrada y el README declara como límite conocido "No existe registro de BUYER: solo el seed y scripts crean ese rol". Solo un administrador puede crear cuentas desde `/admin/usuarios` (spec 007).

Objetivo: **registro público de clientes con rol `BUYER`**, con aceptación legal obligatoria, protección contra abuso (rate limit), sin verificación de email (D25). Los **administradores NO se crean por registro público**: solo desde `/admin/usuarios`. El **primer administrador debe venir precargado en `prisma/seed.ts`**.

## 2. Usuarios / actores

| Actor | Qué necesita |
|---|---|
| Visitante sin cuenta | Crear cuenta `BUYER` desde la web (`/registro`) |
| Administrador | Que el registro nunca genere cuentas con rol `ADMIN`; crear admins exclusivamente desde panel |

## 3. Requisitos funcionales

- **RF-1.** En `/login` aparece enlace "Crear cuenta" que lleva a `/registro`.
- **RF-2.** `/registro` valida email, nombre (opcional), contraseña (política BUYER: mínimo 8, máximo 200 caracteres; sin complejidad obligatoria), y exige marcar **ambas** casillas (Términos y Privacidad).
- **RF-3.** Al enviar válido, el sistema crea usuario con **rol `BUYER`** exclusivamente, guarda `LegalAcceptance` (TERMINOS y PRIVACIDAD, versión vigente) ligado al usuario, abre **sesión automática** (D27) y responde **201** con `{ ok: true, role: 'BUYER' }`.
- **RF-4.** Si email ya existe → **409** "El correo ya está registrado." (sin enumeración innecesaria más allá de duplicidad).
- **RF-5.** Errores de validación → **400** con campos y mensajes.
- **RF-6.** `/api/auth/register` aplica **rate limit** por IP (clave de cliente) con política razonable (no bloquear panel/admin). Mismo patrón que login.
- **RF-7.** Si BD no disponible → **503** con `Retry-After: 30`, sin revelar si email existe.
- **RF-8.** Tras registro exitoso, redirige a `/perfil` o `/` (UI). Sesión establecida con cookie firmada igual que login (HttpOnly, Secure, SameSite, TTL).
- **RF-9.** Visitante autenticado que accede a `/registro` → redirige a `/`.
- **RF-10.** Nunca devuelve `passwordHash`. Salidas limpias.
- **RF-11.** Política BUYER reutilizada de `account-schema.ts` (`meetsPasswordPolicy` para `BUYER`).
- **RF-12.** Normaliza email (`trim().toLowerCase()`), nombre (`trim()`), rechaza caracteres de control.
- **RF-13.** Seed: **mantiene o asegura** un administrador precargado (primer admin). No se elimina al ejecutar seed.

## 4. Requisitos no funcionales

| Tipo | Requisito |
|---|---|
| Seguridad | Zod en borde, argon2id (`hashPassword`), sin exponer hash, defensa en profundidad (ruta + validación). |
| UX/Accesibilidad | Labels asociados (for/id), errores con `role="alert"`, botón deshabilitado con estado "Creando cuenta...", foco visible (`cartoon-focus`). |
| Privacidad | Mínimo de datos (D14). Solo lo necesario para registro BUYER. |

## 5. Criterios de aceptación

- [x] `/login` muestra enlace "Crear cuenta" → `/registro`. Verificación: `npm run lint` (0 problemas) + QA navegador.
- [x] `/registro` renderiza formulario con aceptación obligatoria Términos+Privacidad. Verificación: build `ƒ /registro` + QA navegador.
- [x] POST `/api/auth/register` crea BUYER + 2 LegalAcceptance (TERMINOS/PRIVACIDAD) ligados a usuario (`userId`); devuelve 201 + sesión. Verificación: `npm run check` EXIT:0 + QA curl (201 y cookie).
- [ ] Email duplicado → 409.
- [ ] Casillas sin marcar → 400 con mensaje claro.
- [ ] Rate limit activo (429 tras superar umbral).
- [ ] Seed garantiza primer admin existe.
- [ ] Tests cubren casos felices y límites.

## 6. Fuera de alcance

- Verificación por email (D25)
- Recuperación de contraseña
- OAuth/social
- Registro de ADMIN (solo panel)
