import { APP_UPDATE_ASSETS, UPDATE_SUMMARY_URL } from "../constants";
import type { UpdateItem } from "../types";

export async function getUpdateHistory(): Promise<UpdateItem[]> {
  const url = new URL(UPDATE_SUMMARY_URL, window.location.href);
  url.searchParams.set("update-check", String(Date.now()));

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("Update summary failed");

  const payload: unknown = await response.json();
  return getUpdateEntries(payload).sort((leftEntry, rightEntry) => {
    return getUpdateEntryTime(rightEntry) - getUpdateEntryTime(leftEntry);
  });
}

export function getUpdateEntries(payload: unknown): UpdateItem[] {
  const shaped = payload as {
    updates?: UpdateItem[];
    latest?: UpdateItem;
    summary?: string;
  };

  const entries = Array.isArray(payload)
    ? payload
    : Array.isArray(shaped?.updates)
      ? shaped.updates
      : shaped?.latest
        ? [shaped.latest]
        : [shaped as UpdateItem];

  return entries
    .filter((entry): entry is UpdateItem => Boolean(entry && typeof entry === "object" && "summary" in entry))
    .map((entry) => ({
      ...entry,
      summary: String(entry.summary || "").trim()
    }))
    .filter((entry) => entry.summary.length > 0);
}

export function getUpdateEntryVersion(entry: UpdateItem): string {
  return String(entry.version || "未标注版本");
}

export function getUpdateEntryTime(entry: UpdateItem): number {
  const releasedAt = Date.parse(entry.releasedAt || entry.date || "");
  return Number.isNaN(releasedAt) ? 0 : releasedAt;
}

export function formatUpdateEntryTime(entry: UpdateItem): string {
  const timestamp = getUpdateEntryTime(entry);
  if (!timestamp) return "未标注时间";

  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(timestamp));
}

export async function getLatestUpdateSummary(): Promise<string> {
  const entries = await getUpdateHistory();
  return String(entries[0]?.summary || "").trim();
}

export async function getCurrentCodeFingerprint(): Promise<string> {
  const stamp = Date.now();
  const parts = await Promise.all(
    APP_UPDATE_ASSETS.map(async (asset) => {
      const url = new URL(asset, window.location.href);
      url.searchParams.set("update-check", String(stamp));

      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error("Update check failed");

      const text = await response.text();
      return `${asset}:${text.length}:${hashString(text)}`;
    })
  );

  return parts.join("|");
}

export async function clearAppCaches(): Promise<void> {
  if (!("caches" in window)) return;

  try {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((key) => key.startsWith("heart-haven-")).map((key) => caches.delete(key))
    );
  } catch {
    // The refresh path still works when Cache Storage is unavailable.
  }
}

function hashString(value: string): string {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
}
