export type ReservationStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "PAYMENT_FAILED"
  | "CANCELLED"
  | "EXPIRED";

export type ReservationItem = {
  id: string;
  eventId: string;
  clientId: string;
  quantity: number;
  amountCents: number;
  status: ReservationStatus;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  event: {
    id: string;
    title: string;
    venue: string;
    startsAt: string;
    posterPath: string | null;
    priceCents: number;
  };
};

export function reservationStatusLabel(status: ReservationStatus) {
  switch (status) {
    case "PENDING_PAYMENT":
      return "Aguardando pagamento";
    case "PAID":
      return "Pago";
    case "PAYMENT_FAILED":
      return "Pagamento recusado";
    case "CANCELLED":
      return "Cancelada";
    case "EXPIRED":
      return "Expirada";
    default:
      return status;
  }
}
