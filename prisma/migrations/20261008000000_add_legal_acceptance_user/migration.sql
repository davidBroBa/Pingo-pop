-- AlterTable
ALTER TABLE `LegalAcceptance` ADD COLUMN `userId` INTEGER NULL;

-- CreateIndex
CREATE INDEX `LegalAcceptance_userId_idx` ON `LegalAcceptance`(`userId`);

-- AddForeignKey
ALTER TABLE `LegalAcceptance` ADD CONSTRAINT `LegalAcceptance_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;