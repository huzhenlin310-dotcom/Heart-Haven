import { useCallback, useEffect, useState } from "react";
import type { UpdateItem } from "../types";
import { formatUpdateEntryTime, getUpdateEntryVersion, getUpdateHistory } from "../utils/updates";

type UpdateHistoryProps = {
  onBack: () => void;
};

export function UpdateHistory({ onBack }: UpdateHistoryProps) {
  const [entries, setEntries] = useState<UpdateItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState("");

  const refreshEntries = useCallback(async () => {
    setRefreshing(true);
    setFailed(false);
    setStatus(entries ? "正在刷新更新记录。" : "");

    try {
      const nextEntries = await getUpdateHistory();
      setEntries(nextEntries);
      setStatus("已刷新到最新更新记录。");
    } catch {
      setFailed(true);
      setStatus("刷新失败，请稍后再试。");
    } finally {
      setRefreshing(false);
    }
  }, [entries]);

  useEffect(() => {
    let canceled = false;
    setRefreshing(true);

    getUpdateHistory().then((nextEntries) => {
      if (canceled) return;
      setEntries(nextEntries);
      setFailed(false);
    }).catch(() => {
      if (canceled) return;
      setFailed(true);
    }).finally(() => {
      if (!canceled) setRefreshing(false);
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
      {status ? <p className="audio-status" role="status">{status}</p> : null}
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
        <button className="secondary-action" type="button" disabled={refreshing} onClick={refreshEntries}>
          {refreshing ? "刷新中" : "刷新"}
        </button>
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
