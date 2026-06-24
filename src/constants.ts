import type { StatsRange } from "./types";

export const JOURNEY_STORAGE_KEY = "heart-haven.journey-tickets.v1";
export const LEGACY_MOOD_STORAGE_KEY = "heart-haven.mood-entries.v1";
export const AUDIO_SELECTION_STORAGE_KEY = "heart-haven.selected-audio.v1";
export const CARE_RECORD_STORAGE_KEY = "heart-haven.care-records.v1";
export const UPDATE_FINGERPRINT_STORAGE_KEY = "heart-haven.update-fingerprint.v1";

export const UPDATE_SUMMARY_FALLBACK = "刷新后即可使用最新内容。";
export const DEFAULT_DURATION_SECONDS = 20 * 60;
export const MIN_RECORD_SECONDS = 3 * 60;
export const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;
export const UPDATE_SUMMARY_URL = "updates.json";

export const APP_UPDATE_ASSETS = [
  "index.html",
  "service-worker.js",
  "manifest.webmanifest",
  "updates.json"
];

export const STATS_RANGES: { id: StatsRange; label: string }[] = [
  { id: "day", label: "日" },
  { id: "week", label: "周" },
  { id: "month", label: "月" },
  { id: "year", label: "年" },
  { id: "total", label: "总" }
];

export const JOURNEY_QUOTES = [
  "你不需要马上变好，只要愿意照顾自己。",
  "今天的这一次停下，已经是一种照顾。",
  "允许自己慢下来，把注意力放回呼吸。",
  "不急着改变什么，只和此刻待在一起。"
];
