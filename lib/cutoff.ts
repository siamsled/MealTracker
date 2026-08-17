import { getDatabase, HouseholdRecord } from './db';

export interface CutoffStatus {
  isLockedToday: boolean;
  cutoffTimeString: string;
  secondsRemaining: number;
  timeRemainingFormatted: string;
  serverToday: string; // YYYY-MM-DD
  serverNowISO: string;
}

/**
 * Returns YYYY-MM-DD date string for a given date in household timezone.
 */
export function getHouseholdDateString(d: Date = new Date(), timezone: string = 'Asia/Dhaka'): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(d);
}

/**
 * Evaluates current cutoff status for a household.
 */
export function getCutoffStatus(household: HouseholdRecord): CutoffStatus {
  const now = new Date();
  const timezone = household.timezone || 'Asia/Dhaka';
  
  // Format current local time in household timezone
  const localTimeParts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  }).formatToParts(now);

  let hour = 0;
  let minute = 0;
  let second = 0;
  for (const part of localTimeParts) {
    if (part.type === 'hour') hour = parseInt(part.value, 10);
    if (part.type === 'minute') minute = parseInt(part.value, 10);
    if (part.type === 'second') second = parseInt(part.value, 10);
  }

  const cutoffHour = household.cutoff_hour ?? 6;
  const cutoffMinute = household.cutoff_minute ?? 0;

  const currentSecondsInDay = hour * 3600 + minute * 60 + second;
  const cutoffSecondsInDay = cutoffHour * 3600 + cutoffMinute * 60;

  const isLockedToday = currentSecondsInDay >= cutoffSecondsInDay;
  
  let secondsRemaining = 0;
  if (!isLockedToday) {
    secondsRemaining = cutoffSecondsInDay - currentSecondsInDay;
  } else {
    // Next cutoff is tomorrow 6 AM (seconds remaining in current day + cutoff seconds tomorrow)
    secondsRemaining = (86400 - currentSecondsInDay) + cutoffSecondsInDay;
  }

  const hoursLeft = Math.floor(secondsRemaining / 3600);
  const minutesLeft = Math.floor((secondsRemaining % 3600) / 60);
  const secsLeft = secondsRemaining % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  const timeRemainingFormatted = `${pad(hoursLeft)}:${pad(minutesLeft)}:${pad(secsLeft)}`;
  const cutoffTimeString = `${pad(cutoffHour)}:${pad(cutoffMinute)} AM`;
  const serverToday = getHouseholdDateString(now, timezone);

  return {
    isLockedToday,
    cutoffTimeString,
    secondsRemaining,
    timeRemainingFormatted,
    serverToday,
    serverNowISO: now.toISOString()
  };
}

/**
 * Checks if a specific date is allowed to be edited by a standard flatmate.
 * Past dates or today after 6:00 AM are locked.
 */
export function isDateLockedForUser(
  targetDate: string,
  household: HouseholdRecord,
  isAdminOverride: boolean = false
): { locked: boolean; reason?: string } {
  if (isAdminOverride) {
    return { locked: false };
  }

  const todayStr = getHouseholdDateString(new Date(), household.timezone);

  if (targetDate < todayStr) {
    return { locked: true, reason: 'Past dates are locked.' };
  }

  if (targetDate === todayStr) {
    const status = getCutoffStatus(household);
    if (status.isLockedToday) {
      return {
        locked: true,
        reason: `Meals are locked for today after ${status.cutoffTimeString} cutoff.`
      };
    }
  }

  // Future dates are unlocked
  return { locked: false };
}
