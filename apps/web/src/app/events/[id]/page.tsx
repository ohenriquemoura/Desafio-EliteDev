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
  getAccessToken,
  getSession,
} from "@/lib/auth";
import { ReservationItem } from "@/lib/reservations";
import styles from "./detail.module.css";

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [quantity, setQuantity] = useState(1);
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
      const data = await apiFetch<EventItem>(`/events/${params.id}`);
      setEvent(data);
      setQuantity(1);
    } catch (err) {
      setEvent(null);
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar o evento.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function onReserve(formEvent: FormEvent) {
    formEvent.preventDefault();
    if (!event) return;

    setReserving(true);
    setError(null);
    try {
      const reservation = await apiFetch<ReservationItem>("/reservations", {
        method: "POST",
        token: getAccessToken(),
        body: JSON.stringify({
          eventId: event.id,
          quantity,
        }),
      });
      router.push(`/reservations/${reservation.id}`);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível criar a reserva.",
      );
    } finally {
      setReserving(false);
    }
  }

  const maxQty = event ? Math.max(1, Math.min(10, event.availableSeats)) : 1;
  const canReserve =
    session?.user.role === "CLIENT" &&
    event !== null &&
    event.availableSeats > 0;

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
              {event.availableSeats} de {event.capacity} vagas disponíveis
            </p>
            <p className={styles.overview}>
              {event.overview || "Sem sinopse."}
            </p>

            {canReserve ? (
              <form className={styles.reserveForm} onSubmit={onReserve}>
                <label className={styles.qtyLabel} htmlFor="quantity">
                  Quantidade (pista)
                </label>
                <div className={styles.qtyRow}>
                  <input
                    id="quantity"
                    type="number"
                    min={1}
                    max={maxQty}
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(
                        Math.max(
                          1,
                          Math.min(maxQty, Number(e.target.value) || 1),
                        ),
                      )
                    }
                  />
                  <p className={styles.total}>
                    Total {formatPrice(event.priceCents * quantity)}
                  </p>
                </div>
                <button
                  type="submit"
                  className={styles.cta}
                  disabled={reserving || event.availableSeats < 1}
                >
                  {reserving ? "Reservando…" : "Reservar"}
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
