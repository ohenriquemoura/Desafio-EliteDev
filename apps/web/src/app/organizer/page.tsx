"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLockup } from "@/components/BrandLockup";
import { apiFetch, ApiError } from "@/lib/api";
import {
  AuthSession,
  clearSession,
  getAccessToken,
  getSession,
} from "@/lib/auth";
import styles from "./organizer.module.css";

type TmdbMovie = {
  id: number;
  title: string;
  overview: string;
  posterPath: string | null;
  releaseDate: string | null;
};

type TmdbList = {
  page: number;
  totalPages: number;
  results: TmdbMovie[];
};

const POSTER_BASE = "https://image.tmdb.org/t/p/w185";

export default function OrganizerPage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [query, setQuery] = useState("");
  const [movies, setMovies] = useState<TmdbMovie[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"now-playing" | "search">("now-playing");

  useEffect(() => {
    const current = getSession();
    if (!current || current.user.role !== "ORGANIZER") {
      router.replace("/login");
      return;
    }
    setSession(current);
  }, [router]);

  useEffect(() => {
    if (!session) return;
    void loadNowPlaying();
  }, [session]);

  async function loadNowPlaying() {
    setLoading(true);
    setError(null);
    setMode("now-playing");
    try {
      const data = await apiFetch<TmdbList>("/tmdb/now-playing", {
        token: getAccessToken(),
      });
      setMovies(data.results);
    } catch (err) {
      setMovies([]);
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar os filmes.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function onSearch(event: FormEvent) {
    event.preventDefault();
    if (!query.trim()) {
      await loadNowPlaying();
      return;
    }

    setLoading(true);
    setError(null);
    setMode("search");
    try {
      const data = await apiFetch<TmdbList>(
        `/tmdb/search?q=${encodeURIComponent(query.trim())}`,
        { token: getAccessToken() },
      );
      setMovies(data.results);
    } catch (err) {
      setMovies([]);
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível buscar no TMDb.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!session) {
    return (
      <main className={styles.main}>
        <p className={styles.muted}>Carregando…</p>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <BrandLockup compact />
          <h1 className={styles.title}>Área do organizador</h1>
          <p className={styles.lead}>
            Catálogo TMDb — em seguida você cria o evento a partir de um filme.
          </p>
          <p className={styles.user}>
            {session.user.name} · {session.user.email}
          </p>
        </div>
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
      </header>

      <form className={styles.search} onSubmit={onSearch}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar filme no TMDb"
          aria-label="Buscar filme"
        />
        <button type="submit" disabled={loading}>
          Buscar
        </button>
        <button type="button" onClick={() => void loadNowPlaying()} disabled={loading}>
          Em cartaz
        </button>
      </form>

      <p className={styles.meta}>
        {loading
          ? "Consultando TMDb…"
          : mode === "search"
            ? `Resultados para “${query.trim()}”`
            : "Filmes em cartaz"}
      </p>

      {error && <p className={styles.error}>{error}</p>}

      <ul className={styles.list}>
        {movies.map((movie) => (
          <li key={movie.id} className={styles.item}>
            {movie.posterPath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`${POSTER_BASE}${movie.posterPath}`}
                alt=""
                width={74}
                height={111}
              />
            ) : (
              <div className={styles.posterFallback} aria-hidden />
            )}
            <div>
              <h2>{movie.title}</h2>
              {movie.releaseDate && (
                <p className={styles.date}>{movie.releaseDate}</p>
              )}
              <p className={styles.overview}>
                {movie.overview || "Sem sinopse."}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
