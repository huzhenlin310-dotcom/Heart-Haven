const JOURNEY_STORAGE_KEY = "heart-haven.journey-tickets.v1";
const LEGACY_MOOD_STORAGE_KEY = "heart-haven.mood-entries.v1";
const AUDIO_SELECTION_STORAGE_KEY = "heart-haven.selected-audio.v1";
const UPDATE_FINGERPRINT_STORAGE_KEY = "heart-haven.update-fingerprint.v1";
const DEFAULT_DURATION_SECONDS = 20 * 60;
const MIN_RECORD_SECONDS = 3 * 60;
const AUDIO_TRACKS = [
  {
    id: "live-happier-life",
    title: "更快乐地生活",
    src: "assets/audio/001Live a Happier Life.m4a",
    durationSeconds: 545
  },
  {
    id: "love-yourself",
    title: "如何爱自己",
    src: "assets/audio/002How To Love Yourself.mp3",
    durationSeconds: 334
  },
  {
    id: "loving-kindness",
    title: "慈心冥想",
    src: "assets/audio/003Loving Kindness Meditation.mp3",
    durationSeconds: 1399
  },
  {
    id: "soul-passcode-one",
    title: "寻找灵魂密码（上）",
    src: "assets/audio/004Finding the Passcode to Your Soul Part One.mp3",
    durationSeconds: 680
  },
  {
    id: "soul-passcode-two",
    title: "寻找灵魂密码（下）",
    src: "assets/audio/005Finding the Passcode to Your Soul Part Two.mp3",
    durationSeconds: 851
  },
  {
    id: "acceptance-giving",
    title: "接纳与给予冥想",
    src: "assets/audio/006Acceptance and Giving Meditation.mp4",
    durationSeconds: 1284
  },
  {
    id: "self-shame",
    title: "从自我羞耻中释放",
    src: "assets/audio/007Free Yourself from Self-Shame.mp3",
    durationSeconds: 1739
  },
  {
    id: "compassionate-friend",
    title: "找到你的慈悲朋友",
    src: "assets/audio/008Find Your Compassionate Friend.mp3",
    durationSeconds: 1297
  },
  {
    id: "intimate-relationships",
    title: "亲密关系中的自我慈悲指南",
    src: "assets/audio/009A Self-Compassion Guide for Intimate Relationships.m4a",
    durationSeconds: 1608
  }
];
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
  selectedAudioId: AUDIO_TRACKS[0].id,
  audioDurations: Object.fromEntries(AUDIO_TRACKS.map((track) => [track.id, track.durationSeconds])),
  activeJourney: createInitialJourneyState(),
  timer: {
    totalSeconds: DEFAULT_DURATION_SECONDS,
    remainingSeconds: DEFAULT_DURATION_SECONDS,
    elapsedSeconds: 0,
    intervalId: null,
    isRunning: false
  }
};

const app = document.querySelector("#app");
const navItems = [...document.querySelectorAll(".nav-item")];
const sideNav = document.querySelector(".side-nav");
const ROUTES = ["home", "records", "stats", "settings"];
const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;
const APP_UPDATE_ASSETS = [
  "index.html",
  "styles.css",
  "app.js",
  "service-worker.js",
  "manifest.webmanifest"
];

let currentMeditationAudio = null;
let sidebarTouchStartY = 0;
let lastSidebarSwitchAt = 0;
let pendingUpdateWorker = null;
let isRefreshingForUpdate = false;

document.addEventListener("DOMContentLoaded", init);

function init() {
  state.journeyTickets = readJourneyTickets();
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
  if (route === "settings") renderSettings();

  app.focus({ preventScroll: true });
}

function updateNav(route) {
  const internalRoutes = new Set(["audio-select", "meditate", "journey-result"]);
  const activeRoute = internalRoutes.has(route) ? "home" : route;
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
        ${AUDIO_TRACKS.map((track) => renderAudioOption(track)).join("")}
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
  state.activeJourney.isInProgress = true;
  state.timer.isRunning = true;
  toggleButton.textContent = "暂停冥想";
  status.textContent = "冥想进行中。";

  audio.play().catch(() => {
    status.textContent = "浏览器未能播放音频，当前为静默冥想。";
  });

  state.timer.intervalId = window.setInterval(() => {
    state.timer.elapsedSeconds += 1;
    state.timer.remainingSeconds = Math.max(0, state.timer.totalSeconds - state.timer.elapsedSeconds);
    breathLabel.textContent = state.timer.elapsedSeconds % 8 < 4 ? "吸气" : "呼气";
    guideCopy.textContent = getJourneyGuide(state.timer.elapsedSeconds);
    updateTimerUi(timerText, elapsedText);

    if (state.timer.remainingSeconds === 0) {
      completeMeditation(audio);
    }
  }, 1000);
}

function pauseMeditation(audio, toggleButton, status) {
  stopTimer();
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
  const latestTime = tickets[0] ? formatDateTime(tickets[0].createdAt) : "暂无";
  const section = document.createElement("section");
  section.className = "stats-layout";
  section.innerHTML = `
    <div class="summary-grid">
      ${metricCard("完成次数", `${completedCount} 次`, "")}
      ${metricCard("累计时长", `${totalMinutes} 分钟`, "")}
      ${metricCard("收藏记录", `${favoriteCount} 条`, "")}
      ${metricCard("最近一次", latestTime, "")}
    </div>
    <div class="chart-panel">
      <p class="section-kicker">趋势</p>
      <h2>最近 7 次冥想</h2>
      <div class="support-stack">
        <p>完成次数：<strong>${Math.min(tickets.length, 7)} 次</strong></p>
        <p>累计时长：<strong>${Math.round(tickets.slice(0, 7).reduce((total, ticket) => total + getTicketDuration(ticket), 0) / 60)} 分钟</strong></p>
        <p>最近一次：<strong>${latestTime}</strong></p>
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
        <h3>音频文件</h3>
        <p class="muted">当前可选择 ${AUDIO_TRACKS.length} 个冥想音频。</p>
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

  app.append(section);
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
        showUpdatePrompt(registration.waiting);
      }

      registration.addEventListener("updatefound", () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        installingWorker.addEventListener("statechange", () => {
          if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
            showUpdatePrompt(installingWorker);
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

function showUpdatePrompt(worker) {
  pendingUpdateWorker = worker;
  if (document.querySelector("[data-update-prompt]")) return;

  const prompt = document.createElement("aside");
  prompt.className = "update-prompt";
  prompt.dataset.updatePrompt = "";
  prompt.setAttribute("role", "status");
  prompt.setAttribute("aria-live", "polite");
  prompt.innerHTML = `
    <div>
      <strong>发现新版本</strong>
      <p>刷新后即可使用最新内容。</p>
    </div>
    <button class="primary-action" data-action="apply-update" type="button">刷新</button>
  `;

  prompt.querySelector("[data-action='apply-update']").addEventListener("click", () => {
    applyPendingUpdate();
  });

  document.body.append(prompt);
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
      showUpdatePrompt(null);
    }
  }).catch(() => {});
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
