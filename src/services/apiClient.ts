export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('bethel_admin_user');
    if (saved) {
      try {
        const user = JSON.parse(saved);
        if (user) {
          if (user.role) headers['X-Admin-Role'] = user.role;
          if (user.username) headers['X-Admin-Username'] = user.username;
          if (user.assignedClassId) headers['X-Assigned-Class-Id'] = user.assignedClassId;
        }
      } catch {
        // Ignore JSON parse error
      }
    }
  }
  return headers;
}

export async function apiRequest<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
  try {
    const headers = {
      ...getAuthHeaders(),
      ...(options.headers || {}),
    };

    const res = await fetch(url, {
      ...options,
      headers,
    });

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, status: res.status, data, error: data.error || data.message || `请求失败 (${res.status})` };
      }
      return { ok: true, status: res.status, data };
    }

    if (!res.ok) {
      return { ok: false, status: res.status, error: `HTTP ${res.status}` };
    }

    return { ok: true, status: res.status };
  } catch (err: any) {
    return { ok: false, status: 0, error: err.message || '网络连接超时或故障' };
  }
}
