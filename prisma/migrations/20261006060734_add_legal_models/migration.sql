-- CreateTable
CREATE TABLE `LegalData` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `razonSocial` VARCHAR(191) NULL,
    `rfc` VARCHAR(191) NULL,
    `domicilioFiscal` TEXT NULL,
    `correoContacto` VARCHAR(191) NULL,
    `telefono` VARCHAR(191) NULL,
    `responsablePrivacidad` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LegalAcceptance` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tipo` ENUM('TERMINOS', 'PRIVACIDAD', 'COOKIES') NOT NULL,
    `version` VARCHAR(191) NOT NULL,
    `aceptadoAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `quoteRequestId` INTEGER NULL,

    INDEX `LegalAcceptance_tipo_version_idx`(`tipo`, `version`),
    INDEX `LegalAcceptance_quoteRequestId_idx`(`quoteRequestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `LegalAcceptance` ADD CONSTRAINT `LegalAcceptance_quoteRequestId_fkey` FOREIGN KEY (`quoteRequestId`) REFERENCES `QuoteRequest`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
