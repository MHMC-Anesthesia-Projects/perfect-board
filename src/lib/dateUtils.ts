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

/**
 * Returns `count` upcoming future times in 30-minute increments from current time (America/Chicago timezone).
 * All times are strictly in the future, rounded up to the nearest half-hour mark, formatted as 4-digit military time (e.g. "0900", "0930").
 */
export function getFutureTimePresets(count: number = 7, baseDate: Date = new Date()): string[] {
  let currentHours = baseDate.getHours();
  let currentMinutes = baseDate.getMinutes();

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      hour: 'numeric',
      minute: 'numeric',
      hourCycle: 'h23'
    });
    const parts = formatter.formatToParts(baseDate);
    const hPart = parts.find(p => p.type === 'hour');
    const mPart = parts.find(p => p.type === 'minute');
    if (hPart && mPart) {
      currentHours = parseInt(hPart.value, 10) % 24;
      currentMinutes = parseInt(mPart.value, 10);
    }
  } catch {
    currentHours = currentHours % 24;
  }

  const remainder = currentMinutes % 30;
  const addMinutes = remainder === 0 ? 30 : (30 - remainder);
  let totalMinutes = currentHours * 60 + currentMinutes + addMinutes;

  const presets: string[] = [];
  for (let i = 0; i < count; i++) {
    const normalized = ((totalMinutes % 1440) + 1440) % 1440;
    const h = Math.floor(normalized / 60);
    const m = normalized % 60;
    presets.push(`${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}`);
    totalMinutes += 30;
  }
  return presets;
}
