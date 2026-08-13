"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { apiFetch, ApiError } from "@/lib/api";
import {
  AuthSession,
  getAccessToken,
  getSession,
} from "@/lib/auth";
import { formatDateTime, POSTER_BASE } from "@/lib/events";
import { TicketItem, ticketStatusLabel } from "@/lib/tickets";
import styles from "./tickets.module.css";

export default function TicketsPage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [items, setItems] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const current = getSession();
    if (!current || current.user.role !== "CLIENT") {
      router.replace("/login");
      return;
    }
    setSession(current);
  }, [router]);

  useEffect(() => {
    if (!session) return;
    void load();
  }, [session]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<TicketItem[]>("/tickets/mine", {
        token: getAccessToken(),
      });
      setItems(data);
    } catch (err) {
      setItems([]);
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar os ingressos.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!session) {
    return (
      <main className={styles.main}>
        <p className={styles.meta}>Carregando…</p>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <SiteHeader showClientLinks />

      <section className={styles.hero}>
        <p className={styles.kicker}>Cliente</p>
        <h1 className={styles.title}>Meus ingressos</h1>
        <p className={styles.lead}>
          QR para a portaria e link de compartilhamento.
        </p>
      </section>

      {loading && <p className={styles.meta}>Carregando…</p>}
      {error && <p className={styles.error}>{error}</p>}

      {!loading && !error && items.length === 0 && (
        <p className={styles.meta}>
          Nenhum ingresso ainda.{" "}
          <Link href="/events" className={styles.inlineLink}>
            Ver cartaz
          </Link>
        </p>
      )}

      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.id}>
            <Link href={`/tickets/${item.id}`} className={styles.card}>
              {item.event.posterPath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`${POSTER_BASE}${item.event.posterPath}`}
                  alt=""
                  width={74}
                  height={111}
                />
              ) : (
                <div className={styles.posterFallback} aria-hidden />
              )}
              <div>
                <h2>{item.event.title}</h2>
                <p className={styles.meta}>
                  {formatDateTime(item.event.startsAt)} · {item.event.venue}
                  {item.seatLabel ? ` · Cadeira ${item.seatLabel}` : ""}
                </p>
                <p
                  className={`${styles.badge} ${
                    item.status === "USED" ? styles.used : styles.valid
                  }`}
                >
                  {ticketStatusLabel(item.status)}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
