export type TmdbMovieSummary = {
  id: number;
  title: string;
  overview: string;
  posterPath: string | null;
  releaseDate: string | null;
};

export type TmdbMovieList = {
  page: number;
  totalPages: number;
  results: TmdbMovieSummary[];
};
