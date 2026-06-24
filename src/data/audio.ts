import type { AudioCategory, AudioTrack } from "../types";

export const AUDIO_CATEGORIES: AudioCategory[] = [
  {
    id: "self-care-mindfulness",
    title: "自我关怀正念冥想",
    description: "原有冥想音频，适合完整练习。",
    isOpen: true,
    tracks: [
      {
        id: "live-happier-life",
        title: "更快乐地生活",
        src: "assets/audio/self-care-mindfulness/001Live a Happier Life.m4a",
        durationSeconds: 545
      },
      {
        id: "love-yourself",
        title: "如何爱自己",
        src: "assets/audio/self-care-mindfulness/002How To Love Yourself.mp3",
        durationSeconds: 334
      },
      {
        id: "loving-kindness",
        title: "慈心冥想",
        src: "assets/audio/self-care-mindfulness/003Loving Kindness Meditation.mp3",
        durationSeconds: 1399
      },
      {
        id: "soul-passcode-one",
        title: "寻找灵魂密码（上）",
        src: "assets/audio/self-care-mindfulness/004Finding the Passcode to Your Soul Part One.mp3",
        durationSeconds: 680
      },
      {
        id: "soul-passcode-two",
        title: "寻找灵魂密码（下）",
        src: "assets/audio/self-care-mindfulness/005Finding the Passcode to Your Soul Part Two.mp3",
        durationSeconds: 851
      },
      {
        id: "acceptance-giving",
        title: "接纳与给予冥想",
        src: "assets/audio/self-care-mindfulness/006Acceptance and Giving Meditation.mp4",
        durationSeconds: 1284
      },
      {
        id: "self-shame",
        title: "从自我羞耻中释放",
        src: "assets/audio/self-care-mindfulness/007Free Yourself from Self-Shame.mp3",
        durationSeconds: 1739
      },
      {
        id: "compassionate-friend",
        title: "找到你的慈悲朋友",
        src: "assets/audio/self-care-mindfulness/008Find Your Compassionate Friend.mp3",
        durationSeconds: 1297
      },
      {
        id: "intimate-relationships",
        title: "亲密关系中的自我慈悲指南",
        src: "assets/audio/self-care-mindfulness/009A Self-Compassion Guide for Intimate Relationships.m4a",
        durationSeconds: 1608
      }
    ]
  },
  {
    id: "nature-white-noise",
    title: "自然白噪音",
    description: "雨声、流水、海浪等自然环境音。",
    isOpen: false,
    tracks: [
      {
        id: "rain-ten-minutes",
        title: "雨水白噪音",
        src: "assets/audio/nature-white-noise/10分冥想练习雨水.mp3",
        durationSeconds: 602
      }
    ]
  },
  {
    id: "soothing-music",
    title: "舒缓音乐",
    description: "预留给轻音乐和睡前放松音乐。",
    isOpen: false,
    tracks: []
  }
];

export const AUDIO_TRACKS: AudioTrack[] = AUDIO_CATEGORIES.flatMap((category) =>
  category.tracks.map((track) => ({
    ...track,
    categoryId: category.id,
    categoryTitle: category.title
  }))
);

