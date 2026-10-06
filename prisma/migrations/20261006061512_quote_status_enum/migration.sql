-- AlterTable
ALTER TABLE `QuoteRequest` ADD COLUMN `idempotencyKey` VARCHAR(191) NULL,
    MODIFY `status` ENUM('PENDING', 'QUOTED', 'ACCEPTED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE UNIQUE INDEX `QuoteRequest_idempotencyKey_key` ON `QuoteRequest`(`idempotencyKey`);