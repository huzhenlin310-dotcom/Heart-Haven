import type { CarePerson } from "../types";
import { formatBirthday, formatDateTime } from "../utils/format";
import { getCareScore, getSortedCarePeople } from "../utils/stats";

type CareViewProps = {
  people: CarePerson[];
  onAddPerson: (person: Omit<CarePerson, "id" | "records" | "createdAt">) => void;
  onAddRecord: (personId: string, content: string) => void;
  onOpenDetail: (personId: string) => void;
};

export function CareView({ people, onAddPerson, onAddRecord, onOpenDetail }: CareViewProps) {
  const sortedPeople = getSortedCarePeople(people);

  return (
    <section className="care-layout">
      <div className="care-panel">
        <p className="section-kicker">关怀记录</p>
        <h2>记录重要的人和收到的善意</h2>
        <form
          className="care-form"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const formData = new FormData(form);
            const name = String(formData.get("name") || "").trim();
            const relationship = String(formData.get("relationship") || "").trim();
            if (!name || !relationship) return;

            onAddPerson({
              name: name.slice(0, 20),
              gender: String(formData.get("gender") || "").trim(),
              relationship: relationship.slice(0, 16),
              birthday: String(formData.get("birthday") || "").trim()
            });
            form.reset();
          }}
        >
          <label>
            <span>名字</span>
            <input name="name" maxLength={20} required autoComplete="off" />
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
            <input name="relationship" maxLength={16} required autoComplete="off" placeholder="朋友、家人、同事" />
          </label>
          <label>
            <span>生日</span>
            <input name="birthday" type="date" />
          </label>
          <button className="primary-action" type="submit">添加</button>
        </form>
      </div>
      <div className="care-list">
        {sortedPeople.length ? (
          sortedPeople.map((person) => (
            <CarePersonCard
              key={person.id}
              person={person}
              onAddRecord={onAddRecord}
              onOpenDetail={onOpenDetail}
            />
          ))
        ) : (
          <p className="empty-state">还没有关怀对象。先添加一个重要的人。</p>
        )}
      </div>
    </section>
  );
}

function CarePersonCard({
  person,
  onAddRecord,
  onOpenDetail
}: {
  person: CarePerson;
  onAddRecord: (personId: string, content: string) => void;
  onOpenDetail: (personId: string) => void;
}) {
  const latestRecord = person.records[0] || null;

  return (
    <article className="care-card">
      <header>
        <div>
          <strong>{person.name}</strong>
          <p>{person.relationship}</p>
        </div>
        <span className="care-score">+{getCareScore(person)}</span>
      </header>
      <div className="care-meta">
        {person.gender ? <span>{person.gender}</span> : null}
        {person.birthday ? <span>生日 {formatBirthday(person.birthday)}</span> : null}
        <span>{person.records.length} 条关怀</span>
      </div>
      <QuickCareForm personId={person.id} onAddRecord={onAddRecord} />
      {latestRecord ? (
        <div className="care-recent">
          <span>最近</span>
          <strong>{latestRecord.content}</strong>
          <time dateTime={latestRecord.createdAt}>{formatDateTime(latestRecord.createdAt)}</time>
        </div>
      ) : (
        <p className="empty-state compact">还没有记录收到的关怀。</p>
      )}
      {person.records.length > 1 ? (
        <ul className="care-records">
          {person.records.slice(1, 4).map((record) => (
            <li key={record.id}>
              <span>{record.content}</span>
              <time dateTime={record.createdAt}>{formatDateTime(record.createdAt)}</time>
            </li>
          ))}
        </ul>
      ) : null}
      {person.records.length > 4 ? (
        <button className="ghost-button care-more-button" type="button" onClick={() => onOpenDetail(person.id)}>
          查看更多
        </button>
      ) : null}
    </article>
  );
}

function QuickCareForm({
  personId,
  onAddRecord
}: {
  personId: string;
  onAddRecord: (personId: string, content: string) => void;
}) {
  return (
    <form
      className="care-entry-form"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
        const content = String(formData.get("content") || "").trim().slice(0, 10);
        if (!content) return;
        onAddRecord(personId, content);
        form.reset();
      }}
    >
      <input name="content" maxLength={10} required autoComplete="off" placeholder="10字以内" />
      <button className="secondary-action" type="submit">+1</button>
    </form>
  );
}
