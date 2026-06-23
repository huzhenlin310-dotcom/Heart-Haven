type UpdateNoticeProps = {
  summary: string;
  onApply: () => void;
};

export function UpdateNotice({ summary, onApply }: UpdateNoticeProps) {
  return (
    <aside className="update-prompt" role="status" aria-live="polite">
      <div>
        <strong>发现新版本</strong>
        <p>{summary}</p>
      </div>
      <button className="primary-action" type="button" onClick={onApply}>刷新</button>
    </aside>
  );
}
