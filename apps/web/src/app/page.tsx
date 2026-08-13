"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandLockup } from "@/components/BrandLockup";
import {
  AuthSession,
  clearSession,
  getSession,
  homeForRole,
} from "@/lib/auth";
import styles from "./page.module.css";

export default function Home() {
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    setSession(getSession());
  }, []);

  function logout() {
    clearSession();
    setSession(null);
  }

  const roleHome = session ? homeForRole(session.user.role) : "/login";
  const secondaryHref =
    session?.user.role === "CLIENT"
      ? "/tickets"
      : session
        ? roleHome
        : "/login";
  const secondaryLabel =
    session?.user.role === "CLIENT"
      ? "Meus ingressos"
      : session?.user.role === "ORGANIZER"
        ? "Área do organizador"
        : session?.user.role === "GATE"
          ? "Portaria"
          : "Área do organizador";

  return (
    <main className={styles.hero}>
      <div className={styles.overlay} />
      <header className={styles.top}>
        <BrandLockup />
        {session ? (
          <button type="button" className={styles.topLinkBtn} onClick={logout}>
            Sair
          </button>
        ) : (
          <Link className={styles.topLink} href="/login">
            Entrar
          </Link>
        )}
      </header>

      <section className={styles.content}>
        <p className={styles.kicker}>Cinema · Shows · Ingressos</p>
        <h1 className={styles.title}>
          A sessão começa
          <span> no Elite Dev</span>
        </h1>
        <p className={styles.lead}>
          {session
            ? `Olá, ${session.user.name}. Continue de onde parou — sua sessão segue ativa.`
            : "Monte eventos a partir do catálogo, reserve na pista e valide na portaria — do cartaz ao QR."}
        </p>
        <div className={styles.actions}>
          <Link
            className={styles.cta}
            href={session?.user.role === "CLIENT" ? "/events" : roleHome}
          >
            {session?.user.role === "ORGANIZER"
              ? "Ir para organizador"
              : session?.user.role === "GATE"
                ? "Ir para portaria"
                : "Comprar ingresso"}
          </Link>
          <Link className={styles.secondary} href={secondaryHref}>
            {secondaryLabel}
          </Link>
        </div>
      </section>
    </main>
  );
}
