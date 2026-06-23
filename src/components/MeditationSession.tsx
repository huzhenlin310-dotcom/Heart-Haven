import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { DEFAULT_DURATION_SECONDS, JOURNEY_QUOTES, MIN_RECORD_SECONDS } from "../constants";
import type { AudioTrack, JourneyTicket } from "../types";
import { formatClock } from "../utils/format";
import { getSessionId } from "../utils/id";
import { getJourneyGuide, normalizeDuration } from "../utils/meditation";

export type MeditationProgress = {
  elapsedSeconds: number;
  isRunning: boolean;
};

export type MeditationSessionHandle = {
  finish: (options?: { forceRecord?: boolean }) => boolean;
  getProgress: () => MeditationProgress;
};

type MeditationSessionProps = {
  selectedTrack: AudioTrack;
  knownDuration: number;
  ticketCount: number;
  onDurationLoaded: (trackId: string, duration: number) => void;
  onSaved: (ticket: JourneyTicket) => void;
  onCanceled: () => void;
  onProgressChange: (progress: MeditationProgress) => void;
};

export const MeditationSession = forwardRef<MeditationSessionHandle, MeditationSessionProps>(
  ({ selectedTrack, knownDuration, ticketCount, onDurationLoaded, onSaved, onCanceled, onProgressChange }, ref) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const intervalRef = useRef<number | null>(null);
    const runTokenRef = useRef(0);
    const [totalSeconds, setTotalSeconds] = useState(knownDuration || DEFAULT_DURATION_SECONDS);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [remainingSeconds, setRemainingSeconds] = useState(knownDuration || DEFAULT_DURATION_SECONDS);
    const [isRunning, setIsRunning] = useState(false);
    const [status, setStatus] = useState("音频准备中。");
    const [audioReady, setAudioReady] = useState(Boolean(knownDuration));

    const breathLabel = elapsedSeconds % 8 < 4 ? "吸气" : "呼气";
    const guideCopy = useMemo(() => getJourneyGuide(elapsedSeconds), [elapsedSeconds]);

    useEffect(() => {
      return () => stopPlayback(false);
    }, []);

    useEffect(() => {
      onProgressChange({ elapsedSeconds, isRunning });
    }, [elapsedSeconds, isRunning, onProgressChange]);

    useImperativeHandle(ref, () => ({
      finish: ({ forceRecord = false } = {}) => finishMeditation(forceRecord),
      getProgress: () => ({ elapsedSeconds: getMeditationElapsedSeconds(), isRunning })
    }));

    function stopTimer() {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
      runTokenRef.current += 1;
      setIsRunning(false);
    }

    function stopPlayback(resetAudio: boolean) {
      stopTimer();
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        if (resetAudio) audio.currentTime = 0;
      }
    }

    function updateProgress(nextElapsed: number, nextTotal = totalSeconds) {
      const safeElapsed = Math.max(0, Number(nextElapsed) || 0);
      const clampedElapsed = nextTotal ? Math.min(safeElapsed, nextTotal) : safeElapsed;
      setElapsedSeconds(clampedElapsed);
      setRemainingSeconds(nextTotal ? Math.max(0, nextTotal - clampedElapsed) : 0);
    }

    function syncTimerFromAudio(audio: HTMLAudioElement) {
      const duration = normalizeDuration(audio.duration);
      const nextTotal = duration || totalSeconds;
      if (duration && duration !== totalSeconds) {
        setTotalSeconds(duration);
        onDurationLoaded(selectedTrack.id, duration);
      }
      const nextElapsed = Number.isFinite(audio.currentTime) ? Math.floor(audio.currentTime) : elapsedSeconds;
      updateProgress(nextElapsed, nextTotal);
    }

    function getMeditationElapsedSeconds() {
      let currentElapsed = Math.max(0, Number(elapsedSeconds) || 0);
      const audio = audioRef.current;
      if (audio && Number.isFinite(audio.currentTime)) {
        currentElapsed = Math.max(currentElapsed, Math.floor(audio.currentTime));
      }
      return totalSeconds ? Math.min(currentElapsed, totalSeconds) : currentElapsed;
    }

    function startSilentTimer(runToken: number) {
      const startedAt = performance.now();
      const startElapsed = elapsedSeconds;
      intervalRef.current = window.setInterval(() => {
        if (runTokenRef.current !== runToken) return;
        const nextElapsed = startElapsed + Math.floor((performance.now() - startedAt) / 1000);
        updateProgress(nextElapsed);
        if (totalSeconds && nextElapsed >= totalSeconds) finishMeditation(true);
      }, 250);
    }

    function startMeditation() {
      stopTimer();
      const runToken = runTokenRef.current + 1;
      runTokenRef.current = runToken;
      setIsRunning(true);
      setStatus("正在启动音频。");

      const audio = audioRef.current;
      if (!audio) {
        setStatus("浏览器未能播放音频，当前为静默冥想。");
        startSilentTimer(runToken);
        return;
      }

      audio.play().then(() => {
        if (runTokenRef.current !== runToken) {
          audio.pause();
          return;
        }
        setStatus("冥想进行中。");
        syncTimerFromAudio(audio);
        intervalRef.current = window.setInterval(() => {
          if (runTokenRef.current !== runToken) return;
          syncTimerFromAudio(audio);
          if (remainingSeconds === 0) finishMeditation(true);
        }, 250);
      }).catch(() => {
        if (runTokenRef.current !== runToken) return;
        setStatus("浏览器未能播放音频，当前为静默冥想。");
        startSilentTimer(runToken);
      });
    }

    function pauseMeditation() {
      const currentElapsed = getMeditationElapsedSeconds();
      stopPlayback(false);
      updateProgress(currentElapsed);
      setStatus("冥想已暂停。");
    }

    function saveTicket(durationSeconds: number) {
      const journeyNo = ticketCount + 1;
      const ticket: JourneyTicket = {
        id: getSessionId(),
        journeyNo,
        durationSeconds: Math.max(
          1,
          Math.round(durationSeconds || elapsedSeconds || totalSeconds || knownDuration || DEFAULT_DURATION_SECONDS)
        ),
        sessionType: "冥想",
        audioTitle: selectedTrack.title,
        audioSrc: selectedTrack.src,
        quote: JOURNEY_QUOTES[(journeyNo - 1) % JOURNEY_QUOTES.length],
        favorite: false,
        createdAt: new Date().toISOString()
      };
      onSaved(ticket);
    }

    function finishMeditation(forceRecord = false) {
      const currentElapsed = getMeditationElapsedSeconds();
      stopPlayback(true);

      if (forceRecord || currentElapsed >= MIN_RECORD_SECONDS) {
        saveTicket(currentElapsed);
        return true;
      }

      onCanceled();
      return false;
    }

    function handleCancel() {
      const currentElapsed = getMeditationElapsedSeconds();
      const willRecord = currentElapsed >= MIN_RECORD_SECONDS;
      const message = willRecord
        ? `确定结束本次冥想吗？已进行 ${formatClock(currentElapsed)}，会保存记录。`
        : `确定结束本次冥想吗？已进行 ${formatClock(currentElapsed)}，满 ${formatClock(MIN_RECORD_SECONDS)} 才会保存记录。`;
      if (!window.confirm(message)) return;
      finishMeditation(false);
    }

    return (
      <section className="meditation-panel">
        <p className="section-kicker">冥想进行中</p>
        <h2>{selectedTrack.title}</h2>
        <div className="journey-intro">
          <div className="journey-meta-chip">{totalSeconds ? formatClock(totalSeconds) : "读取时长中"}</div>
        </div>
        <div className="timer-display" aria-live="polite">
          <span>{totalSeconds ? formatClock(remainingSeconds) : "--:--"}</span>
          <small>已进行 {formatClock(elapsedSeconds)}</small>
        </div>
        <div className="breathing-guide" aria-hidden="true">
          <div className="breathing-core" />
          <span>{breathLabel}</span>
        </div>
        <div className="result-group">
          <h3>当下提示</h3>
          <p>{guideCopy}</p>
        </div>
        <audio
          ref={audioRef}
          preload="metadata"
          src={selectedTrack.src}
          onLoadedMetadata={(event) => {
            const duration = normalizeDuration(event.currentTarget.duration);
            if (!duration) return;
            setAudioReady(true);
            setTotalSeconds(duration);
            setRemainingSeconds(Math.max(0, duration - elapsedSeconds));
            onDurationLoaded(selectedTrack.id, duration);
            setStatus("音频已就绪。");
          }}
          onError={() => {
            setAudioReady(false);
            setStatus("音频无法加载，请返回选择其他音频。");
          }}
          onEnded={() => {
            if (isRunning) finishMeditation(true);
          }}
        />
        <p className="audio-status" role="status">{status}</p>
        <div className="button-row journey-actions">
          <button
            className="secondary-action"
            type="button"
            disabled={!audioReady && !totalSeconds}
            onClick={() => {
              if (isRunning) pauseMeditation();
              else startMeditation();
            }}
          >
            {isRunning ? "暂停冥想" : elapsedSeconds ? "继续冥想" : "开始冥想"}
          </button>
          <button className="ghost-button" type="button" onClick={handleCancel}>
            结束冥想
          </button>
        </div>
      </section>
    );
  }
);

MeditationSession.displayName = "MeditationSession";
