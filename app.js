const JOURNEY_STORAGE_KEY = "heart-haven.journey-tickets.v1";
const LEGACY_MOOD_STORAGE_KEY = "heart-haven.mood-entries.v1";
const AUDIO_SELECTION_STORAGE_KEY = "heart-haven.selected-audio.v1";
const CARE_RECORD_STORAGE_KEY = "heart-haven.care-records.v1";
const UPDATE_FINGERPRINT_STORAGE_KEY = "heart-haven.update-fingerprint.v1";
const UPDATE_SUMMARY_FALLBACK = "刷新后即可使用最新内容。";
const DEFAULT_DURATION_SECONDS = 20 * 60;
const MIN_RECORD_SECONDS = 3 * 60;
const AUDIO_CATEGORIES = [
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
const AUDIO_TRACKS = AUDIO_CATEGORIES.flatMap((category) => category.tracks.map((track) => ({
  ...track,
  categoryId: category.id,
  categoryTitle: category.title
})));
const JOURNEY_QUOTES = [
  "你不需要马上变好，只要愿意照顾自己。",
  "今天的这一次停下，已经是一种照顾。",
  "允许自己慢下来，把注意力放回呼吸。",
  "不急着改变什么，只和此刻待在一起。"
];

/**
 * @typedef {Object} JourneyTicket
 * @property {string} id
 * @property {number} journeyNo
 * @property {number} durationSeconds
 * @property {string} sessionType
 * @property {string} audioTitle
 * @property {string} audioSrc
 * @property {string} quote
 * @property {boolean} favorite
 * @property {string} createdAt
 */

const state = {
  route: "home",
  journeyTickets: [],
  carePeople: [],
  selectedAudioId: AUDIO_TRACKS[0].id,
  audioDurations: Object.fromEntries(AUDIO_TRACKS.map((track) => [track.id, track.durationSeconds])),
  activeJourney: createInitialJourneyState(),
  timer: {
    totalSeconds: DEFAULT_DURATION_SECONDS,
    remainingSeconds: DEFAULT_DURATION_SECONDS,
    elapsedSeconds: 0,
    intervalId: null,
    runToken: 0,
    isRunning: false
  }
};

const app = document.querySelector("#app");
const navItems = [...document.querySelectorAll(".nav-item")];
const sideNav = document.querySelector(".side-nav");
const ROUTES = ["home", "records", "stats", "care", "settings"];
const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;
const APP_UPDATE_ASSETS = [
  "index.html",
  "styles.css",
  "app.js",
  "service-worker.js",
  "manifest.webmanifest",
  "updates.json"
];
const UPDATE_SUMMARY_URL = "updates.json";

let currentMeditationAudio = null;
let sidebarTouchStartY = 0;
let lastSidebarSwitchAt = 0;
let pendingUpdateWorker = null;
let isRefreshingForUpdate = false;

document.addEventListener("DOMContentLoaded", init);

function init() {
  state.journeyTickets = readJourneyTickets();
  state.carePeople = readCarePeople();
  state.selectedAudioId = readSelectedAudioId();
  bindNavigation();
  registerServiceWorker();
  render("home");
}

function createInitialJourneyState() {
  return {
    step: "idle",
    isInProgress: false,
    error: "",
    savedTicket: null
  };
}

function bindNavigation() {
  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const route = item.dataset.route;
      if (!route) return;
      requestRouteChange(route);
    });
  });

  if (!sideNav) return;

  sideNav.addEventListener("wheel", (event) => {
    event.preventDefault();
    if (Math.abs(event.deltaY) < 18) return;
    switchRouteByDirection(event.deltaY > 0 ? 1 : -1);
  }, { passive: false });

  sideNav.addEventListener("touchstart", (event) => {
    sidebarTouchStartY = event.touches[0].clientY;
  }, { passive: true });

  sideNav.addEventListener("touchend", (event) => {
    const touchEndY = event.changedTouches[0].clientY;
    const deltaY = sidebarTouchStartY - touchEndY;
    if (Math.abs(deltaY) < 34) return;
    switchRouteByDirection(deltaY > 0 ? 1 : -1);
  });
}

function switchRouteByDirection(direction) {
  const now = Date.now();
  if (now - lastSidebarSwitchAt < 360) return;
  lastSidebarSwitchAt = now;

  const currentRoute = ROUTES.includes(state.route) ? state.route : "home";
  const currentIndex = ROUTES.indexOf(currentRoute);
  const nextIndex = (currentIndex + direction + ROUTES.length) % ROUTES.length;
  requestRouteChange(ROUTES[nextIndex]);
}

function requestRouteChange(route) {
  if (route === state.route) return;

  if (state.route === "meditate" && hasMeditationProgress()) {
    const elapsedSeconds = getMeditationElapsedSeconds();
    const willRecord = canRecordMeditation(elapsedSeconds);
    const message = willRecord
      ? `离开冥想页会结束本次冥想，并保存 ${formatClock(elapsedSeconds)} 的记录。是否继续？`
      : `离开冥想页会结束本次冥想。已进行 ${formatClock(elapsedSeconds)}，满 ${formatClock(MIN_RECORD_SECONDS)} 才会保存记录。是否继续？`;
    if (!window.confirm(message)) return;
    finishMeditation({ destinationRoute: route });
    return;
  }

  if (state.route === "meditate") {
    resetActiveJourney();
  }
  render(route);
}

function render(route) {
  state.route = route;
  updateNav(route);
  app.innerHTML = "";

  if (route === "home") renderHome();
  if (route === "audio-select") renderAudioSelect();
  if (route === "meditate") renderMeditate();
  if (route === "journey-result") renderJourneyResult();
  if (route === "records") renderRecords();
  if (route === "stats") renderStats();
  if (route === "care") renderCareRecords();
  if (route === "settings") renderSettings();
  if (route === "update-history") renderUpdateHistory();

  app.focus({ preventScroll: true });
}

function updateNav(route) {
  const internalRoutes = new Set(["audio-select", "meditate", "journey-result", "update-history"]);
  const activeRoute = internalRoutes.has(route) ? "home" : route;
  if (route === "update-history") {
    navItems.forEach((item) => {
      item.classList.toggle("is-active", item.dataset.route === "settings");
    });
    return;
  }
  navItems.forEach((item) => {
    item.classList.toggle("is-active", item.dataset.route === activeRoute);
  });
}

function renderHome() {
  const template = document.querySelector("#home-template").content.cloneNode(true);
  const latestTicket = getSortedJourneyTickets()[0];

  template.querySelector("[data-action='start-flow']").addEventListener("click", startFlow);

  if (latestTicket) {
    const summary = document.createElement("div");
    summary.className = "home-journey-summary";
    summary.innerHTML = `
      <p class="section-kicker">最近一次</p>
      <div class="result-summary">
        <div class="result-badge">${escapeHtml(getSessionType(latestTicket))}</div>
        <strong>${escapeHtml(getTicketAudioTitle(latestTicket))}</strong>
        <strong>${formatClock(getTicketDuration(latestTicket))}</strong>
        <p class="muted">${formatDateTime(latestTicket.createdAt)}</p>
      </div>
    `;
    template.querySelector(".home-minimal").append(summary);
  }

  app.append(template);
}

function renderAudioSelect() {
  const section = document.createElement("section");
  section.className = "flow-panel audio-select-panel";
  section.innerHTML = `
    <p class="section-kicker">选择音频</p>
    <h2>选择这次要使用的冥想音频</h2>
    <div class="audio-picker" aria-label="选择冥想音频">
      <div class="audio-options" data-audio-options>
        ${AUDIO_CATEGORIES.map((category) => renderAudioCategory(category)).join("")}
      </div>
    </div>
    <div class="button-row journey-actions">
      <button class="ghost-button" data-action="back-home" type="button">返回</button>
      <button class="primary-action" data-action="begin-selected-audio" type="button">开始冥想</button>
    </div>
  `;

  const audioOptions = section.querySelector("[data-audio-options]");
  let preservedAudioOptionsScrollTop = audioOptions.scrollTop;
  audioOptions.addEventListener("scroll", () => {
    preservedAudioOptionsScrollTop = audioOptions.scrollTop;
  });
  audioOptions.querySelectorAll("[data-audio-id]").forEach((button) => {
    button.addEventListener("pointerdown", () => {
      preservedAudioOptionsScrollTop = audioOptions.scrollTop;
    });
    button.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        preservedAudioOptionsScrollTop = audioOptions.scrollTop;
      }
    });
    button.addEventListener("click", () => {
      state.selectedAudioId = button.dataset.audioId || AUDIO_TRACKS[0].id;
      writeSelectedAudioId();
      updateAudioOptionSelection(audioOptions);
      audioOptions.scrollTop = preservedAudioOptionsScrollTop;
      window.requestAnimationFrame(() => {
        audioOptions.scrollTop = preservedAudioOptionsScrollTop;
      });
    });
  });
  hydrateAudioDurations(audioOptions);

  section.querySelector("[data-action='back-home']").addEventListener("click", () => {
    render("home");
  });

  section.querySelector("[data-action='begin-selected-audio']").addEventListener("click", beginJourney);

  app.append(section);
}

function beginJourney() {
  state.activeJourney.error = "";
  state.activeJourney.savedTicket = null;
  resetTimer(getSelectedAudioDuration() || 0);
  render("meditate");
}

function renderAudioOption(track) {
  const selected = track.id === state.selectedAudioId;
  const duration = state.audioDurations[track.id];
  return `
    <button class="audio-option ${selected ? "is-selected" : ""}" data-audio-id="${escapeAttribute(track.id)}" type="button" aria-pressed="${selected}">
      <span class="audio-option-title">${escapeHtml(track.title)}</span>
      <span class="audio-option-duration" data-duration-for="${escapeAttribute(track.id)}">${duration ? formatClock(duration) : "读取中"}</span>
    </button>
  `;
}

function renderAudioCategory(category) {
  const hasTracks = category.tracks.length > 0;
  return `
    <details class="audio-category" ${category.isOpen ? "open" : ""}>
      <summary>
        <span>
          <strong>${escapeHtml(category.title)}</strong>
          <small>${escapeHtml(category.description)}</small>
        </span>
        <em>${category.tracks.length} 个音频</em>
      </summary>
      <div class="audio-category-tracks">
        ${hasTracks ? category.tracks.map((track) => renderAudioOption(track)).join("") : `<p class="empty-state compact">这里暂时还没有音频。</p>`}
      </div>
    </details>
  `;
}

function updateAudioOptionSelection(container) {
  container.querySelectorAll("[data-audio-id]").forEach((button) => {
    const selected = button.dataset.audioId === state.selectedAudioId;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

function hydrateAudioDurations(container) {
  AUDIO_TRACKS.forEach((track) => {
    if (state.audioDurations[track.id]) {
      updateAudioDurationLabel(container, track.id);
      return;
    }

    const audio = new Audio();
    audio.preload = "metadata";
    audio.src = track.src;
    audio.addEventListener("loadedmetadata", () => {
      const duration = normalizeDuration(audio.duration);
      if (!duration) return;
      state.audioDurations[track.id] = duration;
      updateAudioDurationLabel(container, track.id);
    });
    audio.addEventListener("error", () => {
      const label = container.querySelector(`[data-duration-for="${cssEscape(track.id)}"]`);
      if (label) label.textContent = "无法读取";
    });
  });
}

function updateAudioDurationLabel(container, audioId) {
  const label = container.querySelector(`[data-duration-for="${cssEscape(audioId)}"]`);
  const duration = state.audioDurations[audioId];
  if (label && duration) label.textContent = formatClock(duration);
}

function renderMeditate() {
  state.activeJourney.step = "meditating";
  const selectedTrack = getSelectedAudioTrack();
  const knownDuration = getSelectedAudioDuration();

  const section = document.createElement("section");
  section.className = "meditation-panel";
  section.innerHTML = `
    <p class="section-kicker">冥想进行中</p>
    <h2>${escapeHtml(selectedTrack.title)}</h2>
    <div class="journey-intro">
      <div class="journey-meta-chip" data-current-duration>${knownDuration ? formatClock(knownDuration) : "读取时长中"}</div>
    </div>
    <div class="timer-display" aria-live="polite">
      <span id="timer-text">${knownDuration ? formatClock(state.timer.remainingSeconds) : "--:--"}</span>
      <small id="elapsed-text">已进行 ${formatClock(state.timer.elapsedSeconds)}</small>
    </div>
    <div class="breathing-guide" aria-hidden="true">
      <div class="breathing-core"></div>
      <span id="breath-label">吸气</span>
    </div>
    <div class="result-group">
      <h3>当下提示</h3>
      <p id="guide-copy">${escapeHtml(getJourneyGuide(0))}</p>
    </div>
    <audio id="meditation-audio" preload="metadata" src="${escapeAttribute(selectedTrack.src)}"></audio>
    <p class="audio-status" id="audio-status" role="status">
      音频准备中。
    </p>
    <div class="button-row journey-actions">
      <button class="secondary-action" data-action="toggle-meditation" type="button" ${knownDuration ? "" : "disabled"}>开始冥想</button>
      <button class="ghost-button" data-action="cancel-meditation" type="button">结束冥想</button>
    </div>
  `;

  const timerText = section.querySelector("#timer-text");
  const elapsedText = section.querySelector("#elapsed-text");
  const breathLabel = section.querySelector("#breath-label");
  const guideCopy = section.querySelector("#guide-copy");
  const audio = section.querySelector("#meditation-audio");
  const status = section.querySelector("#audio-status");
  const toggleButton = section.querySelector("[data-action='toggle-meditation']");
  const currentDuration = section.querySelector("[data-current-duration]");

  currentMeditationAudio = audio;

  audio.addEventListener("loadedmetadata", () => {
    const duration = normalizeDuration(audio.duration);
    if (!duration) return;
    state.audioDurations[selectedTrack.id] = duration;
    if (!state.timer.isRunning && state.timer.elapsedSeconds === 0) {
      resetTimer(duration);
    } else {
      state.timer.totalSeconds = duration;
      state.timer.remainingSeconds = Math.max(0, duration - state.timer.elapsedSeconds);
    }
    currentDuration.textContent = formatClock(duration);
    updateTimerUi(timerText, elapsedText);
    toggleButton.disabled = false;
    status.textContent = "音频已就绪。";
  });

  audio.addEventListener("error", () => {
    status.textContent = "音频无法加载，请返回选择其他音频。";
    toggleButton.disabled = true;
  });

  audio.addEventListener("ended", () => {
    if (!state.timer.isRunning) return;
    completeMeditation(audio);
  });

  toggleButton.addEventListener("click", () => {
    if (state.timer.isRunning) {
      pauseMeditation(audio, toggleButton, status);
      return;
    }
    startMeditation(audio, toggleButton, status, timerText, elapsedText, breathLabel, guideCopy);
  });

  section.querySelector("[data-action='cancel-meditation']").addEventListener("click", () => {
    const elapsedSeconds = getMeditationElapsedSeconds(audio);
    const willRecord = canRecordMeditation(elapsedSeconds);
    const message = willRecord
      ? `确定结束本次冥想吗？已进行 ${formatClock(elapsedSeconds)}，会保存记录。`
      : `确定结束本次冥想吗？已进行 ${formatClock(elapsedSeconds)}，满 ${formatClock(MIN_RECORD_SECONDS)} 才会保存记录。`;
    const confirmed = window.confirm(message);
    if (!confirmed) return;
    finishMeditation();
  });

  app.append(section);
}

function startMeditation(audio, toggleButton, status, timerText, elapsedText, breathLabel, guideCopy) {
  stopTimer();
  const runToken = state.timer.runToken + 1;
  state.timer.runToken = runToken;
  state.activeJourney.isInProgress = true;
  state.timer.isRunning = true;
  toggleButton.textContent = "暂停冥想";
  status.textContent = "正在启动音频。";

  audio.play().then(() => {
    if (state.timer.runToken !== runToken || !state.timer.isRunning) {
      audio.pause();
      return;
    }
    status.textContent = "冥想进行中。";
    syncTimerFromAudio(audio, timerText, elapsedText, breathLabel, guideCopy);
    state.timer.intervalId = window.setInterval(() => {
      if (state.timer.runToken !== runToken || !state.timer.isRunning) return;
      syncTimerFromAudio(audio, timerText, elapsedText, breathLabel, guideCopy);

      if (state.timer.remainingSeconds === 0) {
        completeMeditation(audio);
      }
    }, 250);
  }).catch(() => {
    if (state.timer.runToken !== runToken || !state.timer.isRunning) return;
    status.textContent = "浏览器未能播放音频，当前为静默冥想。";
    startSilentTimer(runToken, timerText, elapsedText, breathLabel, guideCopy);
  });
}

function startSilentTimer(runToken, timerText, elapsedText, breathLabel, guideCopy) {
  const startedAt = performance.now();
  const startElapsed = state.timer.elapsedSeconds;
  state.timer.intervalId = window.setInterval(() => {
    if (state.timer.runToken !== runToken || !state.timer.isRunning) return;
    const elapsedSeconds = startElapsed + Math.floor((performance.now() - startedAt) / 1000);
    updateMeditationProgress(elapsedSeconds, timerText, elapsedText, breathLabel, guideCopy);

    if (state.timer.remainingSeconds === 0) {
      completeMeditation();
    }
  }, 250);
}

function syncTimerFromAudio(audio, timerText, elapsedText, breathLabel, guideCopy) {
  const duration = normalizeDuration(audio.duration);
  if (duration) {
    state.timer.totalSeconds = duration;
  }
  const elapsedSeconds = Number.isFinite(audio.currentTime)
    ? Math.floor(audio.currentTime)
    : state.timer.elapsedSeconds;
  updateMeditationProgress(elapsedSeconds, timerText, elapsedText, breathLabel, guideCopy);
}

function updateMeditationProgress(elapsedSeconds, timerText, elapsedText, breathLabel, guideCopy) {
  const safeElapsed = Math.max(0, Number(elapsedSeconds) || 0);
  state.timer.elapsedSeconds = state.timer.totalSeconds
    ? Math.min(safeElapsed, state.timer.totalSeconds)
    : safeElapsed;
  state.timer.remainingSeconds = state.timer.totalSeconds
    ? Math.max(0, state.timer.totalSeconds - state.timer.elapsedSeconds)
    : 0;
  breathLabel.textContent = state.timer.elapsedSeconds % 8 < 4 ? "吸气" : "呼气";
  guideCopy.textContent = getJourneyGuide(state.timer.elapsedSeconds);
  updateTimerUi(timerText, elapsedText);
}

function pauseMeditation(audio, toggleButton, status) {
  const elapsedSeconds = getMeditationElapsedSeconds(audio);
  stopTimer();
  state.timer.elapsedSeconds = elapsedSeconds;
  state.timer.remainingSeconds = state.timer.totalSeconds
    ? Math.max(0, state.timer.totalSeconds - elapsedSeconds)
    : 0;
  audio.pause();
  state.activeJourney.isInProgress = false;
  toggleButton.textContent = "继续冥想";
  status.textContent = "冥想已暂停。";
}

function completeMeditation(audio) {
  finishMeditation({ audio, forceRecord: true });
}

function stopMeditationPlayback() {
  stopTimer();
  if (currentMeditationAudio) {
    currentMeditationAudio.pause();
    currentMeditationAudio.currentTime = 0;
  }
  currentMeditationAudio = null;
  state.activeJourney.isInProgress = false;
}

function finishMeditation({ audio = currentMeditationAudio, destinationRoute = "", forceRecord = false } = {}) {
  const elapsedSeconds = getMeditationElapsedSeconds(audio);
  stopMeditationPlayback();

  if (forceRecord || canRecordMeditation(elapsedSeconds)) {
    saveJourneyTicket(elapsedSeconds, { renderResult: !destinationRoute });
    if (destinationRoute) {
      resetActiveJourney();
      render(destinationRoute);
    }
    return true;
  }

  resetActiveJourney();
  render(destinationRoute || "home");
  return false;
}

function hasMeditationProgress() {
  return state.activeJourney.isInProgress || state.timer.elapsedSeconds > 0;
}

function getMeditationElapsedSeconds(audio = currentMeditationAudio) {
  let elapsedSeconds = Math.max(0, Number(state.timer.elapsedSeconds) || 0);
  if (audio && Number.isFinite(audio.currentTime)) {
    elapsedSeconds = Math.max(elapsedSeconds, Math.floor(audio.currentTime));
  }

  const totalSeconds = state.timer.totalSeconds || getSelectedAudioDuration();
  if (totalSeconds) return Math.min(elapsedSeconds, totalSeconds);
  return elapsedSeconds;
}

function canRecordMeditation(elapsedSeconds) {
  return elapsedSeconds >= MIN_RECORD_SECONDS;
}

function saveJourneyTicket(durationSeconds, { renderResult = true } = {}) {
  const journeyNo = state.journeyTickets.length + 1;
  const selectedTrack = getSelectedAudioTrack();
  const ticket = {
    id: getSessionId(),
    journeyNo,
    durationSeconds: Math.max(1, Math.round(durationSeconds || state.timer.elapsedSeconds || state.timer.totalSeconds || getSelectedAudioDuration() || DEFAULT_DURATION_SECONDS)),
    sessionType: "冥想",
    audioTitle: selectedTrack.title,
    audioSrc: selectedTrack.src,
    quote: JOURNEY_QUOTES[(journeyNo - 1) % JOURNEY_QUOTES.length],
    favorite: false,
    createdAt: new Date().toISOString()
  };

  state.journeyTickets = [ticket, ...state.journeyTickets];
  writeJourneyTickets();
  state.activeJourney.savedTicket = ticket;
  state.activeJourney.step = "ticket-result";
  state.activeJourney.error = "";
  if (renderResult) render("journey-result");
}

function renderJourneyResult() {
  const ticket = state.activeJourney.savedTicket;
  if (!ticket) {
    render("records");
    return;
  }

  const section = document.createElement("section");
  section.className = "flow-panel meditation-result-panel";
  section.innerHTML = `
    <p class="section-kicker">记录已保存</p>
    <h2>这次冥想已经保存。</h2>
    ${renderJourneyTicketCard(ticket, false)}
    <div class="button-row journey-actions">
      <button class="secondary-action" data-action="toggle-favorite" type="button">
        ${ticket.favorite ? "取消收藏" : "收藏记录"}
      </button>
      <button class="ghost-button" data-action="ride-again" type="button">再冥想一次</button>
      <button class="primary-action" data-action="view-records" type="button">查看记录</button>
    </div>
  `;

  section.querySelector("[data-action='toggle-favorite']").addEventListener("click", () => {
    toggleTicketFavorite(ticket.id);
    state.activeJourney.savedTicket = findTicketById(ticket.id);
    render("journey-result");
  });

  section.querySelector("[data-action='ride-again']").addEventListener("click", () => {
    resetActiveJourney();
    render("meditate");
  });

  section.querySelector("[data-action='view-records']").addEventListener("click", () => {
    resetActiveJourney();
    render("records");
  });

  app.append(section);
}

function renderRecords() {
  const tickets = getSortedJourneyTickets();
  const section = document.createElement("section");
  section.className = "record-list";
  section.innerHTML = `
    <p class="section-kicker">记录</p>
    <h2>冥想记录</h2>
    <p class="muted">每条记录代表一次完整的音频冥想。</p>
    ${tickets.length ? `<ul class="record-items">${tickets.map((ticket) => `<li>${renderJourneyTicketCard(ticket, true)}</li>`).join("")}</ul>` : `<p class="empty-state">还没有记录。从冥想页开始第一次冥想。</p>`}
  `;

  section.querySelectorAll("[data-ticket-action='toggle-favorite']").forEach((button) => {
    button.addEventListener("click", () => {
      toggleTicketFavorite(button.dataset.ticketId || "");
      render("records");
    });
  });

  app.append(section);
}

function renderStats() {
  const tickets = getSortedJourneyTickets();
  const completedCount = tickets.length;
  const totalMinutes = Math.round(tickets.reduce((total, ticket) => total + getTicketDuration(ticket), 0) / 60);
  const favoriteCount = tickets.filter((ticket) => ticket.favorite).length;
  const careCount = getCareRecordCount();
  const latestTime = tickets[0] ? formatDateTime(tickets[0].createdAt) : "暂无";
  const section = document.createElement("section");
  section.className = "stats-layout";
  section.innerHTML = `
    <div class="summary-grid">
      ${metricCard("完成次数", `${completedCount} 次`, "")}
      ${metricCard("累计时长", `${totalMinutes} 分钟`, "")}
      ${metricCard("收藏记录", `${favoriteCount} 条`, "")}
      ${metricCard("关怀记录", `${careCount} 条`, "")}
    </div>
    <div class="chart-panel">
      <p class="section-kicker">趋势</p>
      <h2>最近 7 次冥想</h2>
      <div class="support-stack">
        <p>完成次数：<strong>${Math.min(tickets.length, 7)} 次</strong></p>
        <p>累计时长：<strong>${Math.round(tickets.slice(0, 7).reduce((total, ticket) => total + getTicketDuration(ticket), 0) / 60)} 分钟</strong></p>
        <p>最近一次：<strong>${latestTime}</strong></p>
        <p>关怀记录：<strong>${careCount} 条</strong></p>
      </div>
    </div>
    <div class="record-list">
      <p class="section-kicker">最近记录</p>
      <h2>最近 5 次冥想</h2>
      ${tickets.length ? `<ul class="record-items">${tickets.slice(0, 5).map((ticket) => `<li>${renderJourneyTicketCard(ticket, false)}</li>`).join("")}</ul>` : `<p class="empty-state">完成一次冥想后，这里会显示趋势。</p>`}
    </div>
  `;
  app.append(section);
}

function renderCareRecords() {
  const people = getSortedCarePeople();
  const section = document.createElement("section");
  section.className = "care-layout";
  section.innerHTML = `
    <div class="care-panel">
      <p class="section-kicker">关怀记录</p>
      <h2>记录重要的人和收到的善意</h2>
      <form class="care-form" data-care-person-form>
        <label>
          <span>名字</span>
          <input name="name" maxlength="20" required autocomplete="off" />
        </label>
        <label>
          <span>性别</span>
          <select name="gender">
            <option value="">不填写</option>
            <option value="女">女</option>
            <option value="男">男</option>
            <option value="其他">其他</option>
            <option value="不愿填写">不愿填写</option>
          </select>
        </label>
        <label>
          <span>关系</span>
          <input name="relationship" maxlength="16" required autocomplete="off" placeholder="朋友、家人、同事" />
        </label>
        <label>
          <span>生日</span>
          <input name="birthday" type="date" />
        </label>
        <button class="primary-action" type="submit">添加</button>
      </form>
    </div>
    <div class="care-list">
      ${people.length ? people.map(renderCarePersonCard).join("") : `<p class="empty-state">还没有关怀对象。先添加一个重要的人。</p>`}
    </div>
  `;

  section.querySelector("[data-care-person-form]").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const relationship = String(formData.get("relationship") || "").trim();
    if (!name || !relationship) return;

    state.carePeople = [{
      id: getSessionId(),
      name: name.slice(0, 20),
      gender: String(formData.get("gender") || "").trim(),
      relationship: relationship.slice(0, 16),
      birthday: String(formData.get("birthday") || "").trim(),
      records: [],
      createdAt: new Date().toISOString()
    }, ...state.carePeople];
    writeCarePeople();
    render("care");
  });

  section.querySelectorAll("[data-care-entry-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const personId = form.dataset.personId || "";
      const input = form.querySelector("input[name='content']");
      const content = String(input.value || "").trim().slice(0, 10);
      if (!personId || !content) return;
      addCareRecord(personId, content);
      render("care");
    });
  });

  app.append(section);
}

function renderSettings() {
  const section = document.createElement("section");
  section.className = "setting-panel";
  section.innerHTML = `
    <p class="section-kicker">设置</p>
    <h2>本地与离线</h2>
    <div class="settings-list">
      <div class="settings-item">
        <h3>冥想记录</h3>
        <p class="muted">记录只保存完成时间、冥想时长和收藏状态。</p>
        <p class="muted">当前共保存 ${state.journeyTickets.length} 条记录，全部仅保存在本设备。</p>
      </div>
      <div class="settings-item">
        <h3>关怀记录</h3>
        <p class="muted">名字、关系和关怀内容只保存在本设备。</p>
        <p class="muted">当前共保存 ${state.carePeople.length} 位重要的人，${getCareRecordCount()} 条关怀记录。</p>
      </div>
      <div class="settings-item">
        <h3>音频文件</h3>
        <p class="muted">当前可选择 ${AUDIO_TRACKS.length} 个音频，分为 ${AUDIO_CATEGORIES.length} 个分类。</p>
      </div>
      <div class="settings-item">
        <h3>更新记录</h3>
        <p class="muted">查看当前版本号、更新时间和最近更新内容。</p>
        <button class="secondary-action" data-action="view-update-history" type="button">查看更新记录</button>
      </div>
      <div class="settings-item">
        <h3>清除记录</h3>
        <p class="muted">清除后无法恢复。</p>
        <button class="danger-button" data-action="clear-records" type="button">清除全部记录</button>
      </div>
    </div>
  `;

  section.querySelector("[data-action='clear-records']").addEventListener("click", () => {
    if (!state.journeyTickets.length) return;
    const confirmed = window.confirm("确定要清除所有记录吗？此操作无法恢复。");
    if (!confirmed) return;
    state.journeyTickets = [];
    localStorage.removeItem(JOURNEY_STORAGE_KEY);
    localStorage.removeItem(LEGACY_MOOD_STORAGE_KEY);
    render("settings");
  });

  section.querySelector("[data-action='view-update-history']").addEventListener("click", () => {
    render("update-history");
  });

  app.append(section);
}

function renderUpdateHistory() {
  const section = document.createElement("section");
  section.className = "setting-panel update-history-panel";
  section.innerHTML = `
    <p class="section-kicker">更新记录</p>
    <h2>当前版本</h2>
    <div class="update-version-card" data-update-current>
      <p class="empty-state">正在读取更新记录。</p>
    </div>
    <div class="update-record-list" data-update-history></div>
    <div class="button-row journey-actions">
      <button class="ghost-button" data-action="back-settings" type="button">返回设置</button>
    </div>
  `;

  section.querySelector("[data-action='back-settings']").addEventListener("click", () => {
    render("settings");
  });

  app.append(section);
  loadUpdateHistory(section);
}

function loadUpdateHistory(section) {
  getUpdateHistory().then((entries) => {
    renderUpdateHistoryEntries(section, entries);
  }).catch(() => {
    const currentContainer = section.querySelector("[data-update-current]");
    const historyContainer = section.querySelector("[data-update-history]");
    if (currentContainer) {
      currentContainer.innerHTML = `<p class="empty-state">暂时无法读取更新记录。</p>`;
    }
    if (historyContainer) historyContainer.innerHTML = "";
  });
}

function renderUpdateHistoryEntries(section, entries) {
  const currentContainer = section.querySelector("[data-update-current]");
  const historyContainer = section.querySelector("[data-update-history]");
  if (!currentContainer || !historyContainer) return;

  if (!entries.length) {
    currentContainer.innerHTML = `<p class="empty-state">还没有更新记录。</p>`;
    historyContainer.innerHTML = "";
    return;
  }

  const latestEntry = entries[0];
  currentContainer.innerHTML = renderUpdateVersionCard(latestEntry);
  historyContainer.innerHTML = `
    <h3>历史更新</h3>
    <ul class="update-records">
      ${entries.map((entry) => `<li>${renderUpdateRecord(entry)}</li>`).join("")}
    </ul>
  `;
}

function renderUpdateVersionCard(entry) {
  return `
    <dl class="update-meta-grid">
      <div>
        <dt>版本号</dt>
        <dd>${escapeHtml(getUpdateEntryVersion(entry))}</dd>
      </div>
      <div>
        <dt>更新时间</dt>
        <dd>${escapeHtml(formatUpdateEntryTime(entry))}</dd>
      </div>
    </dl>
    <div class="update-summary-block">
      <h3>更新内容</h3>
      <p>${escapeHtml(entry.summary)}</p>
    </div>
  `;
}

function renderUpdateRecord(entry) {
  return `
    <article class="update-record">
      <div class="update-record-heading">
        <strong>${escapeHtml(getUpdateEntryVersion(entry))}</strong>
        <time>${escapeHtml(formatUpdateEntryTime(entry))}</time>
      </div>
      <p>${escapeHtml(entry.summary)}</p>
    </article>
  `;
}

function startFlow() {
  resetActiveJourney();
  render("audio-select");
}

function resetActiveJourney() {
  stopMeditationPlayback();
  state.activeJourney = createInitialJourneyState();
  resetTimer(getSelectedAudioDuration() || 0);
}

function resetTimer(totalSeconds) {
  stopTimer();
  state.timer.totalSeconds = totalSeconds;
  state.timer.remainingSeconds = totalSeconds;
  state.timer.elapsedSeconds = 0;
}

function stopTimer() {
  if (state.timer.intervalId) {
    window.clearInterval(state.timer.intervalId);
  }
  state.timer.intervalId = null;
  state.timer.runToken += 1;
  state.timer.isRunning = false;
}

function updateTimerUi(timerText, elapsedText) {
  timerText.textContent = state.timer.totalSeconds ? formatClock(state.timer.remainingSeconds) : "--:--";
  elapsedText.textContent = `已进行 ${formatClock(state.timer.elapsedSeconds)}`;
}

function readSelectedAudioId() {
  try {
    const savedId = localStorage.getItem(AUDIO_SELECTION_STORAGE_KEY);
    return AUDIO_TRACKS.some((track) => track.id === savedId) ? savedId : AUDIO_TRACKS[0].id;
  } catch {
    return AUDIO_TRACKS[0].id;
  }
}

function writeSelectedAudioId() {
  localStorage.setItem(AUDIO_SELECTION_STORAGE_KEY, state.selectedAudioId);
}

function getSelectedAudioTrack() {
  return AUDIO_TRACKS.find((track) => track.id === state.selectedAudioId) || AUDIO_TRACKS[0];
}

function getSelectedAudioDuration() {
  return state.audioDurations[getSelectedAudioTrack().id] || 0;
}

function normalizeDuration(duration) {
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  return Math.round(duration);
}

function readJourneyTickets() {
  try {
    const raw = localStorage.getItem(JOURNEY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJourneyTickets() {
  localStorage.setItem(JOURNEY_STORAGE_KEY, JSON.stringify(state.journeyTickets));
}

function readCarePeople() {
  try {
    const raw = localStorage.getItem(CARE_RECORD_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((person) => ({
      ...person,
      records: Array.isArray(person.records) ? person.records : []
    }));
  } catch {
    return [];
  }
}

function writeCarePeople() {
  localStorage.setItem(CARE_RECORD_STORAGE_KEY, JSON.stringify(state.carePeople));
}

function getSortedJourneyTickets() {
  return [...state.journeyTickets].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getJourneySummary(tickets) {
  return {
    count: tickets.length,
    minutes: Math.round(tickets.reduce((total, ticket) => total + getTicketDuration(ticket), 0) / 60)
  };
}

function getMostCommonLabel(items) {
  if (!items.length) return "暂无";
  const counts = new Map();
  items.forEach((item) => {
    counts.set(item, (counts.get(item) || 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function toggleTicketFavorite(ticketId) {
  state.journeyTickets = state.journeyTickets.map((ticket) => {
    if (ticket.id !== ticketId) return ticket;
    return {
      ...ticket,
      favorite: !ticket.favorite
    };
  });
  writeJourneyTickets();
}

function findTicketById(ticketId) {
  return state.journeyTickets.find((ticket) => ticket.id === ticketId) || null;
}

function getSessionId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `session-${Date.now()}`;
}

function renderJourneyTicketCard(ticket, showActions) {
  return `
    <article class="record-card ticket-card ${ticket.favorite ? "is-favorite" : ""}">
      <header>
        <div class="ticket-heading">
          <span class="result-badge">${escapeHtml(getSessionType(ticket))}</span>
          <time datetime="${ticket.createdAt}">${formatDateTime(ticket.createdAt)}</time>
        </div>
        <span class="ticket-no">${formatJourneyNumber(ticket.journeyNo)}</span>
      </header>
      <strong>${escapeHtml(getTicketAudioTitle(ticket))}</strong>
      <div class="ticket-meta">
        <span>冥想时长 ${formatClock(getTicketDuration(ticket))}</span>
        <span>${ticket.favorite ? "已收藏" : "未收藏"}</span>
      </div>
      <p class="ticket-quote">${escapeHtml(ticket.quote)}</p>
      ${showActions ? `
        <div class="ticket-actions">
          <button class="ghost-button ticket-action-button" data-ticket-action="toggle-favorite" data-ticket-id="${ticket.id}" type="button">
            ${ticket.favorite ? "取消收藏" : "收藏记录"}
          </button>
        </div>
      ` : ""}
    </article>
  `;
}

function renderCarePersonCard(person) {
  const records = Array.isArray(person.records) ? person.records : [];
  const latestRecord = records[0] || null;
  return `
    <article class="care-card">
      <header>
        <div>
          <strong>${escapeHtml(person.name)}</strong>
          <p>${escapeHtml(person.relationship)}</p>
        </div>
        <span class="care-score">+${getCareScore(person)}</span>
      </header>
      <div class="care-meta">
        ${person.gender ? `<span>${escapeHtml(person.gender)}</span>` : ""}
        ${person.birthday ? `<span>生日 ${escapeHtml(formatBirthday(person.birthday))}</span>` : ""}
        <span>${records.length} 条关怀</span>
      </div>
      <form class="care-entry-form" data-care-entry-form data-person-id="${escapeAttribute(person.id)}">
        <input name="content" maxlength="10" required autocomplete="off" placeholder="10字以内" />
        <button class="secondary-action" type="submit">+1</button>
      </form>
      ${latestRecord ? `
        <div class="care-recent">
          <span>最近</span>
          <strong>${escapeHtml(latestRecord.content)}</strong>
          <time datetime="${latestRecord.createdAt}">${formatDateTime(latestRecord.createdAt)}</time>
        </div>
      ` : `<p class="empty-state compact">还没有记录收到的关怀。</p>`}
      ${records.length > 1 ? `
        <ul class="care-records">
          ${records.slice(1, 4).map((record) => `
            <li>
              <span>${escapeHtml(record.content)}</span>
              <time datetime="${record.createdAt}">${formatDateTime(record.createdAt)}</time>
            </li>
          `).join("")}
        </ul>
      ` : ""}
    </article>
  `;
}

function addCareRecord(personId, content) {
  state.carePeople = state.carePeople.map((person) => {
    if (person.id !== personId) return person;
    const records = Array.isArray(person.records) ? person.records : [];
    return {
      ...person,
      records: [{
        id: getSessionId(),
        content,
        score: 1,
        createdAt: new Date().toISOString()
      }, ...records]
    };
  });
  writeCarePeople();
}

function getCareScore(person) {
  const records = Array.isArray(person.records) ? person.records : [];
  return records.reduce((total, record) => total + (Number(record.score) || 1), 0);
}

function getCareRecordCount() {
  return state.carePeople.reduce((total, person) => {
    const records = Array.isArray(person.records) ? person.records : [];
    return total + records.length;
  }, 0);
}

function getSortedCarePeople() {
  return [...state.carePeople].sort((a, b) => {
    const latestA = getLatestCareTime(a);
    const latestB = getLatestCareTime(b);
    return new Date(latestB) - new Date(latestA);
  });
}

function getLatestCareTime(person) {
  const records = Array.isArray(person.records) ? person.records : [];
  return records[0]?.createdAt || person.createdAt || "";
}

function getSessionType(ticket) {
  return ticket.sessionType || ticket.trainType || "冥想";
}

function getTicketDuration(ticket) {
  return Number(ticket.durationSeconds) || DEFAULT_DURATION_SECONDS;
}

function getTicketAudioTitle(ticket) {
  return ticket.audioTitle || getSessionType(ticket);
}

function metricCard(label, value, suffix) {
  return `
    <article class="metric-card">
      <span>${label}</span>
      <strong>${escapeHtml(value)}</strong>
      ${suffix ? `<small>${escapeHtml(suffix)}</small>` : ""}
    </article>
  `;
}

function getJourneyGuide(elapsedSeconds) {
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

function formatJourneyNumber(value) {
  return `#${String(value).padStart(4, "0")}`;
}

function formatClock(seconds) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatBirthday(value) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric"
  }).format(date);
}

function escapeAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cssEscape(value) {
  if (globalThis.CSS && typeof globalThis.CSS.escape === "function") {
    return globalThis.CSS.escape(value);
  }
  return String(value).replaceAll('"', '\\"');
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!isRefreshingForUpdate) return;
      window.location.reload();
    });

    navigator.serviceWorker.register("service-worker.js").then((registration) => {
      if (registration.waiting && navigator.serviceWorker.controller) {
        notifyUpdateAvailable(registration.waiting);
      }

      registration.addEventListener("updatefound", () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        installingWorker.addEventListener("statechange", () => {
          if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
            notifyUpdateAvailable(installingWorker);
          }
        });
      });

      window.setInterval(() => {
        registration.update().catch(() => {});
        checkForCodeUpdates();
      }, UPDATE_CHECK_INTERVAL_MS);

      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState !== "visible") return;
        registration.update().catch(() => {});
        checkForCodeUpdates();
      });

      checkForCodeUpdates();
    }).catch(() => {
      // The app still works without offline caching.
    });
  });
}

function notifyUpdateAvailable(worker) {
  showUpdatePrompt(worker, null);
  getLatestUpdateSummary().then((summary) => {
    if (summary) updateUpdatePromptSummary(summary);
  }).catch(() => {});
}

function showUpdatePrompt(worker, summary) {
  pendingUpdateWorker = worker;
  const existingPrompt = document.querySelector("[data-update-prompt]");
  if (existingPrompt) {
    if (summary) updateUpdatePromptSummary(summary);
    return;
  }

  const prompt = document.createElement("aside");
  prompt.className = "update-prompt";
  prompt.dataset.updatePrompt = "";
  prompt.setAttribute("role", "status");
  prompt.setAttribute("aria-live", "polite");
  prompt.innerHTML = `
    <div>
      <strong>发现新版本</strong>
      <p data-update-summary>${escapeHtml(summary || UPDATE_SUMMARY_FALLBACK)}</p>
    </div>
    <button class="primary-action" data-action="apply-update" type="button">刷新</button>
  `;

  prompt.querySelector("[data-action='apply-update']").addEventListener("click", () => {
    applyPendingUpdate();
  });

  document.body.append(prompt);
}

function updateUpdatePromptSummary(summary) {
  const summaryElement = document.querySelector("[data-update-summary]");
  if (!summaryElement) return;
  summaryElement.textContent = summary;
}

function applyPendingUpdate() {
  if (!pendingUpdateWorker) {
    clearAppCaches().finally(() => {
      window.location.reload();
    });
    return;
  }

  isRefreshingForUpdate = true;
  pendingUpdateWorker.postMessage({ type: "SKIP_WAITING" });
  window.setTimeout(() => {
    window.location.reload();
  }, 5000);
}

function checkForCodeUpdates() {
  if (document.querySelector("[data-update-prompt]")) return;

  getCurrentCodeFingerprint().then((fingerprint) => {
    const savedFingerprint = readUpdateFingerprint();
    if (!savedFingerprint) {
      writeUpdateFingerprint(fingerprint);
      return;
    }

    if (savedFingerprint !== fingerprint) {
      writeUpdateFingerprint(fingerprint);
      notifyUpdateAvailable(null);
    }
  }).catch(() => {});
}

function getLatestUpdateSummary() {
  return getUpdateHistory().then((entries) => {
    const entry = entries[0];
    if (!entry) return "";
    return String(entry.summary || "").trim();
  });
}

function getUpdateHistory() {
  const stamp = Date.now();
  const url = new URL(UPDATE_SUMMARY_URL, window.location.href);
  url.searchParams.set("update-check", String(stamp));

  return fetch(url, { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error("Update summary failed");
      return response.json();
    })
    .then((payload) => {
      return getUpdateEntries(payload).sort((leftEntry, rightEntry) => {
        return getUpdateEntryTime(rightEntry) - getUpdateEntryTime(leftEntry);
      });
    });
}

function getUpdateEntries(payload) {
  const entries = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.updates)
      ? payload.updates
      : payload?.latest
        ? [payload.latest]
        : [payload];

  return entries
    .filter((entry) => entry && typeof entry === "object" && entry.summary)
    .map((entry) => ({
      ...entry,
      summary: String(entry.summary || "").trim()
    }));
}

function getUpdateEntryVersion(entry) {
  return String(entry.version || "未标注版本");
}

function getUpdateEntryTime(entry) {
  const releasedAt = Date.parse(entry.releasedAt || entry.date || "");
  return Number.isNaN(releasedAt) ? 0 : releasedAt;
}

function formatUpdateEntryTime(entry) {
  const timestamp = getUpdateEntryTime(entry);
  if (!timestamp) return "未标注时间";
  return formatDateTime(new Date(timestamp).toISOString());
}

function getCurrentCodeFingerprint() {
  const stamp = Date.now();
  return Promise.all(APP_UPDATE_ASSETS.map((asset) => {
    const url = new URL(asset, window.location.href);
    url.searchParams.set("update-check", String(stamp));
    return fetch(url, { cache: "no-store" }).then((response) => {
      if (!response.ok) throw new Error("Update check failed");
      return response.text();
    }).then((text) => `${asset}:${text.length}:${hashString(text)}`);
  })).then((parts) => parts.join("|"));
}

function readUpdateFingerprint() {
  try {
    return localStorage.getItem(UPDATE_FINGERPRINT_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function writeUpdateFingerprint(fingerprint) {
  try {
    localStorage.setItem(UPDATE_FINGERPRINT_STORAGE_KEY, fingerprint);
  } catch {
    // Update checks still work for the current session without persisted state.
  }
}

function clearAppCaches() {
  if (!("caches" in window)) return Promise.resolve();

  return caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith("heart-haven-")).map((key) => caches.delete(key))
  )).then(() => undefined).catch(() => undefined);
}

function hashString(value) {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
}
