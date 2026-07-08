// Orders API service for the web admin panel.
// NOTE: orders live on the main API server (api.totus.club), the same server the
// mobile app uses for /orders and /user/orders. This is intentionally separate
// from the VoIP server (voip.totus.club) used for users/calling.
import { getAllUsers, type User } from './users-api';

// export const ORDERS_BASE_URL = 'http://192.168.1.100:4444';
export const ORDERS_BASE_URL = 'https://api.totus.club';

export interface Order {
  id: number;
  order_id?: number | string;
  user_id?: number;
  package?: any;
  pay_status?: string;
  c_date?: number | string;
  state?: string;
  [key: string]: any;
}

// An order enriched with the owning user (used in the "all orders" admin view)
export interface OrderWithUser extends Order {
  _user?: User | null;
}

// ---- API calls (read-only, existing endpoints only) ----

// GET /user/orders?user_id=ID
export async function getUserOrders(userId: number): Promise<Order[]> {
  const response = await fetch(`${ORDERS_BASE_URL}/user/orders?user_id=${encodeURIComponent(String(userId))}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch user orders: ${response.status}`);
  }
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

// GET /orders?order_id=ID
export async function getOrder(orderId: number | string): Promise<Order> {
  const response = await fetch(`${ORDERS_BASE_URL}/orders?order_id=${encodeURIComponent(String(orderId))}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch order: ${response.status}`);
  }
  return response.json();
}

// GET /orders/documents?order_id=ID
export async function getOrderDocuments(orderId: number | string): Promise<Array<{ name?: string; url: string }>> {
  try {
    const response = await fetch(`${ORDERS_BASE_URL}/orders/documents?order_id=${encodeURIComponent(String(orderId))}`);
    if (!response.ok) return [];
    const data = await response.json();
    const docs = data?.documents || [];
    return docs.map((d: any) => ({
      name: d.title || d.name,
      url: resolveDocUrl(d.public_url || d.url || d.source_url),
    }));
  } catch {
    return [];
  }
}

// Extract the per-order Level Travel auth token stored on the order/package.
export function getOrderAuthToken(order?: Order): string | null {
  if (!order) return null;
  const o: any = order;
  const pkg = o.package || {};
  const candidate =
    o.lt_auth_token ||
    pkg._lt_auth_token ||
    pkg.auth_token ||
    pkg.client?.auth_token ||
    pkg.package?._lt_auth_token ||
    null;
  const token = String(candidate || '').trim();
  return token || null;
}

// Resolve a document/attachment URL to an absolute URL (server stores relative /uploads paths).
export function resolveDocUrl(url?: string): string {
  if (!url) return '';
  let value = String(url).trim();
  if (value.startsWith('//')) return `https:${value}`;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/')) return `${ORDERS_BASE_URL}${value}`;
  return value;
}

// GET /client/orders?auth_token=...&page_number=&page_limit= — list of a client's
// orders straight from Level Travel.
export async function getClientOrders(
  authToken: string,
  pageNumber = 0,
  pageLimit = 10
): Promise<{ orders: any[]; raw: any }> {
  const params = new URLSearchParams({
    auth_token: authToken,
    page_number: String(pageNumber),
    page_limit: String(pageLimit),
  });
  const response = await fetch(`${ORDERS_BASE_URL}/client/orders?${params.toString()}`);
  const data = await response.json();
  if (!response.ok || data?.error) {
    throw new Error(data?.error || `Failed to fetch Level Travel orders: ${response.status}`);
  }
  const orders =
    data?.orders || data?.data?.orders || (Array.isArray(data) ? data : []) || [];
  return { orders, raw: data };
}

// GET /client/orders/:id?auth_token=...&save=0 — live full order data from Level Travel.
// Returns the parsed LT order object (with attachments, documents, full tour data).
export async function getClientOrder(
  orderId: number | string,
  authToken: string,
  save = false
): Promise<any> {
  const params = new URLSearchParams({ auth_token: authToken, save: save ? '1' : '0' });
  const response = await fetch(
    `${ORDERS_BASE_URL}/client/orders/${encodeURIComponent(String(orderId))}?${params.toString()}`
  );
  const data = await response.json();
  if (!response.ok || data?.error) {
    throw new Error(data?.error || `Failed to fetch Level Travel order: ${response.status}`);
  }
  // The endpoint returns the raw LT response (often { success, order: {...} }).
  return data?.order || data?.data?.order || data;
}

// Collect documents/attachments from a Level Travel order object.
export function collectLtDocuments(ltOrder: any): Array<{ name: string; url: string }> {
  if (!ltOrder) return [];
  const docs: Array<{ name: string; url: string }> = [];
  const push = (name: string, url?: string) => {
    const resolved = resolveDocUrl(url);
    if (resolved) docs.push({ name, url: resolved });
  };

  if (Array.isArray(ltOrder.attachments)) {
    ltOrder.attachments.forEach((a: any, i: number) => push(a?.title || `Документ ${i + 1}`, a?.url));
  }
  if (Array.isArray(ltOrder.saved_documents)) {
    ltOrder.saved_documents.forEach((a: any, i: number) => push(a?.title || `Документ ${i + 1}`, a?.url));
  }
  push('Договор оферты.pdf', ltOrder.agreement_doc);
  push('Лицензионный договор.pdf', ltOrder.agreement_license);

  // De-duplicate by url
  const seen = new Set<string>();
  return docs.filter((d) => {
    if (seen.has(d.url)) return false;
    seen.add(d.url);
    return true;
  });
}

// Aggregate ALL orders across all users using only existing endpoints.
// We fetch the user list, then request each user's orders in small concurrent
// batches and flatten the result.
export async function getAllOrders(): Promise<OrderWithUser[]> {
  const users = await getAllUsers();
  const all: OrderWithUser[] = [];
  const batchSize = 8;

  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (user) => {
        try {
          const orders = await getUserOrders(user.id);
          return orders.map((o) => ({ ...o, _user: user }));
        } catch {
          return [] as OrderWithUser[];
        }
      })
    );
    results.forEach((arr) => all.push(...arr));
  }

  // Sort newest first by created date when available, otherwise by order id.
  all.sort((a, b) => orderTimestamp(b) - orderTimestamp(a));
  return all;
}

// ---- Helpers (ported from the mobile app's ordersUtils) ----

const priceFormatter = new Intl.NumberFormat('ru-RU');

export function formatPrice(value?: number | string): string {
  const num = typeof value === 'number' ? value : Number(value);
  if (!num || !Number.isFinite(num)) return '—';
  return `${priceFormatter.format(num)} ₽`;
}

// API sometimes nests package info under package.package
export function getPackageData(order?: Order): any {
  if (!order) return null;
  return (order as any)?.package?.package || (order as any)?.package || null;
}

export function getLtOrderPackage(order?: Order): any {
  if (!order) return null;
  return (order as any)?.package ?? order;
}

export function getOrderId(order?: Order): number | string | null {
  return (order as any)?.order_id ?? order?.id ?? null;
}

function orderTimestamp(order?: Order): number {
  const pkg = getPackageData(order);
  const value = (order as any)?.c_date || pkg?.created_at;
  if (!value) {
    const id = Number(getOrderId(order));
    return Number.isFinite(id) ? id : 0;
  }
  const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value);
  const t = date.getTime();
  return Number.isFinite(t) ? t : 0;
}

export function formatOrderDate(value?: number | string): string {
  if (!value) return '—';
  const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

export function formatPeriod(pkg: any): string {
  const start = pkg?.dates_info?.start_date;
  const end = pkg?.dates_info?.end_date;
  if (!start || !end) return '';
  const formatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });
  const weekday = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' });
  const s = new Date(start);
  const e = new Date(end);
  return `${formatter.format(s)}, ${weekday.format(s)} – ${formatter.format(e)}, ${weekday.format(e)}`;
}

export function formatDeparture(pkg: any): string {
  const departureDate = pkg?.dates_info?.start_date;
  if (!departureDate && !pkg?.departure) return '';
  const city = pkg?.departure?.name_ru || pkg?.departure?.name_en || pkg?.departure?.name || '';
  const formatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });
  return `Вылет: ${city || '—'}${departureDate ? `, ${formatter.format(new Date(departureDate))}` : ''}`;
}

export function collectTourists(order: Order, pkg: any): string {
  const tourists = pkg?.tourists || (order as any)?.tourists || ((order as any)?.package?.tourists ?? []);
  if (!Array.isArray(tourists) || !tourists.length) return '';
  return tourists
    .map((t: any) => `${t?.surname || ''} ${t?.name || ''}`.trim())
    .filter(Boolean)
    .join(', ');
}

export function getStatusLabel(order?: Order): string {
  if (!order) return 'Статус заказа';
  const pkg = getLtOrderPackage(order);
  return (
    pkg?.status_for_client ||
    (order as any)?.package?.status_for_client ||
    (order as any)?.state ||
    'Статус заказа'
  );
}

export function getStatusColor(pkg: any, order: Order): string {
  const state = (pkg?.state || (order as any)?.state || '').toString().toLowerCase();
  if (state.includes('cancel')) return '#B6B6B6';
  if (state.includes('approve') || state === 'approved') {
    const paymentValue =
      pkg?.payment ?? pkg?.payment_status ?? pkg?.paymentInfo ?? (order as any)?.payment ?? null;
    return paymentValue ? '#22c55e' : '#FE732E';
  }
  return '#FE732E';
}

export function isOrderAwaitingPayment(order?: Order): boolean {
  if (!order) return false;
  const payStatus = String((order as any).pay_status ?? '').toUpperCase();
  if (payStatus === 'RECONCILED') return false;
  const lt = getLtOrderPackage(order);
  if (lt?.is_paid === true) return false;
  if (lt?.is_paid === false) return true;
  if (payStatus === 'CREATED') return true;
  const status = String(lt?.status_for_client ?? '').toLowerCase();
  if (status.includes('ожидает оплат')) return true;
  return lt?.is_paid !== true && payStatus !== 'RECONCILED';
}

export function getOrderPrice(order?: Order): string {
  const pkg = getPackageData(order);
  return formatPrice(pkg?.price ?? pkg?.full_price ?? (order as any)?.package?.price);
}
