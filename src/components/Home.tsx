import type { JourneyTicket } from "../types";
import { formatClock, formatDateTime } from "../utils/format";
import { getSessionType, getTicketAudioTitle, getTicketDuration } from "../utils/meditation";

type HomeProps = {
  latestTicket: JourneyTicket | null;
  onStart: () => void;
};

export function Home({ latestTicket, onStart }: HomeProps) {
  return (
    <section className="home-minimal" aria-label="开始冥想">
      <div className="home-intro" aria-hidden="true">
        <p>今晚，先安静一下</p>
        <span>选择一段音频，开始一场温柔的冥想</span>
      </div>
      <button className="meditation-start-button" type="button" aria-label="开始冥想" onClick={onStart}>
        <span className="meditation-orbit" aria-hidden="true" />
        <span className="meditation-orbit orbit-two" aria-hidden="true" />
        <span className="meditation-core">
          <span>开始</span>
          <small>冥想</small>
        </span>
      </button>
      {latestTicket ? (
        <div className="home-journey-summary">
          <p className="section-kicker">最近一次</p>
          <div className="result-summary">
            <div className="result-badge">{getSessionType(latestTicket)}</div>
            <strong>{getTicketAudioTitle(latestTicket)}</strong>
            <strong>{formatClock(getTicketDuration(latestTicket))}</strong>
            <p className="muted">{formatDateTime(latestTicket.createdAt)}</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
