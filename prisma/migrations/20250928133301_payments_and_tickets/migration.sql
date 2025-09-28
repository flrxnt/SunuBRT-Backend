/*
  Warnings:

  - You are about to drop the column `paydunyaReference` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `paydunyaToken` on the `payments` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[externalToken]` on the table `payments` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."payments_paydunyaToken_key";

-- AlterTable
ALTER TABLE "public"."payments" DROP COLUMN "paydunyaReference",
DROP COLUMN "paydunyaToken",
ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "customData" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "customerEmail" TEXT,
ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "customerPhone" TEXT,
ADD COLUMN     "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "externalData" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "externalReference" TEXT,
ADD COLUMN     "externalToken" TEXT,
ADD COLUMN     "fees" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "netAmount" DOUBLE PRECISION,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "originalAmount" DOUBLE PRECISION,
ADD COLUMN     "promoCode" TEXT,
ADD COLUMN     "provider" TEXT NOT NULL DEFAULT 'PAYDUNYA',
ADD COLUMN     "transactionReference" TEXT,
ALTER COLUMN "currency" SET DEFAULT 'XOF';

-- AlterTable
ALTER TABLE "public"."tickets" ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "passengers" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "pricingId" INTEGER,
ADD COLUMN     "validationLocation" TEXT,
ADD COLUMN     "validationNotes" TEXT;

-- CreateTable
CREATE TABLE "public"."ticket_pricing" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "validityDuration" INTEGER NOT NULL,
    "validityPeriodType" TEXT NOT NULL,
    "lineId" INTEGER,
    "routeId" INTEGER,
    "description" TEXT,
    "discountPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxTickets" INTEGER,
    "specialConditions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."refunds" (
    "id" SERIAL NOT NULL,
    "paymentId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "adminNotes" TEXT,
    "adminUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."promo_codes" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "value" DOUBLE PRECISION NOT NULL,
    "isPercentage" BOOLEAN NOT NULL DEFAULT false,
    "maxUses" INTEGER,
    "currentUses" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "promo_codes_code_key" ON "public"."promo_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "payments_externalToken_key" ON "public"."payments"("externalToken");

-- AddForeignKey
ALTER TABLE "public"."tickets" ADD CONSTRAINT "tickets_pricingId_fkey" FOREIGN KEY ("pricingId") REFERENCES "public"."ticket_pricing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ticket_pricing" ADD CONSTRAINT "ticket_pricing_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "public"."lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ticket_pricing" ADD CONSTRAINT "ticket_pricing_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "public"."routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."refunds" ADD CONSTRAINT "refunds_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "public"."payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."refunds" ADD CONSTRAINT "refunds_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
