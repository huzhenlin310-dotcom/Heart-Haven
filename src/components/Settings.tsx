import { LEGACY_MOOD_STORAGE_KEY } from "../constants";
import { AUDIO_CATEGORIES, AUDIO_TRACKS } from "../data/audio";
import type { CarePerson, JourneyTicket } from "../types";
import { getCareRecordCount } from "../utils/stats";

type SettingsProps = {
  tickets: JourneyTicket[];
  people: CarePerson[];
  onClearTickets: () => void;
  onUpdateHistory: () => void;
};

export function Settings({ tickets, people, onClearTickets, onUpdateHistory }: SettingsProps) {
  return (
    <section className="setting-panel">
      <p className="section-kicker">设置</p>
      <h2>本地与离线</h2>
      <div className="settings-list">
        <div className="settings-item">
          <h3>冥想记录</h3>
          <p className="muted">记录只保存完成时间、冥想时长和收藏状态。</p>
          <p className="muted">当前共保存 {tickets.length} 条记录，全部仅保存在本设备。</p>
        </div>
        <div className="settings-item">
          <h3>关怀记录</h3>
          <p className="muted">名字、关系和关怀内容只保存在本设备。</p>
          <p className="muted">当前共保存 {people.length} 位重要的人，{getCareRecordCount(people)} 条关怀记录。</p>
        </div>
        <div className="settings-item">
          <h3>音频文件</h3>
          <p className="muted">当前可选择 {AUDIO_TRACKS.length} 个音频，分为 {AUDIO_CATEGORIES.length} 个分类。</p>
        </div>
        <div className="settings-item">
          <h3>更新记录</h3>
          <p className="muted">查看当前版本号、更新时间和最近更新内容。</p>
          <button className="secondary-action" type="button" onClick={onUpdateHistory}>查看更新记录</button>
        </div>
        <div className="settings-item">
          <h3>清除记录</h3>
          <p className="muted">清除后无法恢复。</p>
          <button
            className="danger-button"
            type="button"
            onClick={() => {
              if (!tickets.length) return;
              if (!window.confirm("确定要清除所有记录吗？此操作无法恢复。")) return;
              localStorage.removeItem(LEGACY_MOOD_STORAGE_KEY);
              onClearTickets();
            }}
          >
            清除全部记录
          </button>
        </div>
      </div>
    </section>
  );
}
