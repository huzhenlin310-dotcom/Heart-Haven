const CACHE_NAME = "heart-haven-v22";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./updates.json",
  "./manifest.webmanifest",
  "./assets/icons/icon.svg",
  "./assets/images/cave-meditation.png",
  "./assets/audio/self-care-mindfulness/001Live a Happier Life.m4a",
  "./assets/audio/self-care-mindfulness/002How To Love Yourself.mp3",
  "./assets/audio/self-care-mindfulness/003Loving Kindness Meditation.mp3",
  "./assets/audio/self-care-mindfulness/004Finding the Passcode to Your Soul Part One.mp3",
  "./assets/audio/self-care-mindfulness/005Finding the Passcode to Your Soul Part Two.mp3",
  "./assets/audio/self-care-mindfulness/006Acceptance and Giving Meditation.mp4",
  "./assets/audio/self-care-mindfulness/007Free Yourself from Self-Shame.mp3",
  "./assets/audio/self-care-mindfulness/008Find Your Compassionate Friend.mp3",
  "./assets/audio/self-care-mindfulness/009A Self-Compassion Guide for Intimate Relationships.m4a",
  "./assets/audio/nature-white-noise/10分冥想练习雨水.mp3"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (event.request.headers.has("range")) {
    event.respondWith(fetch(event.request));
    return;
  }

  const requestUrl = new URL(event.request.url);
  if (requestUrl.searchParams.has("update-check")) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type === "opaque") {
          return response;
        }
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        return response;
      }).catch(() => {
        if (event.request.mode === "navigate") {
          return caches.match("./index.html");
        }
        return Response.error();
      });
    })
  );
});
