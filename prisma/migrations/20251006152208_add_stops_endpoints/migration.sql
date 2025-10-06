-- AlterTable
ALTER TABLE "public"."route_points" ADD COLUMN     "stopId" INTEGER;

-- CreateTable
CREATE TABLE "public"."stops" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "zone" TEXT,
    "services" JSONB,
    "photo" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_StopLines" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_StopLines_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_StopLines_B_index" ON "public"."_StopLines"("B");

-- AddForeignKey
ALTER TABLE "public"."route_points" ADD CONSTRAINT "route_points_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "public"."stops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_StopLines" ADD CONSTRAINT "_StopLines_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_StopLines" ADD CONSTRAINT "_StopLines_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."stops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
