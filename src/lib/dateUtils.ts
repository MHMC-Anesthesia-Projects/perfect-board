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

export interface HoustonTimeParts {
  hours: number;
  minutes: number;
  totalMinutes: number;
  timeStr: string;
  ampmTimeStr: string;
}

/**
 * Returns current hours, minutes, and formatted string in America/Chicago (Houston Hospital Timezone).
 */
export function getHoustonTimeParts(d: Date = new Date()): HoustonTimeParts {
  let hours = d.getHours();
  let minutes = d.getMinutes();

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      hour: 'numeric',
      minute: 'numeric',
      hourCycle: 'h23'
    });
    const parts = formatter.formatToParts(d);
    const hPart = parts.find(p => p.type === 'hour');
    const mPart = parts.find(p => p.type === 'minute');
    if (hPart && mPart) {
      hours = parseInt(hPart.value, 10) % 24;
      minutes = parseInt(mPart.value, 10);
    }
  } catch {
    hours = hours % 24;
  }

  const totalMinutes = hours * 60 + minutes;
  const ampmHours = hours % 12 === 0 ? 12 : hours % 12;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const ampmTimeStr = `${ampmHours}:${String(minutes).padStart(2, '0')} ${ampm}`;
  const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

  return {
    hours,
    minutes,
    totalMinutes,
    timeStr,
    ampmTimeStr
  };
}

export interface AutomatedBreakSchedule {
  showBreakfast: boolean;
  showLunch: boolean;
  showDinner: boolean;
  currentWindowLabel: string;
  activeButtonsText: string;
  nextWindowText: string;
  siteTimeText: string;
}

/**
 * Automated Break Labels schedule based on hospital site time (America/Chicago):
 * - 7:00 AM – 10:00 AM: Breakfast [B] only
 * - 10:00 AM – 11:00 AM: Breakfast & Lunch [B, L] overlap window
 * - 11:00 AM – 3:00 PM: Lunch [L] only (Breakfast hides)
 * - 3:00 PM – 8:00 PM: Dinner [D] only (Lunch hides)
 * - 8:00 PM – 7:00 AM: Breaks hidden until 7:00 AM / next clean
 */
export function getAutomatedBreakDisplay(d: Date = new Date()): AutomatedBreakSchedule {
  const { totalMinutes, ampmTimeStr } = getHoustonTimeParts(d);

  // Time boundaries in minutes from midnight (America/Chicago):
  // 7:00 AM = 420 mins
  // 10:00 AM = 600 mins
  // 11:00 AM = 660 mins
  // 3:00 PM (15:00) = 900 mins
  // 8:00 PM (20:00) = 1200 mins

  if (totalMinutes >= 420 && totalMinutes < 600) {
    // 7:00 AM – 10:00 AM: Breakfast only
    return {
      showBreakfast: true,
      showLunch: false,
      showDinner: false,
      currentWindowLabel: 'Morning Window (7 AM – 10 AM)',
      activeButtonsText: 'Breakfast [B]',
      nextWindowText: 'Lunch [L] joins at 10:00 AM',
      siteTimeText: ampmTimeStr
    };
  } else if (totalMinutes >= 600 && totalMinutes < 660) {
    // 10:00 AM – 11:00 AM: Breakfast & Lunch overlap
    return {
      showBreakfast: true,
      showLunch: true,
      showDinner: false,
      currentWindowLabel: 'Late Morning Transition (10 AM – 11 AM)',
      activeButtonsText: 'Breakfast [B] & Lunch [L]',
      nextWindowText: 'Breakfast [B] hides at 11:00 AM',
      siteTimeText: ampmTimeStr
    };
  } else if (totalMinutes >= 660 && totalMinutes < 900) {
    // 11:00 AM – 3:00 PM: Lunch only
    return {
      showBreakfast: false,
      showLunch: true,
      showDinner: false,
      currentWindowLabel: 'Midday Window (11 AM – 3 PM)',
      activeButtonsText: 'Lunch [L]',
      nextWindowText: 'Dinner [D] starts at 3:00 PM',
      siteTimeText: ampmTimeStr
    };
  } else if (totalMinutes >= 900 && totalMinutes < 1200) {
    // 3:00 PM – 8:00 PM: Dinner only
    return {
      showBreakfast: false,
      showLunch: false,
      showDinner: true,
      currentWindowLabel: 'Evening Window (3 PM – 8 PM)',
      activeButtonsText: 'Dinner [D]',
      nextWindowText: 'Break buttons hide at 8:00 PM',
      siteTimeText: ampmTimeStr
    };
  } else {
    // 8:00 PM – 7:00 AM: Off-hours
    return {
      showBreakfast: false,
      showLunch: false,
      showDinner: false,
      currentWindowLabel: 'Off-Hours Window (8 PM – 7 AM)',
      activeButtonsText: 'Breaks Hidden',
      nextWindowText: 'Breakfast [B] starts at 7:00 AM',
      siteTimeText: ampmTimeStr
    };
  }
}
