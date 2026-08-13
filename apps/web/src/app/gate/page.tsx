"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Html5Qrcode } from "html5-qrcode";
import { BrandLockup } from "@/components/BrandLockup";
import { apiFetch, ApiError } from "@/lib/api";
import {
  AuthSession,
  clearSession,
  getAccessToken,
  getSession,
} from "@/lib/auth";
import { EventItem, formatDateTime } from "@/lib/events";
import {
  GateResult,
  GateValidation,
  gateResultLabel,
} from "@/lib/gate";
import styles from "./gate.module.css";

const RESULT_CLASS: Record<GateResult, string> = {
  VALID: styles.resultValid,
  ALREADY_USED: styles.resultUsed,
  INVALID: styles.resultInvalid,
  WRONG_EVENT: styles.resultWrong,
};

export default function GatePage() {
  const router = useRouter();
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrRef = useRef<Html5Qrcode | null>(null);
  const lastScanRef = useRef<string>("");
  const validatingRef = useRef(false);

  const [session, setSession] = useState<AuthSession | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventId, setEventId] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GateValidation | null>(null);

  useEffect(() => {
    const current = getSession();
    if (!current || current.user.role !== "GATE") {
      router.replace("/login");
      return;
    }
    setSession(current);
  }, [router]);

  useEffect(() => {
    if (!session) return;
    void loadEvents();
  }, [session]);

  useEffect(() => {
    return () => {
      void stopCamera();
    };
  }, []);

  useEffect(() => {
    if (!cameraOn || !eventId) return;
    void startCamera();
    return () => {
      void stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOn, eventId]);

  async function loadEvents() {
    setLoadingEvents(true);
    setError(null);
    try {
      const data = await apiFetch<EventItem[]>("/events");
      setEvents(data);
      if (data[0]) setEventId(data[0].id);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar os eventos.",
      );
    } finally {
      setLoadingEvents(false);
    }
  }

  async function stopCamera() {
    const scanner = html5QrRef.current;
    html5QrRef.current = null;
    if (!scanner) return;
    try {
      await scanner.stop();
      scanner.clear();
    } catch {
      // câmera já encerrada
    }
  }

  async function startCamera() {
    setCameraError(null);
    if (!scannerRef.current || !eventId) return;

    await stopCamera();

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode(scannerRef.current.id);
      html5QrRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 8, qrbox: { width: 240, height: 240 } },
        (decoded) => {
          void onCodeDetected(decoded);
        },
        () => {
          // frame sem QR
        },
      );
    } catch {
      setCameraError(
        "Não foi possível acessar a câmera. Use a digitação manual.",
      );
      setCameraOn(false);
    }
  }

  async function onCodeDetected(code: string) {
    const trimmed = code.trim();
    if (!trimmed || !eventId) return;
    if (validatingRef.current) return;
    if (lastScanRef.current === trimmed && result?.result === "VALID") return;

    lastScanRef.current = trimmed;
    setManualCode(trimmed);
    await validateCode(trimmed);
  }

  async function validateCode(code: string) {
    if (!eventId) {
      setError("Selecione o evento da sessão.");
      return;
    }

    validatingRef.current = true;
    setValidating(true);
    setError(null);
    try {
      const data = await apiFetch<GateValidation>("/gate/validate", {
        method: "POST",
        token: getAccessToken(),
        body: JSON.stringify({ eventId, code: code.trim() }),
      });
      setResult(data);
    } catch (err) {
      setResult(null);
      setError(
        err instanceof ApiError
          ? err.message
          : "Falha ao validar o ingresso.",
      );
    } finally {
      setValidating(false);
      window.setTimeout(() => {
        validatingRef.current = false;
      }, 1200);
    }
  }

  async function onManualSubmit(event: FormEvent) {
    event.preventDefault();
    if (!manualCode.trim()) return;
    await validateCode(manualCode);
  }

  if (!session) {
    return (
      <main className={styles.main}>
        <p className={styles.meta}>Carregando…</p>
      </main>
    );
  }

  const selected = events.find((item) => item.id === eventId) ?? null;

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <BrandLockup compact />
          <h1 className={styles.title}>Portaria</h1>
          <p className={styles.user}>
            {session.user.name} · {session.user.email}
          </p>
        </div>
        <button
          type="button"
          className={styles.logout}
          onClick={() => {
            void stopCamera();
            clearSession();
            router.replace("/");
          }}
        >
          Sair
        </button>
      </header>

      <section className={styles.panel}>
        <label className={styles.field}>
          <span>Evento da sessão</span>
          <select
            value={eventId}
            disabled={loadingEvents || events.length === 0}
            onChange={(e) => {
              setEventId(e.target.value);
              setResult(null);
              lastScanRef.current = "";
            }}
          >
            {events.length === 0 && <option value="">Nenhum evento</option>}
            {events.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title} — {formatDateTime(item.startsAt)}
              </option>
            ))}
          </select>
        </label>

        {selected && (
          <p className={styles.meta}>
            {selected.venue} · {selected.availableSeats} vagas restantes
          </p>
        )}
      </section>

      <section className={styles.scanSection}>
        <div className={styles.scanHeader}>
          <h2>Leitura por câmera</h2>
          <button
            type="button"
            className={styles.secondary}
            disabled={!eventId}
            onClick={() => setCameraOn((on) => !on)}
          >
            {cameraOn ? "Parar câmera" : "Abrir câmera"}
          </button>
        </div>

        {cameraError && <p className={styles.error}>{cameraError}</p>}

        <div
          id="gate-qr-reader"
          ref={scannerRef}
          className={`${styles.scanner} ${cameraOn ? styles.scannerActive : ""}`}
        />

        {!cameraOn && (
          <p className={styles.meta}>
            A câmera é opcional — você também pode digitar o código.
          </p>
        )}
      </section>

      <form className={styles.manual} onSubmit={onManualSubmit}>
        <label className={styles.field}>
          <span>Código do ingresso</span>
          <input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="ED.uuid.evento.assinatura"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <button
          type="submit"
          className={styles.primary}
          disabled={validating || !eventId || !manualCode.trim()}
        >
          {validating ? "Validando…" : "Validar código"}
        </button>
      </form>

      {error && <p className={styles.error}>{error}</p>}

      {result && (
        <section
          className={`${styles.result} ${RESULT_CLASS[result.result]}`}
          aria-live="polite"
        >
          <p className={styles.resultLabel}>
            {gateResultLabel(result.result)}
          </p>
          <p className={styles.resultMessage}>{result.message}</p>
          {result.eventTitle && (
            <p className={styles.meta}>{result.eventTitle}</p>
          )}
          {result.seatLabel && (
            <p className={styles.seatResult}>Cadeira {result.seatLabel}</p>
          )}
          {result.venue && <p className={styles.meta}>{result.venue}</p>}
        </section>
      )}
    </main>
  );
}
