/**
 * Environment-aware API Base URL resolver.
 *
 * Rules:
 * 1. If NEXT_PUBLIC_API_URL is configured with a valid public (non-localhost) URL, use it.
 * 2. On local development hostnames (localhost, 127.0.0.1, 0.0.0.0), use NEXT_PUBLIC_API_URL if present, else fallback to http://localhost:8000/api/v1.
 * 3. On production hostnames (e.g. *.vercel.app):
 *    - NEVER use localhost or 127.0.0.1 even if inlined at build time.
 *    - Use NEXT_PUBLIC_API_URL if it is a valid non-localhost URL.
 *    - Fallback to relative /api/v1 to keep all requests on the current origin without redirecting to localhost.
 */
export function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';

    if (!isLocalhost) {
      // Production Browser: Only accept non-localhost API URLs
      if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
        return envUrl.endsWith('/api/v1') ? envUrl : `${envUrl.replace(/\/+$/, '')}/api/v1`;
      }
      // Return relative API path so requests stay strictly on current Vercel origin
      return `${window.location.origin}/api/v1`;
    }

    // Local Development Browser: Use envUrl if set, otherwise fallback to local backend
    if (envUrl) {
      return envUrl.endsWith('/api/v1') ? envUrl : `${envUrl.replace(/\/+$/, '')}/api/v1`;
    }
    return 'http://localhost:8000/api/v1';
  }

  // Server-Side Rendering / Static Generation:
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl.endsWith('/api/v1') ? envUrl : `${envUrl.replace(/\/+$/, '')}/api/v1`;
  }

  return 'http://localhost:8000/api/v1';
}
