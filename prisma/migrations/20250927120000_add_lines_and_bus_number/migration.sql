-- CreateTable
CREATE TABLE "lines" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "color" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lines_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "buses" ADD COLUMN     "busNumber" TEXT,
ADD COLUMN     "lineId" INTEGER;

-- AlterTable
ALTER TABLE "routes" ADD COLUMN     "lineId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "lines_name_key" ON "lines"("name");

-- CreateIndex
CREATE UNIQUE INDEX "lines_number_key" ON "lines"("number");

-- CreateIndex
CREATE UNIQUE INDEX "buses_busNumber_key" ON "buses"("busNumber");

-- AddForeignKey
ALTER TABLE "buses" ADD CONSTRAINT "buses_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Update existing buses to have a busNumber based on licensePlate


UPDATE "buses" SET "busNumber" = "licensePlate" WHERE "busNumber" IS NULL;


-- Make busNumber NOT NULL after populating existing records
ALTER TABLE "buses" ALTER COLUMN "busNumber" SET NOT NULL;
