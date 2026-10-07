-- AlterTable
ALTER TABLE `User` ADD COLUMN `activo` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `debeCambiarContrasena` BOOLEAN NOT NULL DEFAULT false;
