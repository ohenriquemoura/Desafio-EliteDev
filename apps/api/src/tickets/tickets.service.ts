import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Ticket, TicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildTicketCode,
  newShareToken,
  newTicketId,
} from './ticket-crypto';

const eventSelect = {
  id: true,
  title: true,
  venue: true,
  startsAt: true,
  posterPath: true,
} as const;

type TicketWithEvent = Ticket & {
  event: {
    id: string;
    title: string;
    venue: string;
    startsAt: Date;
    posterPath: string | null;
  };
};

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  async issueForReservation(
    tx: Prisma.TransactionClient,
    input: {
      reservationId: string;
      eventId: string;
      clientId: string;
      quantity: number;
    },
  ) {
    const tickets: Ticket[] = [];

    for (let i = 0; i < input.quantity; i += 1) {
      const id = newTicketId();
      const code = buildTicketCode(id, input.eventId);
      const shareToken = newShareToken();

      const ticket = await tx.ticket.create({
        data: {
          id,
          eventId: input.eventId,
          reservationId: input.reservationId,
          clientId: input.clientId,
          code,
          shareToken,
          status: TicketStatus.ISSUED,
        },
      });
      tickets.push(ticket);
    }

    return tickets;
  }

  async listMine(clientId: string) {
    const tickets = await this.prisma.ticket.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      include: { event: { select: eventSelect } },
    });
    return tickets.map((ticket) => this.toOwner(ticket));
  }

  async getMine(clientId: string, id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: { event: { select: eventSelect } },
    });

    if (!ticket) {
      throw new NotFoundException('Ingresso não encontrado');
    }
    if (ticket.clientId !== clientId) {
      throw new ForbiddenException('Este ingresso não é seu');
    }

    return this.toOwner(ticket);
  }

  async getByShareToken(shareToken: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { shareToken },
      include: { event: { select: eventSelect } },
    });

    if (!ticket) {
      throw new NotFoundException('Ingresso não encontrado');
    }

    return this.toShared(ticket);
  }

  private toOwner(ticket: TicketWithEvent) {
    return {
      id: ticket.id,
      eventId: ticket.eventId,
      reservationId: ticket.reservationId,
      status: ticket.status,
      code: ticket.code,
      shareToken: ticket.shareToken,
      usedAt: ticket.usedAt?.toISOString() ?? null,
      createdAt: ticket.createdAt.toISOString(),
      event: {
        id: ticket.event.id,
        title: ticket.event.title,
        venue: ticket.event.venue,
        startsAt: ticket.event.startsAt.toISOString(),
        posterPath: ticket.event.posterPath,
      },
    };
  }

  private toShared(ticket: TicketWithEvent) {
    return {
      status: ticket.status,
      code: ticket.code,
      usedAt: ticket.usedAt?.toISOString() ?? null,
      event: {
        title: ticket.event.title,
        venue: ticket.event.venue,
        startsAt: ticket.event.startsAt.toISOString(),
        posterPath: ticket.event.posterPath,
      },
    };
  }
}
