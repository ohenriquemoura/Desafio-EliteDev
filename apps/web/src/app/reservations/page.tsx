"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLockup } from "@/components/BrandLockup";
import { apiFetch, ApiError } from "@/lib/api";
import {
  AuthSession,
  getAccessToken,
  getSession,
} from "@/lib/auth";
import { formatDateTime, formatPrice, POSTER_BASE } from "@/lib/events";
import {
  ReservationItem,
  ReservationStatus,
  reservationStatusLabel,
} from "@/lib/reservations";
import styles from "./reservations.module.css";

const STATUS_CLASS: Record<ReservationStatus, string> = {
  PENDING_PAYMENT: styles.status_PENDING_PAYMENT,
  PAID: styles.status_PAID,
  PAYMENT_FAILED: styles.status_PAYMENT_FAILED,
  CANCELLED: styles.status_CANCELLED,
  EXPIRED: styles.status_EXPIRED,
};

export default function ReservationsPage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [items, setItems] = useState<ReservationItem[]>([]);
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
      const data = await apiFetch<ReservationItem[]>("/reservations/mine", {
        token: getAccessToken(),
      });
      setItems(data);
    } catch (err) {
      setItems([]);
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar suas reservas.",
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
      <header className={styles.header}>
        <BrandLockup compact />
        <nav className={styles.nav}>
          <Link href="/events">Cartaz</Link>
        </nav>
      </header>

      <section className={styles.hero}>
        <p className={styles.kicker}>Cliente</p>
        <h1 className={styles.title}>Minhas reservas</h1>
        <p className={styles.lead}>
          Acompanhe o status e conclua o pagamento simulado.
        </p>
      </section>

      {loading && <p className={styles.meta}>Carregando…</p>}
      {error && <p className={styles.error}>{error}</p>}

      {!loading && !error && items.length === 0 && (
        <p className={styles.meta}>
          Nenhuma reserva ainda.{" "}
          <Link href="/events" className={styles.inlineLink}>
            Ver cartaz
          </Link>
        </p>
      )}

      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.id}>
            <Link href={`/reservations/${item.id}`} className={styles.card}>
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
                </p>
                <p className={styles.meta}>
                  {item.quantity} ingresso(s) · {formatPrice(item.amountCents)}
                </p>
                <p className={`${styles.badge} ${STATUS_CLASS[item.status]}`}>
                  {reservationStatusLabel(item.status)}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
