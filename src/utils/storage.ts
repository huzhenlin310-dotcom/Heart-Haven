import {
  AUDIO_SELECTION_STORAGE_KEY,
  CARE_RECORD_STORAGE_KEY,
  JOURNEY_STORAGE_KEY,
  UPDATE_FINGERPRINT_STORAGE_KEY
} from "../constants";
import { AUDIO_TRACKS } from "../data/audio";
import type { CarePerson, JourneyTicket } from "../types";

export function readSelectedAudioId(): string {
  try {
    const savedId = localStorage.getItem(AUDIO_SELECTION_STORAGE_KEY);
    return AUDIO_TRACKS.some((track) => track.id === savedId)
      ? String(savedId)
      : AUDIO_TRACKS[0].id;
  } catch {
    return AUDIO_TRACKS[0].id;
  }
}

export function writeSelectedAudioId(audioId: string): void {
  localStorage.setItem(AUDIO_SELECTION_STORAGE_KEY, audioId);
}

export function readJourneyTickets(): JourneyTicket[] {
  try {
    const raw = localStorage.getItem(JOURNEY_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as JourneyTicket[]) : [];
  } catch {
    return [];
  }
}

export function writeJourneyTickets(tickets: JourneyTicket[]): void {
  localStorage.setItem(JOURNEY_STORAGE_KEY, JSON.stringify(tickets));
}

export function readCarePeople(): CarePerson[] {
  try {
    const raw = localStorage.getItem(CARE_RECORD_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];

    return (parsed as CarePerson[]).map((person) => ({
      ...person,
      records: Array.isArray(person.records) ? person.records : []
    }));
  } catch {
    return [];
  }
}

export function writeCarePeople(people: CarePerson[]): void {
  localStorage.setItem(CARE_RECORD_STORAGE_KEY, JSON.stringify(people));
}

export function readUpdateFingerprint(): string {
  try {
    return localStorage.getItem(UPDATE_FINGERPRINT_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

export function writeUpdateFingerprint(fingerprint: string): void {
  try {
    localStorage.setItem(UPDATE_FINGERPRINT_STORAGE_KEY, fingerprint);
  } catch {
    // Update checks still work for the current session without persisted state.
  }
}
