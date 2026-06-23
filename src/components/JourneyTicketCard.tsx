import type { JourneyTicket } from "../types";
import { formatClock, formatDateTime, formatJourneyNumber } from "../utils/format";
import { getSessionType, getTicketAudioTitle, getTicketDuration } from "../utils/meditation";

type JourneyTicketCardProps = {
  ticket: JourneyTicket;
  showActions?: boolean;
  onToggleFavorite?: (ticketId: string) => void;
};

export function JourneyTicketCard({ ticket, showActions = false, onToggleFavorite }: JourneyTicketCardProps) {
  return (
    <article className={`record-card ticket-card ${ticket.favorite ? "is-favorite" : ""}`}>
      <header>
        <div className="ticket-heading">
          <span className="result-badge">{getSessionType(ticket)}</span>
          <time dateTime={ticket.createdAt}>{formatDateTime(ticket.createdAt)}</time>
        </div>
        <span className="ticket-no">{formatJourneyNumber(ticket.journeyNo)}</span>
      </header>
      <strong>{getTicketAudioTitle(ticket)}</strong>
      <div className="ticket-meta">
        <span>冥想时长 {formatClock(getTicketDuration(ticket))}</span>
        <span>{ticket.favorite ? "已收藏" : "未收藏"}</span>
      </div>
      <p className="ticket-quote">{ticket.quote}</p>
      {showActions ? (
        <div className="ticket-actions">
          <button className="ghost-button ticket-action-button" type="button" onClick={() => onToggleFavorite?.(ticket.id)}>
            {ticket.favorite ? "取消收藏" : "收藏记录"}
          </button>
        </div>
      ) : null}
    </article>
  );
}
