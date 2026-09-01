// Authentication API service for web app
import {SERVER_BASE_URL} from './server';
import { storeTokens, clearTokens, getAccessToken, isTokenAlive } from './http';

const BASE_URL = SERVER_BASE_URL;

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface User {
  id: number;
  loyaltyId: string;
  name: string | null;
  fName: string | null;
  lName: string | null;
  email: string | null;
  phone: string | null;
  role: string;
}

export interface LoginResponse {
  ok: boolean;
  user: User;
  // agent-JWT (SECURITY_JWT_PLAN_RU.md, волна 3); отсутствуют, пока на сервере не задан JWT_SECRET
  accessToken?: string;
  refreshToken?: string;
}

// Login user (only agents can login)
export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  try {
    const response = await fetch(`${BASE_URL}/api/web/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data: LoginResponse = await response.json();
    if (data?.ok) {
      storeTokens(data.accessToken, data.refreshToken);
    }
    return data;
  } catch (error: any) {
    console.error('Login error:', error);
    throw error;
  }
}

// Get stored user from localStorage
export function getStoredUser(): User | null {
  try {
    const userStr = localStorage.getItem('webAppUser');
    if (!userStr) return null;
    return JSON.parse(userStr);
  } catch (error) {
    console.error('Error getting stored user:', error);
    return null;
  }
}

// Store user in localStorage
export function storeUser(user: User): void {
  localStorage.setItem('webAppUser', JSON.stringify(user));
}

// Remove user from localStorage (logout)
export function removeUser(): void {
  localStorage.removeItem('webAppUser');
  localStorage.removeItem('webLoyaltyId');
  clearTokens();
}

// Check if user is authenticated
// Если сервер выдал токен — сессия жива, пока жив access-токен (или есть refresh);
// без токена (старый бэкенд) — как раньше, по сохранённому пользователю.
export function isAuthenticated(): boolean {
  const user = getStoredUser();
  if (user === null || user.role !== 'agent') return false;
  const token = getAccessToken();
  if (token && !isTokenAlive(token) && !localStorage.getItem('webAppRefresh')) return false;
  return true;
}
