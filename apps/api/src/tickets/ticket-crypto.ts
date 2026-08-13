import { createHmac, randomBytes, randomUUID } from 'crypto';

function hmacSecret() {
  const secret = process.env.TICKET_HMAC_SECRET;
  if (!secret) {
    throw new Error('TICKET_HMAC_SECRET não configurado');
  }
  return secret;
}

/** Código opaco: ED.<ticketId>.<eventId>.<sig> */
export function buildTicketCode(ticketId: string, eventId: string) {
  const payload = `${ticketId}.${eventId}`;
  const sig = createHmac('sha256', hmacSecret())
    .update(payload)
    .digest('base64url')
    .slice(0, 24);
  return `ED.${payload}.${sig}`;
}

export function verifyTicketCode(code: string): {
  ticketId: string;
  eventId: string;
} | null {
  const parts = code.split('.');
  if (parts.length !== 4 || parts[0] !== 'ED') {
    return null;
  }

  const [, ticketId, eventId, sig] = parts;
  if (!ticketId || !eventId || !sig) {
    return null;
  }

  const expected = createHmac('sha256', hmacSecret())
    .update(`${ticketId}.${eventId}`)
    .digest('base64url')
    .slice(0, 24);

  if (sig !== expected) {
    return null;
  }

  return { ticketId, eventId };
}

export function newShareToken() {
  return randomBytes(24).toString('base64url');
}

export function newTicketId() {
  return randomUUID();
}
