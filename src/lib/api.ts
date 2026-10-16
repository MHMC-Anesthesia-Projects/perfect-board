export const BASE_PATH = '/board';

/**
 * Helper to ensure client-side fetch and EventSource URLs route cleanly
 */
export function apiUrl(path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${BASE_PATH}${clean}`;
}
