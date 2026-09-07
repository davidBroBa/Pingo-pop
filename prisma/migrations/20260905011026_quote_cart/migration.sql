/*
  Warnings:

  - You are about to drop the column `productId` on the `quoterequest` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `quoterequest` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `quoterequest` DROP FOREIGN KEY `QuoteRequest_productId_fkey`;

-- DropIndex
DROP INDEX `QuoteRequest_productId_fkey` ON `quoterequest`;

-- AlterTable
ALTER TABLE `quoterequest` DROP COLUMN `productId`,
    DROP COLUMN `quantity`;

-- CreateTable
CREATE TABLE `QuoteRequestItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `productId` INTEGER NOT NULL,
    `quoteRequestId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `QuoteRequestItem` ADD CONSTRAINT `QuoteRequestItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuoteRequestItem` ADD CONSTRAINT `QuoteRequestItem_quoteRequestId_fkey` FOREIGN KEY (`quoteRequestId`) REFERENCES `QuoteRequest`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
