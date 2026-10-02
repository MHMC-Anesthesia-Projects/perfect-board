export const BASE_PATH = '/board';

/**
 * Helper to ensure client-side fetch and EventSource URLs respect the basePath (/board)
 */
export function apiUrl(path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  if (clean.startsWith(BASE_PATH)) {
    return clean;
  }
  return `${BASE_PATH}${clean}`;
}
