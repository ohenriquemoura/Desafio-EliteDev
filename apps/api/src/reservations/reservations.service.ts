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
  SeatStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
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

const seatSelect = {
  id: true,
  label: true,
  rowLabel: true,
  number: true,
  status: true,
} as const;

type ReservationWithRelations = Reservation & {
  event: {
    id: string;
    title: string;
    venue: string;
    startsAt: Date;
    posterPath: string | null;
    priceCents: number;
  };
  seats: Array<{
    id: string;
    label: string;
    rowLabel: string;
    number: number;
    status: SeatStatus;
  }>;
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
    private readonly eventsService: EventsService,
  ) {}

  async create(clientId: string, dto: CreateReservationDto) {
    const expiresAt = new Date(Date.now() + HOLD_MINUTES * 60_000);
    const quantity = dto.seatIds.length;

    const published = await this.prisma.event.findUnique({
      where: { id: dto.eventId },
    });
    if (!published || published.status !== EventStatus.PUBLISHED) {
      throw new NotFoundException('Evento não encontrado');
    }
    await this.eventsService.ensureSeats(published);

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

      await tx.$queryRaw`
        SELECT id FROM seats
        WHERE "eventId" = ${dto.eventId}::uuid
        FOR UPDATE
      `;

      const seats = await tx.seat.findMany({
        where: { id: { in: dto.seatIds } },
        orderBy: [{ rowLabel: 'asc' }, { number: 'asc' }],
      });

      if (seats.length !== dto.seatIds.length) {
        throw new BadRequestException('Uma ou mais cadeiras são inválidas');
      }

      for (const seat of seats) {
        if (seat.eventId !== event.id) {
          throw new BadRequestException('Cadeira não pertence a este evento');
        }
        if (seat.status !== SeatStatus.AVAILABLE) {
          throw new BadRequestException(
            `Cadeira ${seat.label} não está disponível`,
          );
        }
      }

      const available = event.capacity - event.heldCount - event.soldCount;
      if (quantity > available) {
        throw new BadRequestException(
          available <= 0
            ? 'Evento esgotado'
            : `Apenas ${available} vaga(s) disponível(is)`,
        );
      }

      const created = await tx.reservation.create({
        data: {
          eventId: event.id,
          clientId,
          quantity,
          seatLabels: seats.map((seat) => seat.label),
          amountCents: event.priceCents * quantity,
          status: ReservationStatus.PENDING_PAYMENT,
          expiresAt,
        },
      });

      await tx.seat.updateMany({
        where: { id: { in: dto.seatIds } },
        data: {
          status: SeatStatus.HELD,
          reservationId: created.id,
        },
      });

      await tx.event.update({
        where: { id: event.id },
        data: { heldCount: { increment: quantity } },
      });

      return tx.reservation.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          event: { select: eventSelect },
          seats: {
            select: seatSelect,
            orderBy: [{ rowLabel: 'asc' }, { number: 'asc' }],
          },
        },
      });
    });

    return this.toPublic(reservation);
  }

  async listMine(clientId: string) {
    const reservations = await this.prisma.reservation.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      include: {
        event: { select: eventSelect },
        seats: {
          select: seatSelect,
          orderBy: [{ rowLabel: 'asc' }, { number: 'asc' }],
        },
      },
    });

    const refreshed: ReservationWithRelations[] = [];
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
        include: {
          event: { select: eventSelect },
          seats: {
            select: seatSelect,
            orderBy: [{ rowLabel: 'asc' }, { number: 'asc' }],
          },
        },
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
          include: {
            event: { select: eventSelect },
            seats: {
              select: seatSelect,
              orderBy: [{ rowLabel: 'asc' }, { number: 'asc' }],
            },
          },
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
        include: {
          event: { select: eventSelect },
          seats: {
            select: seatSelect,
            orderBy: [{ rowLabel: 'asc' }, { number: 'asc' }],
          },
        },
      });

      const tickets = await this.ticketsService.issueForReservation(tx, {
        reservationId: paid.id,
        eventId: paid.eventId,
        clientId: paid.clientId,
        seats: paid.seats.map((seat) => ({
          id: seat.id,
          label: seat.label,
        })),
      });

      for (const ticket of tickets) {
        if (!ticket.seatLabel) continue;
        const seat = paid.seats.find((item) => item.label === ticket.seatLabel);
        if (!seat) continue;
        await tx.seat.update({
          where: { id: seat.id },
          data: {
            status: SeatStatus.SOLD,
            ticketId: ticket.id,
            reservationId: paid.id,
          },
        });
      }

      return tx.reservation.findUniqueOrThrow({
        where: { id: paid.id },
        include: {
          event: { select: eventSelect },
          seats: {
            select: seatSelect,
            orderBy: [{ rowLabel: 'asc' }, { number: 'asc' }],
          },
        },
      });
    });

    return this.toPublic(result);
  }

  private async findOwned(clientId: string, id: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        event: { select: eventSelect },
        seats: {
          select: seatSelect,
          orderBy: [{ rowLabel: 'asc' }, { number: 'asc' }],
        },
      },
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
    reservation: ReservationWithRelations,
  ): Promise<ReservationWithRelations> {
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
        include: {
          seats: { select: { id: true, label: true, rowLabel: true, number: true, status: true } },
        },
      });
      if (!current || current.status !== ReservationStatus.PENDING_PAYMENT) {
        return reservation;
      }

      await this.releaseHold(tx, current);
      return tx.reservation.update({
        where: { id: current.id },
        data: { status: ReservationStatus.EXPIRED },
        include: {
          event: { select: eventSelect },
          seats: {
            select: seatSelect,
            orderBy: [{ rowLabel: 'asc' }, { number: 'asc' }],
          },
        },
      });
    });
  }

  private async releaseHold(
    tx: Prisma.TransactionClient,
    reservation: Pick<Reservation, 'id' | 'eventId' | 'quantity'>,
  ) {
    await tx.seat.updateMany({
      where: {
        reservationId: reservation.id,
        status: SeatStatus.HELD,
      },
      data: {
        status: SeatStatus.AVAILABLE,
        reservationId: null,
      },
    });

    await tx.event.update({
      where: { id: reservation.eventId },
      data: { heldCount: { decrement: reservation.quantity } },
    });
  }

  private toPublic(reservation: ReservationWithRelations) {
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
      seats: reservation.seatLabels.map((label) => {
        const live = reservation.seats.find((seat) => seat.label === label);
        return {
          id: live?.id ?? null,
          label,
          rowLabel: live?.rowLabel ?? label.charAt(0),
          number: live?.number ?? (Number(label.slice(1)) || 0),
          status: live?.status ?? null,
        };
      }),
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
