import { AUDIO_CATEGORIES, AUDIO_TRACKS } from "../data/audio";
import type { AudioTrack } from "../types";
import { formatClock } from "../utils/format";

type AudioSelectProps = {
  selectedAudioId: string;
  audioDurations: Record<string, number>;
  onSelectAudio: (audioId: string) => void;
  onBegin: () => void;
  onBack: () => void;
};

export function AudioSelect({
  selectedAudioId,
  audioDurations,
  onSelectAudio,
  onBegin,
  onBack
}: AudioSelectProps) {
  return (
    <section className="flow-panel audio-select-panel">
      <p className="section-kicker">选择音频</p>
      <h2>选择这次要使用的冥想音频</h2>
      <div className="audio-picker" aria-label="选择冥想音频">
        <div className="audio-options">
          {AUDIO_CATEGORIES.map((category) => (
            <details className="audio-category" key={category.id} open={category.isOpen}>
              <summary>
                <span>
                  <strong>{category.title}</strong>
                  <small>{category.description}</small>
                </span>
                <em>{category.tracks.length} 个音频</em>
              </summary>
              <div className="audio-category-tracks">
                {category.tracks.length ? (
                  category.tracks.map((track) => {
                    const fullTrack = AUDIO_TRACKS.find((candidate) => candidate.id === track.id) as AudioTrack;
                    const selected = selectedAudioId === track.id;
                    return (
                      <button
                        className={`audio-option ${selected ? "is-selected" : ""}`}
                        key={track.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => onSelectAudio(track.id)}
                      >
                        <span className="audio-option-title">{track.title}</span>
                        <span className="audio-option-duration">
                          {audioDurations[fullTrack.id] ? formatClock(audioDurations[fullTrack.id]) : "读取中"}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <p className="empty-state compact">这里暂时还没有音频。</p>
                )}
              </div>
            </details>
          ))}
        </div>
      </div>
      <div className="button-row journey-actions">
        <button className="ghost-button" type="button" onClick={onBack}>
          返回
        </button>
        <button className="primary-action" type="button" onClick={onBegin}>
          开始冥想
        </button>
      </div>
    </section>
  );
}
