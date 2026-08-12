export type Role = "ORGANIZER" | "CLIENT" | "GATE";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

export type AuthSession = {
  accessToken: string;
  user: AuthUser;
};

const STORAGE_KEY = "elitedev.auth";

export function saveSession(session: AuthSession) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    clearSession();
    return null;
  }
}

export function getAccessToken(): string | null {
  return getSession()?.accessToken ?? null;
}

export function homeForRole(role: Role): string {
  switch (role) {
    case "ORGANIZER":
      return "/organizer";
    case "GATE":
      return "/gate";
    case "CLIENT":
    default:
      return "/events";
  }
}
