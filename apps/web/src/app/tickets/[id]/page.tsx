"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { TicketQr } from "@/components/TicketQr";
import { apiFetch, ApiError } from "@/lib/api";
import {
  AuthSession,
  getAccessToken,
  getSession,
} from "@/lib/auth";
import { formatDateTime } from "@/lib/events";
import { TicketItem, ticketStatusLabel } from "@/lib/tickets";
import styles from "./ticket-detail.module.css";

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [ticket, setTicket] = useState<TicketItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
      const data = await apiFetch<TicketItem>(`/tickets/${params.id}`, {
        token: getAccessToken(),
      });
      setTicket(data);
    } catch (err) {
      setTicket(null);
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar o ingresso.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function copyShareLink() {
    if (!ticket) return;
    const url = `${window.location.origin}/share/${ticket.shareToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Não foi possível copiar o link.");
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

      {loading && <p className={styles.meta}>Carregando…</p>}
      {error && <p className={styles.error}>{error}</p>}

      {ticket && (
        <article className={styles.article}>
          <div className={styles.qrPanel}>
            <TicketQr value={ticket.code} />
            <p className={styles.codeLabel}>Código do ingresso</p>
            <p className={styles.code}>{ticket.code}</p>
          </div>

          <div className={styles.content}>
            <p className={styles.kicker}>Ingresso</p>
            <h1>{ticket.event.title}</h1>
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

            <div className={styles.shareBox}>
              <p className={styles.shareLead}>
                Compartilhe só a visualização do QR (sem acessar sua conta).
              </p>
              <button
                type="button"
                className={styles.shareButton}
                onClick={() => void copyShareLink()}
              >
                {copied ? "Link copiado" : "Copiar link de compartilhamento"}
              </button>
              <Link
                href={`/share/${ticket.shareToken}`}
                className={styles.sharePreview}
                target="_blank"
              >
                Abrir página pública
              </Link>
            </div>
          </div>
        </article>
      )}
    </main>
  );
}
