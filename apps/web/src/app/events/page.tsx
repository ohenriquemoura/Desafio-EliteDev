"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandLockup } from "@/components/BrandLockup";
import { apiFetch, ApiError } from "@/lib/api";
import {
  EventItem,
  POSTER_BASE,
  formatDateTime,
  formatPrice,
} from "@/lib/events";
import { getSession } from "@/lib/auth";
import styles from "./events.module.css";

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(Boolean(getSession()));
    void loadEvents();
  }, []);

  async function loadEvents() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<EventItem[]>("/events");
      setEvents(data);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar os eventos.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <BrandLockup compact />
        <nav className={styles.nav}>
          {isLoggedIn ? (
            <Link href="/login">Minha conta</Link>
          ) : (
            <Link href="/login">Entrar</Link>
          )}
        </nav>
      </header>

      <section className={styles.hero}>
        <p className={styles.kicker}>Em cartaz</p>
        <h1 className={styles.title}>Eventos publicados</h1>
        <p className={styles.lead}>
          Escolha a sessão, reserve na pista e garanta seu ingresso.
        </p>
      </section>

      {loading && <p className={styles.meta}>Carregando cartaz…</p>}
      {error && <p className={styles.error}>{error}</p>}

      {!loading && !error && events.length === 0 && (
        <p className={styles.meta}>Nenhum evento publicado no momento.</p>
      )}

      <ul className={styles.grid}>
        {events.map((event) => (
          <li key={event.id}>
            <Link href={`/events/${event.id}`} className={styles.card}>
              {event.posterPath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`${POSTER_BASE}${event.posterPath}`}
                  alt=""
                  width={120}
                  height={180}
                />
              ) : (
                <div className={styles.posterFallback} aria-hidden />
              )}
              <div className={styles.body}>
                <h2>{event.title}</h2>
                <p>{formatDateTime(event.startsAt)}</p>
                <p>{event.venue}</p>
                <p className={styles.price}>{formatPrice(event.priceCents)}</p>
                <p className={styles.seats}>
                  {event.availableSeats} vaga
                  {event.availableSeats === 1 ? "" : "s"}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
