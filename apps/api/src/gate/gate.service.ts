import { Injectable } from '@nestjs/common';
import { TicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { verifyTicketCode } from '../tickets/ticket-crypto';
import { ValidateTicketDto } from './dto/validate-ticket.dto';

export type GateResult =
  | 'VALID'
  | 'ALREADY_USED'
  | 'INVALID'
  | 'WRONG_EVENT';

@Injectable()
export class GateService {
  constructor(private readonly prisma: PrismaService) {}

  async validate(dto: ValidateTicketDto) {
    const code = dto.code.trim();
    const parsed = verifyTicketCode(code);

    if (!parsed) {
      return this.response('INVALID', 'Código inválido ou adulterado.');
    }

    if (parsed.eventId !== dto.eventId) {
      return this.response(
        'WRONG_EVENT',
        'Ingresso válido, mas de outro evento.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT id FROM tickets WHERE id = ${parsed.ticketId}::uuid FOR UPDATE
      `;

      const ticket = await tx.ticket.findUnique({
        where: { id: parsed.ticketId },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              venue: true,
              startsAt: true,
            },
          },
        },
      });

      if (!ticket || ticket.code !== code) {
        return this.response('INVALID', 'Código inválido ou adulterado.');
      }

      if (ticket.eventId !== dto.eventId) {
        return this.response(
          'WRONG_EVENT',
          'Ingresso válido, mas de outro evento.',
        );
      }

      if (ticket.status === TicketStatus.USED) {
        return this.response(
          'ALREADY_USED',
          'Ingresso já utilizado.',
          {
            usedAt: ticket.usedAt?.toISOString() ?? null,
            eventTitle: ticket.event.title,
            seatLabel: ticket.seatLabel,
          },
        );
      }

      const used = await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          status: TicketStatus.USED,
          usedAt: new Date(),
        },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              venue: true,
              startsAt: true,
            },
          },
        },
      });

      return this.response('VALID', 'Ingresso válido. Entrada liberada.', {
        usedAt: used.usedAt?.toISOString() ?? null,
        eventTitle: used.event.title,
        venue: used.event.venue,
        seatLabel: used.seatLabel,
      });
    });
  }

  private response(
    result: GateResult,
    message: string,
    extra?: {
      usedAt?: string | null;
      eventTitle?: string;
      venue?: string;
      seatLabel?: string | null;
    },
  ) {
    return {
      result,
      message,
      ...extra,
    };
  }
}
