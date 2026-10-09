export const BASE_PATH = '';

/**
 * Helper to ensure client-side fetch and EventSource URLs route cleanly
 */
export function apiUrl(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}
