"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLockup } from "@/components/BrandLockup";
import { apiFetch, ApiError } from "@/lib/api";
import {
  AuthSession,
  getSession,
  homeForRole,
  saveSession,
} from "@/lib/auth";
import styles from "./login.module.css";

type Mode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (session) {
      router.replace(homeForRole(session.user.role));
    }
  }, [router]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const path = mode === "login" ? "/auth/login" : "/auth/register";
      const body =
        mode === "login"
          ? { email, password }
          : { name, email, password };

      const session = await apiFetch<AuthSession>(path, {
        method: "POST",
        body: JSON.stringify(body),
      });

      saveSession(session);
      router.replace(homeForRole(session.user.role));
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Não foi possível autenticar. Tente de novo.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.main}>
      <BrandLockup compact />
      <h1 className={styles.title}>
        {mode === "login" ? "Entrar" : "Criar conta"}
      </h1>
      <p className={styles.lead}>
        {mode === "login"
          ? "Use uma das contas seed ou a sua conta de cliente."
          : "Cadastro público apenas para clientes."}
      </p>

      <form className={styles.form} onSubmit={onSubmit}>
        {mode === "register" && (
          <label className={styles.field}>
            <span>Nome</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
              minLength={2}
            />
          </label>
        )}

        <label className={styles.field}>
          <span>E-mail</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>

        <label className={styles.field}>
          <span>Senha</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            required
            minLength={6}
          />
        </label>

        {error && <p className={styles.error}>{error}</p>}

        <button className={styles.submit} type="submit" disabled={loading}>
          {loading
            ? "Aguarde…"
            : mode === "login"
              ? "Entrar"
              : "Criar conta"}
        </button>
      </form>

      <p className={styles.switch}>
        {mode === "login" ? (
          <>
            Novo por aqui?{" "}
            <button type="button" onClick={() => setMode("register")}>
              Criar conta de cliente
            </button>
          </>
        ) : (
          <>
            Já tem conta?{" "}
            <button type="button" onClick={() => setMode("login")}>
              Entrar
            </button>
          </>
        )}
      </p>

      <aside className={styles.hint}>
        <p>Contas demo (senha <code>Demo@2026</code>):</p>
        <ul>
          <li>organizer@elitedev.local</li>
          <li>client1@elitedev.local</li>
          <li>gate@elitedev.local</li>
        </ul>
      </aside>
    </main>
  );
}
