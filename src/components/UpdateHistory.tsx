import { useEffect, useState } from "react";
import type { UpdateItem } from "../types";
import { formatUpdateEntryTime, getUpdateEntryVersion, getUpdateHistory } from "../utils/updates";

type UpdateHistoryProps = {
  onBack: () => void;
};

export function UpdateHistory({ onBack }: UpdateHistoryProps) {
  const [entries, setEntries] = useState<UpdateItem[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let canceled = false;
    getUpdateHistory()
      .then((nextEntries) => {
        if (!canceled) setEntries(nextEntries);
      })
      .catch(() => {
        if (!canceled) setFailed(true);
      });
    return () => {
      canceled = true;
    };
  }, []);

  const latestEntry = entries?.[0] || null;

  return (
    <section className="setting-panel update-history-panel">
      <p className="section-kicker">更新记录</p>
      <h2>当前版本</h2>
      <div className="update-version-card">
        {failed ? <p className="empty-state">暂时无法读取更新记录。</p> : null}
        {!failed && !entries ? <p className="empty-state">正在读取更新记录。</p> : null}
        {!failed && entries && !latestEntry ? <p className="empty-state">还没有更新记录。</p> : null}
        {latestEntry ? <UpdateVersionCard entry={latestEntry} /> : null}
      </div>
      {entries?.length ? (
        <div className="update-record-list">
          <h3>历史更新</h3>
          <ul className="update-records">
            {entries.map((entry) => (
              <li key={`${getUpdateEntryVersion(entry)}-${formatUpdateEntryTime(entry)}`}>
                <UpdateRecord entry={entry} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="button-row journey-actions">
        <button className="ghost-button" type="button" onClick={onBack}>返回设置</button>
      </div>
    </section>
  );
}

function UpdateVersionCard({ entry }: { entry: UpdateItem }) {
  return (
    <>
      <dl className="update-meta-grid">
        <div>
          <dt>版本号</dt>
          <dd>{getUpdateEntryVersion(entry)}</dd>
        </div>
        <div>
          <dt>更新时间</dt>
          <dd>{formatUpdateEntryTime(entry)}</dd>
        </div>
      </dl>
      <div className="update-summary-block">
        <h3>更新内容</h3>
        <p>{entry.summary}</p>
      </div>
    </>
  );
}

function UpdateRecord({ entry }: { entry: UpdateItem }) {
  return (
    <article className="update-record">
      <div className="update-record-heading">
        <strong>{getUpdateEntryVersion(entry)}</strong>
        <time>{formatUpdateEntryTime(entry)}</time>
      </div>
      <p>{entry.summary}</p>
    </article>
  );
}
