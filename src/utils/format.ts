export function formatClock(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const mins = Math.floor(safeSeconds / 60).toString().padStart(2, "0");
  const secs = Math.floor(safeSeconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

export function formatDurationMetric(seconds: number): string {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  if (!safeSeconds) return "0 分钟";
  if (safeSeconds < 60) return `${Math.round(safeSeconds)} 秒`;

  const totalMinutes = Math.round(safeSeconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} 分钟`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours} 小时 ${minutes} 分钟` : `${hours} 小时`;
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间未知";

  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function formatBirthday(value?: string): string {
  if (!value) return "";

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric"
  }).format(date);
}

export function formatJourneyNumber(value: number): string {
  return `#${String(value).padStart(4, "0")}`;
}

export function formatCalendarDayLabel(date: Date, isChecked: boolean): string {
  const label = new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric"
  }).format(date);

  return `${label}${isChecked ? "，已打卡" : "，未打卡"}`;
}
