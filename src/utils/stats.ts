import type { CarePerson, JourneyTicket, StatsRange } from "../types";
import { addDays, getDateKey, getDayDistance, parseLocalDateKey } from "./dates";
import { getTicketDuration } from "./meditation";

export function getSortedJourneyTickets(tickets: JourneyTicket[]): JourneyTicket[] {
  return [...tickets].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function getMeditationStats(tickets: JourneyTicket[], rangeId: StatsRange) {
  const filteredTickets = tickets.filter((ticket) => isTicketInStatsRange(ticket, rangeId));
  const totalSeconds = filteredTickets.reduce((total, ticket) => total + getTicketDuration(ticket), 0);
  const dayKeys = new Set(filteredTickets.map((ticket) => getDateKey(ticket.createdAt)).filter(Boolean));

  return {
    count: filteredTickets.length,
    dayCount: dayKeys.size,
    totalSeconds,
    averageSeconds: filteredTickets.length ? Math.round(totalSeconds / filteredTickets.length) : 0
  };
}

export function isTicketInStatsRange(ticket: JourneyTicket, rangeId: StatsRange): boolean {
  if (rangeId === "total") return true;

  const createdAt = new Date(ticket.createdAt);
  if (Number.isNaN(createdAt.getTime())) return false;
  return createdAt >= getStatsRangeStart(rangeId) && createdAt <= new Date();
}

export function getStatsRangeStart(rangeId: StatsRange): Date {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (rangeId === "week") {
    const day = start.getDay();
    const offset = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - offset);
  }

  if (rangeId === "month") start.setDate(1);
  if (rangeId === "year") start.setMonth(0, 1);

  return start;
}

export function getMeditationDateKeys(tickets: JourneyTicket[]): Set<string> {
  return new Set(tickets.map((ticket) => getDateKey(ticket.createdAt)).filter(Boolean));
}

export function getCheckinSummary(checkedKeys: Set<string>) {
  const sortedKeys = [...checkedKeys].sort();
  let longestStreak = 0;
  let runningStreak = 0;
  let previousDate: Date | null = null;

  sortedKeys.forEach((key) => {
    const date = parseLocalDateKey(key);
    if (!date) return;

    runningStreak = previousDate && getDayDistance(previousDate, date) === 1
      ? runningStreak + 1
      : 1;
    longestStreak = Math.max(longestStreak, runningStreak);
    previousDate = date;
  });

  const today = new Date();
  const todayKey = getDateKey(today);
  const yesterdayKey = getDateKey(addDays(today, -1));
  let cursor: Date | null = checkedKeys.has(todayKey)
    ? today
    : checkedKeys.has(yesterdayKey)
      ? addDays(today, -1)
      : null;
  let currentStreak = 0;

  while (cursor && checkedKeys.has(getDateKey(cursor))) {
    currentStreak += 1;
    cursor = addDays(cursor, -1);
  }

  const monthPrefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-`;
  const monthCount = sortedKeys.filter((key) => key.startsWith(monthPrefix)).length;

  return { currentStreak, longestStreak, monthCount };
}

export function getCareScore(person: CarePerson): number {
  return person.records.reduce((total, record) => total + (Number(record.score) || 1), 0);
}

export function getCareRecordCount(people: CarePerson[]): number {
  return people.reduce((total, person) => total + person.records.length, 0);
}

export function getSortedCarePeople(people: CarePerson[]): CarePerson[] {
  return [...people].sort((a, b) => {
    return new Date(getLatestCareTime(b)).getTime() - new Date(getLatestCareTime(a)).getTime();
  });
}

export function getLatestCareTime(person: CarePerson): string {
  return person.records[0]?.createdAt || person.createdAt || "";
}
