-- CreateEnum
CREATE TYPE "public"."TicketType" AS ENUM ('SINGLE_USE', 'DAILY_PASS', 'WEEKLY_PASS', 'MONTHLY_PASS', 'ANNUAL_PASS');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."TicketStatus" ADD VALUE 'ACTIVE';
ALTER TYPE "public"."TicketStatus" ADD VALUE 'SUSPENDED';

-- DropForeignKey
ALTER TABLE "public"."payments" DROP CONSTRAINT "payments_ticketId_fkey";

-- DropForeignKey
ALTER TABLE "public"."tickets" DROP CONSTRAINT "tickets_tripId_fkey";

-- AlterTable
ALTER TABLE "public"."payments" ALTER COLUMN "ticketId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."tickets" ADD COLUMN     "currentUsages" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isReusable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxUsages" INTEGER,
ADD COLUMN     "ticketType" "public"."TicketType" NOT NULL DEFAULT 'SINGLE_USE',
ADD COLUMN     "validFrom" TIMESTAMP(3),
ALTER COLUMN "tripId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "public"."ticket_usages" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "tripId" INTEGER,
    "busId" TEXT,
    "validatorId" TEXT,
    "routeId" INTEGER,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "ticket_usages_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."tickets" ADD CONSTRAINT "tickets_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "public"."trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ticket_usages" ADD CONSTRAINT "ticket_usages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ticket_usages" ADD CONSTRAINT "ticket_usages_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "public"."trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ticket_usages" ADD CONSTRAINT "ticket_usages_busId_fkey" FOREIGN KEY ("busId") REFERENCES "public"."buses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ticket_usages" ADD CONSTRAINT "ticket_usages_validatorId_fkey" FOREIGN KEY ("validatorId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ticket_usages" ADD CONSTRAINT "ticket_usages_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "public"."routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
