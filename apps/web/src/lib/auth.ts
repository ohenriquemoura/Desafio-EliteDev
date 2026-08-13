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

function readRaw(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem(STORAGE_KEY)
  );
}

export function saveSession(session: AuthSession) {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(session);
  localStorage.setItem(STORAGE_KEY, raw);
  sessionStorage.removeItem(STORAGE_KEY);
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
}

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const raw = readRaw();
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as AuthSession;
    // Migra sessão antiga de sessionStorage → localStorage
    if (!localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, raw);
      sessionStorage.removeItem(STORAGE_KEY);
    }
    return session;
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
