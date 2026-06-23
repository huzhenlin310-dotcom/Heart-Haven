import type { JourneyTicket } from "../types";
import { JourneyTicketCard } from "./JourneyTicketCard";

type JourneyResultProps = {
  ticket: JourneyTicket;
  onToggleFavorite: (ticketId: string) => void;
  onAgain: () => void;
  onStats: () => void;
};

export function JourneyResult({ ticket, onToggleFavorite, onAgain, onStats }: JourneyResultProps) {
  return (
    <section className="flow-panel meditation-result-panel">
      <p className="section-kicker">记录已保存</p>
      <h2>这次冥想已经保存。</h2>
      <JourneyTicketCard ticket={ticket} />
      <div className="button-row journey-actions">
        <button className="secondary-action" type="button" onClick={() => onToggleFavorite(ticket.id)}>
          {ticket.favorite ? "取消收藏" : "收藏记录"}
        </button>
        <button className="ghost-button" type="button" onClick={onAgain}>
          再冥想一次
        </button>
        <button className="primary-action" type="button" onClick={onStats}>
          查看统计
        </button>
      </div>
    </section>
  );
}
