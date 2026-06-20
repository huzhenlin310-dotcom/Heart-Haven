# Audio library

Audio files are grouped by category:

- `self-care-mindfulness/`: guided self-care mindfulness meditation.
- `nature-white-noise/`: rain, water, waves, forest, and other natural white noise.
- `soothing-music/`: reserved for gentle music and sleep-friendly tracks.

When adding a new file, add its metadata to `AUDIO_CATEGORIES` in `app.js` and update `service-worker.js` if the file should be available offline.
