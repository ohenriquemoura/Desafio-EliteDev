"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BrandLockup } from "@/components/BrandLockup";
import { apiFetch, ApiError } from "@/lib/api";
import {
  AuthSession,
  getAccessToken,
  getSession,
} from "@/lib/auth";
import { formatDateTime, formatPrice, POSTER_LARGE } from "@/lib/events";
import {
  ReservationItem,
  ReservationStatus,
  reservationStatusLabel,
} from "@/lib/reservations";
import styles from "./reservation-detail.module.css";

const STATUS_CLASS: Record<ReservationStatus, string> = {
  PENDING_PAYMENT: styles.status_PENDING_PAYMENT,
  PAID: styles.status_PAID,
  PAYMENT_FAILED: styles.status_PAYMENT_FAILED,
  CANCELLED: styles.status_CANCELLED,
  EXPIRED: styles.status_EXPIRED,
};

export default function ReservationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [reservation, setReservation] = useState<ReservationItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, params.id]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<ReservationItem>(
        `/reservations/${params.id}`,
        { token: getAccessToken() },
      );
      setReservation(data);
    } catch (err) {
      setReservation(null);
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar a reserva.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function pay(outcome: "approve" | "decline") {
    setPaying(true);
    setError(null);
    setMessage(null);
    try {
      const data = await apiFetch<ReservationItem>(
        `/reservations/${params.id}/pay`,
        {
          method: "POST",
          token: getAccessToken(),
          body: JSON.stringify({ outcome }),
        },
      );
      setReservation(data);
      setMessage(
        outcome === "approve"
          ? "Pagamento aprovado. Ingressos serão emitidos na próxima etapa."
          : "Pagamento recusado. As vagas foram liberadas.",
      );
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível processar o pagamento.",
      );
      void load();
    } finally {
      setPaying(false);
    }
  }

  if (!session) {
    return (
      <main className={styles.main}>
        <p className={styles.meta}>Carregando…</p>
      </main>
    );
  }

  const pending = reservation?.status === "PENDING_PAYMENT";

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <BrandLockup compact />
        <nav className={styles.nav}>
          <Link href="/reservations">Minhas reservas</Link>
          <Link href="/events">Cartaz</Link>
        </nav>
      </header>

      {loading && <p className={styles.meta}>Carregando…</p>}
      {error && <p className={styles.error}>{error}</p>}
      {message && <p className={styles.success}>{message}</p>}

      {reservation && (
        <article className={styles.article}>
          {reservation.event.posterPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`${POSTER_LARGE}${reservation.event.posterPath}`}
              alt=""
              width={220}
              height={330}
              className={styles.poster}
            />
          ) : (
            <div className={styles.posterFallback} aria-hidden />
          )}

          <div className={styles.content}>
            <p className={styles.kicker}>Checkout simulado</p>
            <h1>{reservation.event.title}</h1>
            <p className={styles.meta}>
              {formatDateTime(reservation.event.startsAt)} ·{" "}
              {reservation.event.venue}
            </p>
            <p className={styles.meta}>
              {reservation.quantity} ingresso(s) ·{" "}
              {formatPrice(reservation.amountCents)}
            </p>
            <p className={`${styles.badge} ${STATUS_CLASS[reservation.status]}`}>
              {reservationStatusLabel(reservation.status)}
            </p>

            {pending && reservation.expiresAt && (
              <p className={styles.meta}>
                Reserva válida até {formatDateTime(reservation.expiresAt)}
              </p>
            )}

            {pending ? (
              <div className={styles.payBox}>
                <p className={styles.payLead}>
                  Simule o resultado do pagamento para esta reserva.
                </p>
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.approve}
                    disabled={paying}
                    onClick={() => void pay("approve")}
                  >
                    {paying ? "Processando…" : "Aprovar pagamento"}
                  </button>
                  <button
                    type="button"
                    className={styles.decline}
                    disabled={paying}
                    onClick={() => void pay("decline")}
                  >
                    Recusar pagamento
                  </button>
                </div>
              </div>
            ) : reservation.status === "PAID" ? (
              <p className={styles.hint}>
                Pagamento confirmado. A emissão do QR entra no próximo passo.
              </p>
            ) : (
              <Link href={`/events/${reservation.eventId}`} className={styles.linkCta}>
                Reservar novamente
              </Link>
            )}
          </div>
        </article>
      )}
    </main>
  );
}
