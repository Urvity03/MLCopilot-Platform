/**
 * Production-safe API Base URL resolver.
 *
 * In local development, falls back to http://localhost:8000/api/v1.
 * In production on Vercel:
 * 1. Uses process.env.NEXT_PUBLIC_API_URL if configured.
 * 2. If process.env.NEXT_PUBLIC_API_URL is unset, falls back to /api/v1 relative to the browser origin,
 *    preventing accidental redirects to localhost:8000 or 127.0.0.1.
 */
export function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && envUrl.trim()) {
    const trimmed = envUrl.trim();
    return trimmed.endsWith('/api/v1') ? trimmed : `${trimmed.replace(/\/+$/, '')}/api/v1`;
  }

  // Check if running in browser on a production domain (not localhost)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname !== '0.0.0.0') {
      return `${window.location.origin}/api/v1`;
    }
  }

  return 'http://localhost:8000/api/v1';
}
