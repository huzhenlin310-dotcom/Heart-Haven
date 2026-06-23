export type Route =
  | "home"
  | "audio-select"
  | "meditate"
  | "journey-result"
  | "stats"
  | "care"
  | "care-person"
  | "settings"
  | "update-history";

export type StatsRange = "day" | "week" | "month" | "year" | "total";

export type Emotion = {
  id: string;
  label: string;
  valence?: number;
};

export type MoodRecord = {
  id: string;
  before?: Emotion | string;
  after?: Emotion | string;
  note?: string;
  createdAt: string;
};

export type AudioTrack = {
  id: string;
  title: string;
  src: string;
  durationSeconds: number;
  categoryId: string;
  categoryTitle: string;
};

export type AudioCategory = {
  id: string;
  title: string;
  description: string;
  isOpen: boolean;
  tracks: Omit<AudioTrack, "categoryId" | "categoryTitle">[];
};

export type MeditationSession = {
  id: string;
  durationSeconds: number;
  audioTitle: string;
  audioSrc: string;
  startedAt: string;
  completedAt?: string;
};

export type JourneyTicket = {
  id: string;
  journeyNo: number;
  durationSeconds: number;
  sessionType?: string;
  trainType?: string;
  audioTitle?: string;
  audioSrc?: string;
  quote: string;
  favorite: boolean;
  createdAt: string;
};

export type CareRecord = {
  id: string;
  content: string;
  score?: number;
  createdAt: string;
};

export type CarePerson = {
  id: string;
  name: string;
  gender?: string;
  relationship: string;
  birthday?: string;
  records: CareRecord[];
  createdAt: string;
};

export type UpdateItem = {
  version?: string;
  releasedAt?: string;
  date?: string;
  summary: string;
};
