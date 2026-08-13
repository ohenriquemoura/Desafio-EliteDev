import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Event, EventStatus, Prisma, SeatStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TmdbService } from '../tmdb/tmdb.service';
import { CreateEventDto, UpdateEventDto } from './dto/event.dto';
import { buildSeatPlan } from './seat-plan';

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tmdbService: TmdbService,
  ) {}

  async listPublished() {
    const events = await this.prisma.event.findMany({
      where: { status: EventStatus.PUBLISHED },
      orderBy: { startsAt: 'asc' },
    });
    return events.map((event) => this.toPublic(event));
  }

  async listMine(organizerId: string) {
    const events = await this.prisma.event.findMany({
      where: { organizerId },
      orderBy: { startsAt: 'asc' },
    });
    return events.map((event) => this.toPublic(event));
  }

  async getById(id: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event || event.status !== EventStatus.PUBLISHED) {
      throw new NotFoundException('Evento não encontrado');
    }

    return this.toPublic(event);
  }

  async listSeats(eventId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event || event.status !== EventStatus.PUBLISHED) {
      throw new NotFoundException('Evento não encontrado');
    }

    await this.ensureSeats(event);

    const seats = await this.prisma.seat.findMany({
      where: { eventId },
      orderBy: [{ rowLabel: 'asc' }, { number: 'asc' }],
    });

    const rowsMap = new Map<
      string,
      Array<{
        id: string;
        number: number;
        label: string;
        status: SeatStatus;
      }>
    >();

    for (const seat of seats) {
      const row = rowsMap.get(seat.rowLabel) ?? [];
      row.push({
        id: seat.id,
        number: seat.number,
        label: seat.label,
        status: seat.status,
      });
      rowsMap.set(seat.rowLabel, row);
    }

    return {
      eventId,
      capacity: event.capacity,
      availableSeats: Math.max(
        0,
        event.capacity - event.heldCount - event.soldCount,
      ),
      rows: Array.from(rowsMap.entries()).map(([rowLabel, rowSeats]) => ({
        rowLabel,
        seats: rowSeats,
      })),
    };
  }

  async create(organizerId: string, dto: CreateEventDto) {
    const movie = await this.tmdbService.getMovie(dto.tmdbMovieId);
    const status = dto.status ?? EventStatus.PUBLISHED;

    if (status === EventStatus.CANCELLED) {
      throw new BadRequestException('Não é possível criar evento cancelado');
    }

    const event = await this.prisma.$transaction(async (tx) => {
      const created = await tx.event.create({
        data: {
          organizerId,
          tmdbMovieId: movie.id,
          title: movie.title,
          posterPath: movie.posterPath,
          overview: movie.overview || null,
          venue: dto.venue.trim(),
          startsAt: new Date(dto.startsAt),
          capacity: dto.capacity,
          priceCents: dto.priceCents,
          status,
        },
      });

      await this.createSeats(tx, created.id, created.capacity);
      return created;
    });

    return this.toPublic(event);
  }

  async update(organizerId: string, id: string, dto: UpdateEventDto) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) {
      throw new NotFoundException('Evento não encontrado');
    }
    if (event.organizerId !== organizerId) {
      throw new ForbiddenException('Você não gerencia este evento');
    }

    if (dto.capacity !== undefined) {
      const used = event.heldCount + event.soldCount;
      if (dto.capacity < used) {
        throw new BadRequestException(
          `Capacidade mínima é ${used} (já reservado/vendido)`,
        );
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.event.update({
        where: { id },
        data: {
          venue: dto.venue?.trim(),
          startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
          capacity: dto.capacity,
          priceCents: dto.priceCents,
          status: dto.status,
        },
      });

      if (dto.capacity !== undefined && dto.capacity !== event.capacity) {
        await this.syncSeatCapacity(tx, next);
      }

      return next;
    });

    return this.toPublic(updated);
  }

  async ensureSeats(event: Pick<Event, 'id' | 'capacity'>) {
    const count = await this.prisma.seat.count({ where: { eventId: event.id } });
    if (count === event.capacity) return;

    if (count === 0) {
      await this.createSeats(this.prisma, event.id, event.capacity);
      return;
    }

    // Em leitura pública, só completa cadeiras faltantes (nunca remove).
    if (count < event.capacity) {
      const full = await this.prisma.event.findUnique({ where: { id: event.id } });
      if (!full) return;
      await this.prisma.$transaction(async (tx) => {
        await this.syncSeatCapacity(tx, full);
      });
    }
  }

  private async createSeats(
    db: Prisma.TransactionClient | PrismaService,
    eventId: string,
    capacity: number,
  ) {
    const plan = buildSeatPlan(capacity);
    await db.seat.createMany({
      data: plan.map((seat) => ({
        eventId,
        rowLabel: seat.rowLabel,
        number: seat.number,
        label: seat.label,
        status: SeatStatus.AVAILABLE,
      })),
    });
  }

  private async syncSeatCapacity(
    tx: Prisma.TransactionClient,
    event: Event,
  ) {
    const seats = await tx.seat.findMany({
      where: { eventId: event.id },
      orderBy: [{ rowLabel: 'asc' }, { number: 'asc' }],
    });

    if (seats.length === 0) {
      await this.createSeats(tx, event.id, event.capacity);
      return;
    }

    if (event.capacity > seats.length) {
      const plan = buildSeatPlan(event.capacity).slice(seats.length);
      await tx.seat.createMany({
        data: plan.map((seat) => ({
          eventId: event.id,
          rowLabel: seat.rowLabel,
          number: seat.number,
          label: seat.label,
          status: SeatStatus.AVAILABLE,
        })),
      });
      return;
    }

    if (event.capacity < seats.length) {
      const removable = seats
        .slice(event.capacity)
        .filter((seat) => seat.status === SeatStatus.AVAILABLE);
      if (removable.length !== seats.length - event.capacity) {
        throw new BadRequestException(
          'Não é possível reduzir a capacidade: há assentos ocupados no final da sala',
        );
      }
      await tx.seat.deleteMany({
        where: { id: { in: removable.map((seat) => seat.id) } },
      });
    }
  }

  private toPublic(event: Event) {
    const availableSeats = Math.max(
      0,
      event.capacity - event.heldCount - event.soldCount,
    );

    return {
      id: event.id,
      tmdbMovieId: event.tmdbMovieId,
      title: event.title,
      posterPath: event.posterPath,
      overview: event.overview,
      venue: event.venue,
      startsAt: event.startsAt.toISOString(),
      capacity: event.capacity,
      heldCount: event.heldCount,
      soldCount: event.soldCount,
      availableSeats,
      priceCents: event.priceCents,
      status: event.status,
      organizerId: event.organizerId,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
    };
  }
}
