"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLockup } from "@/components/BrandLockup";
import { apiFetch, ApiError } from "@/lib/api";
import {
  AuthSession,
  clearSession,
  getAccessToken,
  getSession,
} from "@/lib/auth";
import {
  EventItem,
  POSTER_BASE,
  POSTER_LARGE,
  formatDateTime,
  formatPrice,
} from "@/lib/events";
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

type ViewMode = "carousel" | "list";

function defaultStartsAt() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  date.setHours(20, 0, 0, 0);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export default function OrganizerPage() {
  const router = useRouter();
  const carouselRef = useRef<HTMLUListElement>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [query, setQuery] = useState("");
  const [movies, setMovies] = useState<TmdbMovie[]>([]);
  const [myEvents, setMyEvents] = useState<EventItem[]>([]);
  const [selected, setSelected] = useState<TmdbMovie | null>(null);
  const [myEventsOpen, setMyEventsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("carousel");
  const [venue, setVenue] = useState("Cine Elite — Sala 1, São Paulo");
  const [startsAt, setStartsAt] = useState(defaultStartsAt());
  const [capacity, setCapacity] = useState(100);
  const [priceReais, setPriceReais] = useState("45.00");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
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
    void loadMine();
  }, [session]);

  useEffect(() => {
    if (!selected) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelected(null);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selected]);

  async function loadMine() {
    try {
      const data = await apiFetch<EventItem[]>("/events/mine", {
        token: getAccessToken(),
      });
      setMyEvents(data);
    } catch {
      // silencioso no primeiro load
    }
  }

  async function loadNowPlaying() {
    setLoading(true);
    setError(null);
    setMode("now-playing");
    setViewMode("carousel");
    setQuery("");
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
    setViewMode("list");
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

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;

    const priceCents = Math.round(Number(priceReais.replace(",", ".")) * 100);
    if (!Number.isFinite(priceCents) || priceCents < 0) {
      setError("Preço inválido.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const created = await apiFetch<EventItem>("/events", {
        method: "POST",
        token: getAccessToken(),
        body: JSON.stringify({
          tmdbMovieId: selected.id,
          venue,
          startsAt: new Date(startsAt).toISOString(),
          capacity,
          priceCents,
          status: "PUBLISHED",
        }),
      });
      setSuccess(`Evento “${created.title}” publicado.`);
      setSelected(null);
      await loadMine();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível criar o evento.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function publishDraft(id: string) {
    try {
      await apiFetch(`/events/${id}`, {
        method: "PATCH",
        token: getAccessToken(),
        body: JSON.stringify({ status: "PUBLISHED" }),
      });
      await loadMine();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível publicar o evento.",
      );
    }
  }

  function openCreate(movie: TmdbMovie) {
    setSelected(movie);
    setSuccess(null);
    setError(null);
  }

  function scrollCarousel(direction: -1 | 1) {
    const node = carouselRef.current;
    if (!node) return;
    const amount = Math.round(node.clientWidth * 0.85);
    node.scrollBy({ left: direction * amount, behavior: "smooth" });
  }

  function toggleViewMode() {
    setViewMode((current) => (current === "carousel" ? "list" : "carousel"));
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
        </div>
        <div className={styles.headerActions}>
          <Link href="/events" className={styles.linkButton}>
            Ver cartaz
          </Link>
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
        </div>
      </header>

      <section className={styles.section}>
        <button
          type="button"
          className={styles.sectionToggle}
          onClick={() => setMyEventsOpen((open) => !open)}
          aria-expanded={myEventsOpen}
        >
          <h2 className={styles.sectionTitle}>Meus eventos</h2>
          <span className={styles.chevron} aria-hidden>
            {myEventsOpen ? (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                <path
                  d="M6 14.5 12 8.5l6 6"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                <path
                  d="M6 9.5 12 15.5l6-6"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
        </button>

        {myEventsOpen &&
          (myEvents.length === 0 ? (
            <p className={styles.muted}>Nenhum evento criado ainda.</p>
          ) : (
            <ul className={styles.myList}>
              {myEvents.map((event) => (
                <li key={event.id} className={styles.myItem}>
                  <div>
                    <strong>{event.title}</strong>
                    <p>
                      {formatDateTime(event.startsAt)} · {event.venue}
                    </p>
                    <p>
                      {formatPrice(event.priceCents)} · {event.availableSeats}/
                      {event.capacity} vagas · {event.status}
                    </p>
                  </div>
                  <div className={styles.myActions}>
                    {event.status === "PUBLISHED" ? (
                      <Link href={`/events/${event.id}`}>Abrir</Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void publishDraft(event.id)}
                      >
                        Publicar
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ))}
      </section>

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
      </form>

      <div className={styles.catalogHeader}>
        <h2 className={styles.catalogTitle}>
          {loading
            ? "Consultando TMDb…"
            : mode === "search"
              ? `Resultados para “${query.trim()}”`
              : "Em cartaz"}
        </h2>
        {movies.length > 0 && (
          <button
            type="button"
            className={styles.viewAll}
            onClick={toggleViewMode}
          >
            Mudar visualização
          </button>
        )}
      </div>

      {error && !selected && <p className={styles.error}>{error}</p>}
      {success && <p className={styles.success}>{success}</p>}

      {!loading && movies.length > 0 && viewMode === "carousel" && (
        <section className={styles.carouselSection} aria-label="Filmes em cartaz">
          <button
            type="button"
            className={`${styles.carouselArrow} ${styles.carouselArrowLeft}`}
            aria-label="Filmes anteriores"
            onClick={() => scrollCarousel(-1)}
          >
            ‹
          </button>

          <ul className={styles.carousel} ref={carouselRef}>
            {movies.map((movie) => (
              <li key={movie.id} className={styles.carouselItem}>
                <article className={styles.carouselCard}>
                  <div className={styles.posterWrap}>
                    {movie.posterPath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`${POSTER_LARGE}${movie.posterPath}`}
                        alt={movie.title}
                      />
                    ) : (
                      <div className={styles.carouselFallback} aria-hidden />
                    )}
                    <div className={styles.posterOverlay}>
                      <button
                        type="button"
                        className={styles.selectButton}
                        onClick={() => openCreate(movie)}
                      >
                        Criar evento
                      </button>
                    </div>
                  </div>
                  <h3 className={styles.carouselTitle}>{movie.title}</h3>
                </article>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className={`${styles.carouselArrow} ${styles.carouselArrowRight}`}
            aria-label="Próximos filmes"
            onClick={() => scrollCarousel(1)}
          >
            ›
          </button>
        </section>
      )}

      {!loading && movies.length > 0 && viewMode === "list" && (
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
                <button
                  type="button"
                  className={styles.selectButton}
                  onClick={() => openCreate(movie)}
                >
                  Criar evento
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div
          className={styles.modalOverlay}
          onClick={() => setSelected(null)}
          role="presentation"
        >
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-event-title"
            onClick={(event) => event.stopPropagation()}
          >
            <form className={styles.createForm} onSubmit={onCreate}>
              <div className={styles.modalHeader}>
                <h2 id="create-event-title" className={styles.sectionTitle}>
                  Publicar: {selected.title}
                </h2>
                <button
                  type="button"
                  className={styles.modalClose}
                  onClick={() => setSelected(null)}
                  aria-label="Fechar"
                >
                  ×
                </button>
              </div>

              {error && <p className={styles.error}>{error}</p>}

              <label className={styles.field}>
                <span>Local</span>
                <input
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  required
                  minLength={2}
                />
              </label>
              <label className={styles.field}>
                <span>Data e hora</span>
                <input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  required
                />
              </label>
              <label className={styles.field}>
                <span>Capacidade</span>
                <input
                  type="number"
                  min={1}
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  required
                />
              </label>
              <label className={styles.field}>
                <span>Preço (R$)</span>
                <input
                  value={priceReais}
                  onChange={(e) => setPriceReais(e.target.value)}
                  required
                />
              </label>
              <div className={styles.formActions}>
                <button type="submit" disabled={saving}>
                  {saving ? "Publicando…" : "Publicar evento"}
                </button>
                <button type="button" onClick={() => setSelected(null)}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
