export type TicketStatus = "ISSUED" | "USED";

export type TicketItem = {
  id: string;
  eventId: string;
  reservationId: string;
  status: TicketStatus;
  code: string;
  shareToken: string;
  usedAt: string | null;
  createdAt: string;
  event: {
    id: string;
    title: string;
    venue: string;
    startsAt: string;
    posterPath: string | null;
  };
};

export type SharedTicket = {
  status: TicketStatus;
  code: string;
  usedAt: string | null;
  event: {
    title: string;
    venue: string;
    startsAt: string;
    posterPath: string | null;
  };
};

export function ticketStatusLabel(status: TicketStatus) {
  return status === "USED" ? "Utilizado" : "Válido";
}
