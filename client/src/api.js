// Thin fetch wrapper. Errors are thrown as ApiError carrying the server's { code, message, details }.
export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error?.message || 'Request failed');
    this.status = status;
    this.code = body?.error?.code;
    this.details = body?.error?.details;
  }
}

let token = localStorage.getItem('token');
export const setToken = (t) => {
  token = t;
  t ? localStorage.setItem('token', t) : localStorage.removeItem('token');
};

export async function api(path, { method = 'GET', body, headers = {}, query } = {}) {
  const qs = query ? '?' + new URLSearchParams(Object.entries(query).filter(([, v]) => v !== '' && v != null)) : '';
  const res = await fetch(`/api${path}${qs}`, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}

export const money = (n) => '₹' + Number(n).toLocaleString('en-IN');
export const fmtDateTime = (d) => new Date(d).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
