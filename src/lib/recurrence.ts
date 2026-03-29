import type { RecurrenceFrequency, RecurrenceEndType } from "@prisma/client";

export interface RecurrenceInput {
  frequency: RecurrenceFrequency;
  interval: number;
  daysOfWeek: number[]; // 0=Sun..6=Sat
  endType: RecurrenceEndType;
  endAfterCount?: number;
  endDate?: Date;
}

const MAX_INSTANCES = 365;
const HORIZON_DAYS = 90;

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const dayOfMonth = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + months);
  // Clamp if the day overflowed (e.g. Jan 31 + 1 month -> Feb 28)
  if (d.getUTCDate() !== dayOfMonth) {
    d.setUTCDate(0); // go to last day of previous month
  }
  return d;
}

function addYears(date: Date, years: number): Date {
  const d = new Date(date);
  const dayOfMonth = d.getUTCDate();
  d.setUTCFullYear(d.getUTCFullYear() + years);
  if (d.getUTCDate() !== dayOfMonth) {
    d.setUTCDate(0);
  }
  return d;
}

export function generateOccurrenceDates(
  rule: RecurrenceInput,
  startDate: Date,
): Date[] {
  const horizon = addDays(new Date(), HORIZON_DAYS);
  const dates: Date[] = [];

  const isPastEnd = (d: Date): boolean => {
    if (rule.endType === "ON_DATE" && rule.endDate && d > rule.endDate) return true;
    if (rule.endType === "AFTER_COUNT" && rule.endAfterCount && dates.length >= rule.endAfterCount) return true;
    if (rule.endType === "NEVER" && d > horizon) return true;
    if (dates.length >= MAX_INSTANCES) return true;
    return false;
  };

  if (rule.frequency === "DAILY") {
    let current = new Date(startDate);
    while (!isPastEnd(current)) {
      dates.push(new Date(current));
      current = addDays(current, rule.interval);
    }
  } else if (rule.frequency === "WEEKLY") {
    const targetDays = rule.daysOfWeek.length > 0
      ? rule.daysOfWeek.sort((a, b) => a - b)
      : [startDate.getUTCDay()];

    // Start from the beginning of the week containing startDate
    let weekStart = new Date(startDate);
    weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());
    // Preserve original time on generated dates
    const origHours = startDate.getUTCHours();
    const origMinutes = startDate.getUTCMinutes();

    let isFirstWeek = true;
    while (!isPastEnd(weekStart)) {
      for (const day of targetDays) {
        const candidate = addDays(weekStart, day);
        candidate.setUTCHours(origHours, origMinutes, 0, 0);
        if (candidate < startDate) continue;
        if (isPastEnd(candidate)) break;
        dates.push(candidate);
      }
      weekStart = addDays(weekStart, 7 * rule.interval);
      if (isFirstWeek && rule.interval > 1) {
        // For the first iteration we started at the current week,
        // subsequent jumps should be interval-based from week 1
        isFirstWeek = false;
      }
    }
  } else if (rule.frequency === "MONTHLY") {
    let current = new Date(startDate);
    while (!isPastEnd(current)) {
      dates.push(new Date(current));
      current = addMonths(current, rule.interval);
    }
  } else if (rule.frequency === "YEARLY") {
    let current = new Date(startDate);
    while (!isPastEnd(current)) {
      dates.push(new Date(current));
      current = addYears(current, rule.interval);
    }
  }

  return dates;
}
