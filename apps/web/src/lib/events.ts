export type EventStatus = "DRAFT" | "PUBLISHED" | "CANCELLED";

export type EventItem = {
  id: string;
  tmdbMovieId: number;
  title: string;
  posterPath: string | null;
  overview: string | null;
  venue: string;
  startsAt: string;
  capacity: number;
  heldCount: number;
  soldCount: number;
  availableSeats: number;
  priceCents: number;
  status: EventStatus;
  organizerId: string;
};

export function formatPrice(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export const POSTER_BASE = "https://image.tmdb.org/t/p/w185";
export const POSTER_LARGE = "https://image.tmdb.org/t/p/w342";
