const CACHE_NAME = "heart-haven-v20";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./assets/icons/icon.svg",
  "./assets/images/cave-meditation.png",
  "./assets/audio/001Live a Happier Life.m4a",
  "./assets/audio/002How To Love Yourself.mp3",
  "./assets/audio/003Loving Kindness Meditation.mp3",
  "./assets/audio/004Finding the Passcode to Your Soul Part One.mp3",
  "./assets/audio/005Finding the Passcode to Your Soul Part Two.mp3",
  "./assets/audio/006Acceptance and Giving Meditation.mp4",
  "./assets/audio/007Free Yourself from Self-Shame.mp3",
  "./assets/audio/008Find Your Compassionate Friend.mp3",
  "./assets/audio/009A Self-Compassion Guide for Intimate Relationships.m4a"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (event.request.headers.has("range")) {
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
