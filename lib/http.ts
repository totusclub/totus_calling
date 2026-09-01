// Авторизованные запросы панели агента к voip.totus.club (SECURITY_JWT_PLAN_RU.md, волна 3).
//
// Токены агента (agent-JWT, тот же JWT_SECRET, что у totus_API) выдаёт POST /api/web/login
// и хранит localStorage: webAppToken (access, 12 ч) и webAppRefresh (refresh, 30 д).
// authFetch добавляет `Authorization: Bearer …` ко всем запросам на SERVER_BASE_URL;
// на 401 — один refresh через totus_API /api/auth/refresh и повтор; если не удалось — logout.
import { SERVER_BASE_URL } from './server';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.totus.club';

const TOKEN_KEY = 'webAppToken';
const REFRESH_KEY = 'webAppRefresh';

function hasStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getAccessToken(): string | null {
  if (!hasStorage()) return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (!hasStorage()) return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function storeTokens(accessToken?: string | null, refreshToken?: string | null): void {
  if (!hasStorage()) return;
  if (accessToken) localStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearTokens(): void {
  if (!hasStorage()) return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

// Токен жив? (по exp в payload, без проверки подписи — её делает сервер)
export function isTokenAlive(token: string | null): boolean {
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const resp = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data?.accessToken) return null;
    storeTokens(data.accessToken, data.refreshToken);
    return data.accessToken as string;
  } catch {
    return null;
  }
}

function isVoipUrl(input: RequestInfo | URL): boolean {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  return url.startsWith(SERVER_BASE_URL);
}

export function logoutToLogin(): void {
  clearTokens();
  if (hasStorage()) {
    localStorage.removeItem('webAppUser');
    localStorage.removeItem('webLoyaltyId');
    if (window.location.pathname !== '/login') window.location.href = '/login';
  }
}

// fetch с Bearer для voip.totus.club. Сигнатура совпадает с fetch.
export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  if (!isVoipUrl(input)) return fetch(input, init);

  const withToken = (token: string | null): RequestInit => {
    const headers = new Headers(init.headers || {});
    if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
    return { ...init, headers };
  };

  let resp = await fetch(input, withToken(getAccessToken()));
  if (resp.status !== 401 || !getAccessToken()) return resp;

  // Один refresh на все параллельные 401
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  const nextToken = await refreshPromise;
  if (nextToken) {
    resp = await fetch(input, withToken(nextToken));
    if (resp.status !== 401) return resp;
  }
  logoutToLogin();
  return resp;
}
