-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('USER', 'DRIVER', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."TicketStatus" AS ENUM ('PENDING', 'PAID', 'USED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."TripStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "role" "public"."Role" NOT NULL DEFAULT 'USER',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."buses" (
    "id" TEXT NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "model" TEXT,
    "year" INTEGER,
    "driverId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "passengersCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."positions" (
    "id" SERIAL NOT NULL,
    "busId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "altitude" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."routes" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "startPointId" INTEGER,
    "endPointId" INTEGER,
    "distance" DOUBLE PRECISION,
    "duration" INTEGER,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."route_points" (
    "id" SERIAL NOT NULL,
    "routeId" INTEGER NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "elevation" DOUBLE PRECISION,
    "seq" INTEGER NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "route_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."trips" (
    "id" SERIAL NOT NULL,
    "routeId" INTEGER NOT NULL,
    "busId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "price" DOUBLE PRECISION NOT NULL,
    "availableSeats" INTEGER NOT NULL,
    "status" "public"."TripStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tickets" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "tripId" INTEGER NOT NULL,
    "seatNumber" TEXT,
    "qrCode" TEXT NOT NULL,
    "status" "public"."TicketStatus" NOT NULL DEFAULT 'PENDING',
    "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payments" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'FCFA',
    "paydunyaToken" TEXT,
    "paydunyaReference" TEXT,
    "status" "public"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "public"."users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "buses_licensePlate_key" ON "public"."buses"("licensePlate");

-- CreateIndex
CREATE UNIQUE INDEX "buses_driverId_key" ON "public"."buses"("driverId");

-- CreateIndex
CREATE UNIQUE INDEX "positions_busId_key" ON "public"."positions"("busId");

-- CreateIndex
CREATE UNIQUE INDEX "route_points_routeId_seq_key" ON "public"."route_points"("routeId", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_qrCode_key" ON "public"."tickets"("qrCode");

-- CreateIndex
CREATE UNIQUE INDEX "payments_ticketId_key" ON "public"."payments"("ticketId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_paydunyaToken_key" ON "public"."payments"("paydunyaToken");

-- AddForeignKey
ALTER TABLE "public"."buses" ADD CONSTRAINT "buses_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."positions" ADD CONSTRAINT "positions_busId_fkey" FOREIGN KEY ("busId") REFERENCES "public"."buses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."routes" ADD CONSTRAINT "routes_startPointId_fkey" FOREIGN KEY ("startPointId") REFERENCES "public"."route_points"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."routes" ADD CONSTRAINT "routes_endPointId_fkey" FOREIGN KEY ("endPointId") REFERENCES "public"."route_points"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."route_points" ADD CONSTRAINT "route_points_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "public"."routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."trips" ADD CONSTRAINT "trips_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "public"."routes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."trips" ADD CONSTRAINT "trips_busId_fkey" FOREIGN KEY ("busId") REFERENCES "public"."buses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tickets" ADD CONSTRAINT "tickets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tickets" ADD CONSTRAINT "tickets_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "public"."trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
