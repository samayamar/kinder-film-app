/** fetch für Admin-API-Routen: hängt das Passwort aus der Session als x-admin-key an. */
export function adminFetch(url: string, init: RequestInit = {}) {
  const password = sessionStorage.getItem('admin_auth_pw') ?? '';
  return fetch(url, {
    ...init,
    headers: { ...(init.headers as Record<string, string>), 'x-admin-key': password },
  });
}
