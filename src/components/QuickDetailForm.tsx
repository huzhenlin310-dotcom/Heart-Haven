export function QuickDetailForm({
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
