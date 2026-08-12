import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Event, EventStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TmdbService } from '../tmdb/tmdb.service';
import { CreateEventDto, UpdateEventDto } from './dto/event.dto';

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

  async create(organizerId: string, dto: CreateEventDto) {
    const movie = await this.tmdbService.getMovie(dto.tmdbMovieId);
    const status = dto.status ?? EventStatus.PUBLISHED;

    if (status === EventStatus.CANCELLED) {
      throw new BadRequestException('Não é possível criar evento cancelado');
    }

    const event = await this.prisma.event.create({
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

    const updated = await this.prisma.event.update({
      where: { id },
      data: {
        venue: dto.venue?.trim(),
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        capacity: dto.capacity,
        priceCents: dto.priceCents,
        status: dto.status,
      },
    });

    return this.toPublic(updated);
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
