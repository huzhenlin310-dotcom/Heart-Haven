import { DEFAULT_DURATION_SECONDS } from "../constants";
import type { JourneyTicket } from "../types";

export function normalizeDuration(duration: number): number {
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  return Math.round(duration);
}

export function getJourneyGuide(elapsedSeconds: number): string {
  if (elapsedSeconds < 120) {
    return "先把注意力带回呼吸。此刻只需要知道自己已经开始。";
  }
  if (elapsedSeconds < 240) {
    return "允许现在的感受待在这里，不急着把它赶走。";
  }
  if (elapsedSeconds < 360) {
    return "提醒自己：困难、疲惫和波动，都是人会经历的部分。";
  }
  return "把善意再带回自己身上，慢慢准备抵达新的站台。";
}

export function getSessionType(ticket: JourneyTicket): string {
  return ticket.sessionType || ticket.trainType || "冥想";
}

export function getTicketDuration(ticket: JourneyTicket): number {
  return Number(ticket.durationSeconds) || DEFAULT_DURATION_SECONDS;
}

export function getTicketAudioTitle(ticket: JourneyTicket): string {
  return ticket.audioTitle || getSessionType(ticket);
}
