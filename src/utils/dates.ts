export function getDateKey(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseLocalDateKey(key: string): Date | null {
  const match = String(key).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function addDays(date: Date, amount: number): Date {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate;
}

export function getDayDistance(leftDate: Date, rightDate: Date): number {
  const left = new Date(leftDate);
  const right = new Date(rightDate);
  left.setHours(0, 0, 0, 0);
  right.setHours(0, 0, 0, 0);
  return Math.round((right.getTime() - left.getTime()) / 86400000);
}
