-- CreateEnum
CREATE TYPE "SeatStatus" AS ENUM ('AVAILABLE', 'HELD', 'SOLD');

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "seatLabel" TEXT;

-- CreateTable
CREATE TABLE "seats" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "rowLabel" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "status" "SeatStatus" NOT NULL DEFAULT 'AVAILABLE',
    "reservationId" UUID,
    "ticketId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "seats_ticketId_key" ON "seats"("ticketId");

-- CreateIndex
CREATE INDEX "seats_eventId_status_idx" ON "seats"("eventId", "status");

-- CreateIndex
CREATE INDEX "seats_reservationId_idx" ON "seats"("reservationId");

-- CreateIndex
CREATE UNIQUE INDEX "seats_eventId_rowLabel_number_key" ON "seats"("eventId", "rowLabel", "number");

-- AddForeignKey
ALTER TABLE "seats" ADD CONSTRAINT "seats_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seats" ADD CONSTRAINT "seats_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seats" ADD CONSTRAINT "seats_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
