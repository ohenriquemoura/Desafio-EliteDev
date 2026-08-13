"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BrandLockup } from "@/components/BrandLockup";
import { TicketQr } from "@/components/TicketQr";
import { apiFetch, ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/events";
import { SharedTicket, ticketStatusLabel } from "@/lib/tickets";
import styles from "./share.module.css";

export default function ShareTicketPage() {
  const params = useParams<{ token: string }>();
  const [ticket, setTicket] = useState<SharedTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.token]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<SharedTicket>(
        `/tickets/share/${encodeURIComponent(params.token)}`,
      );
      setTicket(data);
    } catch (err) {
      setTicket(null);
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível abrir este ingresso.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <BrandLockup compact />
        <Link href="/events" className={styles.navLink}>
          Ver cartaz
        </Link>
      </header>

      <section className={styles.hero}>
        <p className={styles.kicker}>Ingresso compartilhado</p>
        <h1 className={styles.title}>Somente leitura</h1>
      </section>

      {loading && <p className={styles.meta}>Carregando…</p>}
      {error && <p className={styles.error}>{error}</p>}

      {ticket && (
        <article className={styles.card}>
          <TicketQr value={ticket.code} size={240} />
          <div>
            <h2>{ticket.event.title}</h2>
            <p className={styles.meta}>
              {formatDateTime(ticket.event.startsAt)} · {ticket.event.venue}
            </p>
            {ticket.seatLabel && (
              <p className={styles.seat}>Cadeira {ticket.seatLabel}</p>
            )}
            <p
              className={`${styles.badge} ${
                ticket.status === "USED" ? styles.used : styles.valid
              }`}
            >
              {ticketStatusLabel(ticket.status)}
            </p>
            <p className={styles.code}>{ticket.code}</p>
          </div>
        </article>
      )}
    </main>
  );
}
