export function Header() {
  return (
    <header className="topbar" aria-label="应用标题">
      <div>
        <p className="section-kicker">Heart Haven</p>
        <h1 className="font-hand text-[1.62rem] font-black leading-none text-ink">心栖</h1>
      </div>
      <div className="privacy-pill" title="所有记录只保存在本机">
        <span aria-hidden="true">LOCAL</span>
        <strong>本地保存</strong>
      </div>
    </header>
  );
}
