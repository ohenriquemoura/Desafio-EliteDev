import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EventStatus,
  Prisma,
  Reservation,
  ReservationStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TicketsService } from '../tickets/tickets.service';
import { CreateReservationDto, PayReservationDto } from './dto/reservation.dto';

const HOLD_MINUTES = 15;

const eventSelect = {
  id: true,
  title: true,
  venue: true,
  startsAt: true,
  posterPath: true,
  priceCents: true,
} as const;

type ReservationWithEvent = Reservation & {
  event: {
    id: string;
    title: string;
    venue: string;
    startsAt: Date;
    posterPath: string | null;
    priceCents: number;
  };
};

type EventLockRow = {
  id: string;
  capacity: number;
  heldCount: number;
  soldCount: number;
  priceCents: number;
  status: EventStatus;
};

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ticketsService: TicketsService,
  ) {}

  async create(clientId: string, dto: CreateReservationDto) {
    const expiresAt = new Date(Date.now() + HOLD_MINUTES * 60_000);

    const reservation = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<EventLockRow[]>`
        SELECT id, capacity, "heldCount", "soldCount", "priceCents", status
        FROM events
        WHERE id = ${dto.eventId}::uuid
        FOR UPDATE
      `;

      const event = rows[0];
      if (!event || event.status !== EventStatus.PUBLISHED) {
        throw new NotFoundException('Evento não encontrado');
      }

      const available = event.capacity - event.heldCount - event.soldCount;
      if (dto.quantity > available) {
        throw new BadRequestException(
          available <= 0
            ? 'Evento esgotado'
            : `Apenas ${available} vaga(s) disponível(is)`,
        );
      }

      await tx.event.update({
        where: { id: event.id },
        data: { heldCount: { increment: dto.quantity } },
      });

      return tx.reservation.create({
        data: {
          eventId: event.id,
          clientId,
          quantity: dto.quantity,
          amountCents: event.priceCents * dto.quantity,
          status: ReservationStatus.PENDING_PAYMENT,
          expiresAt,
        },
        include: { event: { select: eventSelect } },
      });
    });

    return this.toPublic(reservation);
  }

  async listMine(clientId: string) {
    const reservations = await this.prisma.reservation.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      include: { event: { select: eventSelect } },
    });

    const refreshed: ReservationWithEvent[] = [];
    for (const reservation of reservations) {
      refreshed.push(await this.ensureFresh(reservation));
    }
    return refreshed.map((item) => this.toPublic(item));
  }

  async getMine(clientId: string, id: string) {
    const reservation = await this.findOwned(clientId, id);
    return this.toPublic(await this.ensureFresh(reservation));
  }

  async pay(clientId: string, id: string, dto: PayReservationDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where: { id },
        include: { event: { select: eventSelect } },
      });

      if (!reservation) {
        throw new NotFoundException('Reserva não encontrada');
      }
      if (reservation.clientId !== clientId) {
        throw new ForbiddenException('Esta reserva não é sua');
      }

      if (reservation.status === ReservationStatus.EXPIRED) {
        throw new BadRequestException('Reserva expirada. Faça uma nova.');
      }

      if (
        reservation.status === ReservationStatus.PENDING_PAYMENT &&
        reservation.expiresAt &&
        reservation.expiresAt.getTime() <= Date.now()
      ) {
        await this.releaseHold(tx, reservation);
        await tx.reservation.update({
          where: { id: reservation.id },
          data: { status: ReservationStatus.EXPIRED },
        });
        throw new BadRequestException('Reserva expirada. Faça uma nova.');
      }

      if (reservation.status !== ReservationStatus.PENDING_PAYMENT) {
        throw new BadRequestException(
          `Reserva não está pendente de pagamento (status: ${reservation.status})`,
        );
      }

      await tx.$queryRaw`
        SELECT id FROM events WHERE id = ${reservation.eventId}::uuid FOR UPDATE
      `;

      if (dto.outcome === 'decline') {
        await this.releaseHold(tx, reservation);
        return tx.reservation.update({
          where: { id: reservation.id },
          data: { status: ReservationStatus.PAYMENT_FAILED },
          include: { event: { select: eventSelect } },
        });
      }

      await tx.event.update({
        where: { id: reservation.eventId },
        data: {
          heldCount: { decrement: reservation.quantity },
          soldCount: { increment: reservation.quantity },
        },
      });

      const paid = await tx.reservation.update({
        where: { id: reservation.id },
        data: { status: ReservationStatus.PAID },
        include: { event: { select: eventSelect } },
      });

      await this.ticketsService.issueForReservation(tx, {
        reservationId: paid.id,
        eventId: paid.eventId,
        clientId: paid.clientId,
        quantity: paid.quantity,
      });

      return paid;
    });

    return this.toPublic(result);
  }

  private async findOwned(clientId: string, id: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: { event: { select: eventSelect } },
    });

    if (!reservation) {
      throw new NotFoundException('Reserva não encontrada');
    }
    if (reservation.clientId !== clientId) {
      throw new ForbiddenException('Esta reserva não é sua');
    }

    return reservation;
  }

  private async ensureFresh(
    reservation: ReservationWithEvent,
  ): Promise<ReservationWithEvent> {
    if (
      reservation.status !== ReservationStatus.PENDING_PAYMENT ||
      !reservation.expiresAt ||
      reservation.expiresAt.getTime() > Date.now()
    ) {
      return reservation;
    }

    return this.prisma.$transaction(async (tx) => {
      const current = await tx.reservation.findUnique({
        where: { id: reservation.id },
      });
      if (!current || current.status !== ReservationStatus.PENDING_PAYMENT) {
        return reservation;
      }

      await this.releaseHold(tx, current);
      return tx.reservation.update({
        where: { id: current.id },
        data: { status: ReservationStatus.EXPIRED },
        include: { event: { select: eventSelect } },
      });
    });
  }

  private async releaseHold(
    tx: Prisma.TransactionClient,
    reservation: Pick<Reservation, 'eventId' | 'quantity'>,
  ) {
    await tx.event.update({
      where: { id: reservation.eventId },
      data: { heldCount: { decrement: reservation.quantity } },
    });
  }

  private toPublic(reservation: ReservationWithEvent) {
    return {
      id: reservation.id,
      eventId: reservation.eventId,
      clientId: reservation.clientId,
      quantity: reservation.quantity,
      amountCents: reservation.amountCents,
      status: reservation.status,
      expiresAt: reservation.expiresAt?.toISOString() ?? null,
      createdAt: reservation.createdAt.toISOString(),
      updatedAt: reservation.updatedAt.toISOString(),
      event: {
        id: reservation.event.id,
        title: reservation.event.title,
        venue: reservation.event.venue,
        startsAt: reservation.event.startsAt.toISOString(),
        posterPath: reservation.event.posterPath,
        priceCents: reservation.event.priceCents,
      },
    };
  }
}
