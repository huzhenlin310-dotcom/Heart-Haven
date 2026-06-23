import type { CarePerson } from "../types";
import { formatDateTime } from "../utils/format";
import { QuickDetailForm } from "./QuickDetailForm";

type CarePersonDetailProps = {
  person: CarePerson;
  onBack: () => void;
  onUpdateBirthday: (personId: string, birthday: string) => void;
  onAddRecord: (personId: string, content: string) => void;
};

export function CarePersonDetail({ person, onBack, onUpdateBirthday, onAddRecord }: CarePersonDetailProps) {
  return (
    <section className="care-detail-layout">
      <div className="care-panel">
        <p className="section-kicker">专属页面</p>
        <h2>{person.name}</h2>
        <div className="care-meta">
          {person.relationship ? <span>{person.relationship}</span> : null}
          {person.gender ? <span>{person.gender}</span> : null}
          <span>{person.records.length} 条关怀</span>
        </div>
        <form
          className="care-form care-edit-form"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            onUpdateBirthday(person.id, String(formData.get("birthday") || "").trim());
          }}
        >
          <label>
            <span>生日</span>
            <input name="birthday" type="date" defaultValue={person.birthday || ""} />
          </label>
          <button className="primary-action" type="submit">保存生日</button>
        </form>
        <QuickDetailForm personId={person.id} onAddRecord={onAddRecord} />
        <button className="ghost-button" type="button" onClick={onBack}>返回关怀</button>
      </div>
      <div className="record-list care-full-records">
        <p className="section-kicker">所有记录</p>
        <h2>收到的善意</h2>
        {person.records.length ? (
          <ul className="care-records full-list">
            {person.records.map((record) => (
              <li key={record.id}>
                <span>{record.content}</span>
                <time dateTime={record.createdAt}>{formatDateTime(record.createdAt)}</time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">还没有记录收到的关怀。</p>
        )}
      </div>
    </section>
  );
}
