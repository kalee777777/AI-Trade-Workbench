/** 统一 API 客户端：带 cookie，401 自动跳登录。 */

export async function api<T = unknown>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
  if (res.status === 401 && !path.startsWith('/auth')) {
    window.location.href = '/login';
    throw new Error('未登录');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `请求失败（${res.status}）`);
  }
  return res.json() as Promise<T>;
}

export const get = <T = unknown>(path: string) => api<T>(path);
export const post = <T = unknown>(path: string, body?: unknown) =>
  api<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) });
export const put = <T = unknown>(path: string, body?: unknown) =>
  api<T>(path, { method: 'PUT', body: JSON.stringify(body ?? {}) });
export const del = <T = unknown>(path: string) => api<T>(path, { method: 'DELETE' });
