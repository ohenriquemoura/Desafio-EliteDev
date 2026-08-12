-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ORGANIZER', 'CLIENT', 'GATE');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'PAYMENT_FAILED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('ISSUED', 'USED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "organizerId" UUID NOT NULL,
    "tmdbMovieId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "posterPath" TEXT,
    "overview" TEXT,
    "venue" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "heldCount" INTEGER NOT NULL DEFAULT 0,
    "soldCount" INTEGER NOT NULL DEFAULT 0,
    "priceCents" INTEGER NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "amountCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "reservationId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "shareToken" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'ISSUED',
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "events_status_startsAt_idx" ON "events"("status", "startsAt");

-- CreateIndex
CREATE INDEX "events_organizerId_idx" ON "events"("organizerId");

-- CreateIndex
CREATE INDEX "reservations_eventId_status_idx" ON "reservations"("eventId", "status");

-- CreateIndex
CREATE INDEX "reservations_clientId_idx" ON "reservations"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_code_key" ON "tickets"("code");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_shareToken_key" ON "tickets"("shareToken");

-- CreateIndex
CREATE INDEX "tickets_eventId_status_idx" ON "tickets"("eventId", "status");

-- CreateIndex
CREATE INDEX "tickets_clientId_idx" ON "tickets"("clientId");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Estoque: não vender além da capacidade; contadores não negativos
ALTER TABLE "events" ADD CONSTRAINT "events_capacity_positive" CHECK ("capacity" > 0);
ALTER TABLE "events" ADD CONSTRAINT "events_held_nonnegative" CHECK ("heldCount" >= 0);
ALTER TABLE "events" ADD CONSTRAINT "events_sold_nonnegative" CHECK ("soldCount" >= 0);
ALTER TABLE "events" ADD CONSTRAINT "events_stock_within_capacity" CHECK ("heldCount" + "soldCount" <= "capacity");

ALTER TABLE "reservations" ADD CONSTRAINT "reservations_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_amount_nonnegative" CHECK ("amountCents" >= 0);

ALTER TABLE "events" ADD CONSTRAINT "events_price_nonnegative" CHECK ("priceCents" >= 0);
