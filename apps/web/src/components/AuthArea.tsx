"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLockup } from "@/components/BrandLockup";
import {
  AuthSession,
  clearSession,
  getSession,
} from "@/lib/auth";
import styles from "./area.module.css";

type Props = {
  expectedRole?: AuthSession["user"]["role"];
  title: string;
  description: string;
};

export function AuthArea({ expectedRole, title, description }: Props) {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    const current = getSession();
    if (!current) {
      router.replace("/login");
      return;
    }
    if (expectedRole && current.user.role !== expectedRole) {
      router.replace("/login");
      return;
    }
    setSession(current);
  }, [expectedRole, router]);

  if (!session) {
    return (
      <main className={styles.main}>
        <p className={styles.muted}>Carregando…</p>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <BrandLockup compact />
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.lead}>{description}</p>
      <p className={styles.user}>
        {session.user.name} · {session.user.role} · {session.user.email}
      </p>
      <button
        type="button"
        className={styles.logout}
        onClick={() => {
          clearSession();
          router.replace("/login");
        }}
      >
        Sair
      </button>
    </main>
  );
}
