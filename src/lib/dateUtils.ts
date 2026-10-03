/**
 * Returns the current date in YYYY-MM-DD format based on America/Chicago (Houston Hospital Timezone).
 * This guarantees that syncing and auto-assigning before midnight in Houston never prematurely rolls over
 * to tomorrow due to UTC midnight cutoff occurring at 7:00 PM CDT / 6:00 PM CST.
 */
export function getHoustonDateString(d: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(d);
  } catch {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
