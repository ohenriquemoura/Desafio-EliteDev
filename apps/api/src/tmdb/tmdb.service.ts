import {
  Injectable,
  ServiceUnavailableException,
  GatewayTimeoutException,
  BadGatewayException,
} from '@nestjs/common';
import { TmdbMovieList, TmdbMovieSummary } from './tmdb.types';

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

type TmdbApiMovie = {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  release_date?: string;
};

type TmdbApiList = {
  page: number;
  total_pages: number;
  results: TmdbApiMovie[];
};

@Injectable()
export class TmdbService {
  private readonly baseUrl = 'https://api.themoviedb.org/3';
  private readonly timeoutMs = 5_000;
  private readonly cacheTtlMs = 5 * 60_000;
  private readonly cache = new Map<string, CacheEntry<unknown>>();

  async getNowPlaying(page = 1): Promise<TmdbMovieList> {
    const safePage = Math.max(1, page);
    return this.cached(`now-playing:${safePage}`, () =>
      this.requestList(`/movie/now_playing?language=pt-BR&page=${safePage}`),
    );
  }

  async search(query: string, page = 1): Promise<TmdbMovieList> {
    const q = query.trim();
    if (!q) {
      return { page: 1, totalPages: 0, results: [] };
    }

    const safePage = Math.max(1, page);
    const encoded = encodeURIComponent(q);
    return this.cached(`search:${q.toLowerCase()}:${safePage}`, () =>
      this.requestList(
        `/search/movie?language=pt-BR&include_adult=false&page=${safePage}&query=${encoded}`,
      ),
    );
  }

  async getMovie(id: number): Promise<TmdbMovieSummary> {
    return this.cached(`movie:${id}`, async () => {
      const raw = await this.request<TmdbApiMovie>(
        `/movie/${id}?language=pt-BR`,
      );
      return this.mapMovie(raw);
    });
  }

  private async cached<T>(key: string, loader: () => Promise<T>): Promise<T> {
    const hit = this.cache.get(key) as CacheEntry<T> | undefined;
    if (hit && hit.expiresAt > Date.now()) {
      return hit.value;
    }

    const value = await loader();
    this.cache.set(key, { value, expiresAt: Date.now() + this.cacheTtlMs });
    return value;
  }

  private async requestList(path: string): Promise<TmdbMovieList> {
    const raw = await this.request<TmdbApiList>(path);
    return {
      page: raw.page,
      totalPages: raw.total_pages,
      results: (raw.results ?? []).map((movie) => this.mapMovie(movie)),
    };
  }

  private mapMovie(movie: TmdbApiMovie): TmdbMovieSummary {
    return {
      id: movie.id,
      title: movie.title ?? movie.name ?? 'Sem título',
      overview: movie.overview ?? '',
      posterPath: movie.poster_path ?? null,
      releaseDate: movie.release_date || null,
    };
  }

  private getApiKey(): string {
    const key = process.env.TMDB_API_KEY?.trim();
    if (!key) {
      throw new ServiceUnavailableException(
        'TMDB_API_KEY não configurada. Obtenha em https://www.themoviedb.org/settings/api e defina no .env',
      );
    }
    return key;
  }

  private async request<T>(path: string): Promise<T> {
    const apiKey = this.getApiKey();
    const url = `${this.baseUrl}${path}${path.includes('?') ? '&' : '?'}api_key=${apiKey}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new BadGatewayException(
          `TMDb respondeu com status ${response.status}`,
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new GatewayTimeoutException('Timeout ao consultar o TMDb');
      }
      if (
        error instanceof ServiceUnavailableException ||
        error instanceof BadGatewayException ||
        error instanceof GatewayTimeoutException
      ) {
        throw error;
      }
      throw new BadGatewayException('Falha ao consultar o TMDb');
    } finally {
      clearTimeout(timer);
    }
  }
}
