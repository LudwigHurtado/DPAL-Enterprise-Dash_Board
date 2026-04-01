/**
 * Single source of truth for the DPAL backend base URL.
 *
 * Priority order:
 *   1. Runtime localStorage override  (set via Settings panel in the dashboard)
 *   2. Build-time env var             NEXT_PUBLIC_DPAL_API_BASE
 *   3. Empty string                   (dashboard shows "not connected" banner)
 */

export const LS_KEY_API_BASE   = 'dpal_api_base_override';
export const LS_KEY_ADMIN_SEC  = 'dpal_admin_secret_override';

function envVar(key: string): string {
  return (typeof process !== 'undefined' && (process.env?.[key] as string)?.trim()) || '';
}

function lsGet(key: string): string {
  if (typeof window === 'undefined') return '';
  try { return localStorage.getItem(key)?.trim() ?? ''; } catch { return ''; }
}

/** Get the active backend base URL (no trailing slash). */
export function getApiBaseUrl(): string {
  return lsGet(LS_KEY_API_BASE) || envVar('NEXT_PUBLIC_DPAL_API_BASE');
}

/** Persist a new base URL to localStorage so all API modules pick it up. */
export function setApiBaseUrl(url: string): void {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = url.trim().replace(/\/$/, '');
    if (trimmed) localStorage.setItem(LS_KEY_API_BASE, trimmed);
    else         localStorage.removeItem(LS_KEY_API_BASE);
  } catch { /* ignore */ }
}

/** Get the admin secret (Bearer token for /api/admin/* endpoints). */
export function getAdminSecret(): string {
  return lsGet(LS_KEY_ADMIN_SEC) || envVar('NEXT_PUBLIC_DPAL_ADMIN_SECRET');
}

/** Persist admin secret to localStorage. */
export function setAdminSecret(secret: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (secret.trim()) localStorage.setItem(LS_KEY_ADMIN_SEC, secret.trim());
    else               localStorage.removeItem(LS_KEY_ADMIN_SEC);
  } catch { /* ignore */ }
}

/** Build standard admin request headers. */
export function adminHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getAdminSecret()}`,
  };
}
