"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BrandLockup } from "@/components/BrandLockup";
import { apiFetch, ApiError } from "@/lib/api";
import {
  EventItem,
  POSTER_LARGE,
  formatDateTime,
  formatPrice,
} from "@/lib/events";
import { AuthSession, getSession } from "@/lib/auth";
import styles from "./detail.module.css";

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<AuthSession | null>(null);

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

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <BrandLockup compact />
        <Link href="/events" className={styles.back}>
          Voltar ao cartaz
        </Link>
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

            {session?.user.role === "CLIENT" ? (
              <p className={styles.soon}>
                Reserva e pagamento entram na próxima etapa.
              </p>
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
