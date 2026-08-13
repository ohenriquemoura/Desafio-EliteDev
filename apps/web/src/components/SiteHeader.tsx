"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLockup } from "@/components/BrandLockup";
import {
  AuthSession,
  clearSession,
  getSession,
  homeForRole,
} from "@/lib/auth";
import styles from "./SiteHeader.module.css";

type Props = {
  showClientLinks?: boolean;
};

export function SiteHeader({ showClientLinks = false }: Props) {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    setSession(getSession());
  }, []);

  function logout() {
    clearSession();
    setSession(null);
    router.replace("/");
  }

  return (
    <header className={styles.header}>
      <BrandLockup compact />
      <nav className={styles.nav}>
        <Link href="/events">Cartaz</Link>
        {session?.user.role === "CLIENT" && showClientLinks && (
          <>
            <Link href="/tickets">Ingressos</Link>
            <Link href="/reservations">Reservas</Link>
          </>
        )}
        {session ? (
          <>
            {session.user.role !== "CLIENT" && (
              <Link href={homeForRole(session.user.role)}>Minha área</Link>
            )}
            <button type="button" className={styles.logout} onClick={logout}>
              Sair
            </button>
          </>
        ) : (
          <Link href="/login">Entrar</Link>
        )}
      </nav>
    </header>
  );
}
