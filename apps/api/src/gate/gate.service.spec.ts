import { TicketStatus } from '@prisma/client';
import { GateService } from './gate.service';
import { buildTicketCode } from '../tickets/ticket-crypto';
import { PrismaService } from '../prisma/prisma.service';

describe('GateService', () => {
  const ticketId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const eventId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const otherEventId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

  let service: GateService;
  let prisma: {
    $transaction: jest.Mock;
    $queryRaw: jest.Mock;
    ticket: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeAll(() => {
    process.env.TICKET_HMAC_SECRET = 'test-ticket-hmac-secret';
  });

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(),
      $queryRaw: jest.fn().mockResolvedValue([]),
      ticket: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    prisma.$transaction.mockImplementation(
      async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma),
    );

    service = new GateService(prisma as unknown as PrismaService);
  });

  function issuedTicket(overrides: Record<string, unknown> = {}) {
    return {
      id: ticketId,
      eventId,
      code: buildTicketCode(ticketId, eventId),
      status: TicketStatus.ISSUED,
      seatLabel: 'A1',
      usedAt: null,
      event: {
        id: eventId,
        title: 'Filme Teste',
        venue: 'Sala 1',
        startsAt: new Date('2026-09-01T20:00:00.000Z'),
      },
      ...overrides,
    };
  }

  it('retorna INVALID para código forjado', async () => {
    const result = await service.validate({
      eventId,
      code: 'ED.fake.fake.assinaturaaaaaaaa',
    });
    expect(result.result).toBe('INVALID');
  });

  it('retorna WRONG_EVENT quando o evento do código difere', async () => {
    const code = buildTicketCode(ticketId, eventId);
    const result = await service.validate({
      eventId: otherEventId,
      code,
    });
    expect(result.result).toBe('WRONG_EVENT');
  });

  it('retorna VALID e marca o ingresso como USED', async () => {
    const ticket = issuedTicket();
    prisma.ticket.findUnique.mockResolvedValue(ticket);
    prisma.ticket.update.mockResolvedValue({
      ...ticket,
      status: TicketStatus.USED,
      usedAt: new Date('2026-09-01T21:00:00.000Z'),
    });

    const result = await service.validate({
      eventId,
      code: ticket.code,
    });

    expect(result.result).toBe('VALID');
    expect(result.seatLabel).toBe('A1');
    expect(prisma.ticket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: ticketId },
        data: expect.objectContaining({ status: TicketStatus.USED }),
      }),
    );
  });

  it('retorna ALREADY_USED na segunda validação', async () => {
    const ticket = issuedTicket({
      status: TicketStatus.USED,
      usedAt: new Date('2026-09-01T21:00:00.000Z'),
    });
    prisma.ticket.findUnique.mockResolvedValue(ticket);

    const result = await service.validate({
      eventId,
      code: ticket.code,
    });

    expect(result.result).toBe('ALREADY_USED');
    expect(prisma.ticket.update).not.toHaveBeenCalled();
  });
});
