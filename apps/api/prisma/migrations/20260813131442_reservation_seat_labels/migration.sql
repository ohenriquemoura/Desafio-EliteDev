-- AlterTable
ALTER TABLE "reservations" ADD COLUMN     "seatLabels" TEXT[] DEFAULT ARRAY[]::TEXT[];
