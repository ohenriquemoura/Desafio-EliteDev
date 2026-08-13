import {
  buildTicketCode,
  newShareToken,
  newTicketId,
  verifyTicketCode,
} from './ticket-crypto';

describe('ticket-crypto', () => {
  const ticketId = '11111111-1111-4111-8111-111111111111';
  const eventId = '22222222-2222-4222-8222-222222222222';

  beforeAll(() => {
    process.env.TICKET_HMAC_SECRET = 'test-ticket-hmac-secret';
  });

  it('gera e verifica um código válido', () => {
    const code = buildTicketCode(ticketId, eventId);
    expect(code.startsWith('ED.')).toBe(true);

    const parsed = verifyTicketCode(code);
    expect(parsed).toEqual({ ticketId, eventId });
  });

  it('rejeita código adulterado', () => {
    const code = buildTicketCode(ticketId, eventId);
    const tampered = `${code.slice(0, -2)}xx`;
    expect(verifyTicketCode(tampered)).toBeNull();
  });

  it('rejeita formato inválido', () => {
    expect(verifyTicketCode('nao-e-um-codigo')).toBeNull();
    expect(verifyTicketCode('ED.a.b')).toBeNull();
  });

  it('gera share token e ticket id únicos', () => {
    expect(newShareToken()).not.toEqual(newShareToken());
    expect(newTicketId()).not.toEqual(newTicketId());
  });
});
