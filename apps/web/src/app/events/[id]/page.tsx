"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BrandLockup } from "@/components/BrandLockup";
import { apiFetch, ApiError } from "@/lib/api";
import {
  EventItem,
  POSTER_LARGE,
  formatDateTime,
  formatPrice,
} from "@/lib/events";
import {
  AuthSession,
  clearSession,
  getAccessToken,
  getSession,
} from "@/lib/auth";
import { ReservationItem } from "@/lib/reservations";
import { SeatMap } from "@/lib/seats";
import styles from "./detail.module.css";

const MAX_SELECTION = 8;

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [seatMap, setSeatMap] = useState<SeatMap | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [reserving, setReserving] = useState(false);

  useEffect(() => {
    setSession(getSession());
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [eventData, seatsData] = await Promise.all([
        apiFetch<EventItem>(`/events/${params.id}`),
        apiFetch<SeatMap>(`/events/${params.id}/seats`),
      ]);
      setEvent(eventData);
      setSeatMap(seatsData);
      setSelected([]);
    } catch (err) {
      setEvent(null);
      setSeatMap(null);
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar o evento.",
      );
    } finally {
      setLoading(false);
    }
  }

  function toggleSeat(seatId: string, available: boolean) {
    if (!available) return;
    setSelected((current) => {
      if (current.includes(seatId)) {
        return current.filter((id) => id !== seatId);
      }
      if (current.length >= MAX_SELECTION) {
        setError(`Máximo de ${MAX_SELECTION} cadeiras por compra.`);
        return current;
      }
      setError(null);
      return [...current, seatId];
    });
  }

  async function onReserve(formEvent: FormEvent) {
    formEvent.preventDefault();
    if (!event || selected.length === 0) return;

    setReserving(true);
    setError(null);
    try {
      const reservation = await apiFetch<ReservationItem>("/reservations", {
        method: "POST",
        token: getAccessToken(),
        body: JSON.stringify({
          eventId: event.id,
          seatIds: selected,
        }),
      });
      router.push(`/reservations/${reservation.id}`);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível criar a reserva.",
      );
      void load();
    } finally {
      setReserving(false);
    }
  }

  const canReserve =
    session?.user.role === "CLIENT" &&
    event !== null &&
    event.availableSeats > 0;

  const selectedLabels =
    seatMap?.rows
      .flatMap((row) => row.seats)
      .filter((seat) => selected.includes(seat.id))
      .map((seat) => seat.label) ?? [];

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <BrandLockup compact />
        <div className={styles.headerLinks}>
          {session?.user.role === "CLIENT" && (
            <>
              <Link href="/tickets" className={styles.back}>
                Ingressos
              </Link>
              <Link href="/reservations" className={styles.back}>
                Minhas reservas
              </Link>
            </>
          )}
          <Link href="/events" className={styles.back}>
            Voltar ao cartaz
          </Link>
          {session ? (
            <button
              type="button"
              className={styles.logout}
              onClick={() => {
                clearSession();
                setSession(null);
                router.push("/");
              }}
            >
              Sair
            </button>
          ) : (
            <Link href="/login" className={styles.back}>
              Entrar
            </Link>
          )}
        </div>
      </header>

      {loading && <p className={styles.meta}>Carregando…</p>}
      {error && <p className={styles.error}>{error}</p>}

      {event && (
        <article className={styles.article}>
          {event.posterPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`${POSTER_LARGE}${event.posterPath}`}
              alt=""
              width={280}
              height={420}
              className={styles.poster}
            />
          ) : (
            <div className={styles.posterFallback} aria-hidden />
          )}

          <div className={styles.content}>
            <p className={styles.kicker}>Sessão publicada</p>
            <h1>{event.title}</h1>
            <p className={styles.meta}>{formatDateTime(event.startsAt)}</p>
            <p className={styles.meta}>{event.venue}</p>
            <p className={styles.price}>{formatPrice(event.priceCents)}</p>
            <p className={styles.seats}>
              {event.availableSeats} de {event.capacity} cadeiras disponíveis
            </p>
            <p className={styles.overview}>
              {event.overview || "Sem sinopse."}
            </p>

            {canReserve ? (
              <form className={styles.reserveForm} onSubmit={onReserve}>
                <p className={styles.qtyLabel}>Escolha as cadeiras</p>
                <div className={styles.screen} aria-hidden>
                  Tela
                </div>

                <div className={styles.seatMap} role="group" aria-label="Mapa de cadeiras">
                  {seatMap?.rows.map((row) => (
                    <div key={row.rowLabel} className={styles.seatRow}>
                      <span className={styles.rowLabel}>{row.rowLabel}</span>
                      <div className={styles.seatButtons}>
                        {row.seats.map((seat) => {
                          const isSelected = selected.includes(seat.id);
                          const available = seat.status === "AVAILABLE";
                          return (
                            <button
                              key={seat.id}
                              type="button"
                              className={`${styles.seat} ${
                                isSelected
                                  ? styles.seatSelected
                                  : available
                                    ? styles.seatFree
                                    : styles.seatTaken
                              }`}
                              disabled={!available && !isSelected}
                              aria-pressed={isSelected}
                              aria-label={`Cadeira ${seat.label}`}
                              onClick={() =>
                                toggleSeat(seat.id, available || isSelected)
                              }
                            >
                              {seat.number}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className={styles.legend}>
                  <span>
                    <i className={`${styles.dot} ${styles.seatFree}`} /> Livre
                  </span>
                  <span>
                    <i className={`${styles.dot} ${styles.seatSelected}`} />{" "}
                    Selecionada
                  </span>
                  <span>
                    <i className={`${styles.dot} ${styles.seatTaken}`} />{" "}
                    Indisponível
                  </span>
                </div>

                <p className={styles.total}>
                  {selected.length === 0
                    ? "Nenhuma cadeira selecionada"
                    : `${selectedLabels.join(", ")} · Total ${formatPrice(
                        event.priceCents * selected.length,
                      )}`}
                </p>

                <button
                  type="submit"
                  className={styles.cta}
                  disabled={reserving || selected.length === 0}
                >
                  {reserving ? "Reservando…" : "Reservar cadeiras"}
                </button>
              </form>
            ) : session?.user.role === "CLIENT" ? (
              <p className={styles.soon}>Evento esgotado no momento.</p>
            ) : (
              <Link className={styles.cta} href="/login">
                Entrar para reservar
              </Link>
            )}
          </div>
        </article>
      )}
    </main>
  );
}
