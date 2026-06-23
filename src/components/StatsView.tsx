import { STATS_RANGES } from "../constants";
import type { JourneyTicket, StatsRange } from "../types";
import { addDays, getDateKey } from "../utils/dates";
import { formatCalendarDayLabel, formatDurationMetric } from "../utils/format";
import { getCheckinSummary, getMeditationDateKeys, getMeditationStats } from "../utils/stats";

type StatsViewProps = {
  tickets: JourneyTicket[];
  activeRange: StatsRange;
  onRangeChange: (range: StatsRange) => void;
};

export function StatsView({ tickets, activeRange, onRangeChange }: StatsViewProps) {
  const stats = getMeditationStats(tickets, activeRange);

  return (
    <section className="stats-layout">
      <div className="chart-panel stats-panel">
        <p className="section-kicker">统计</p>
        <h2>冥想统计</h2>
        <div className="range-tabs" role="tablist" aria-label="统计范围">
          {STATS_RANGES.map((range) => (
            <button
              className={`range-tab ${range.id === activeRange ? "is-active" : ""}`}
              key={range.id}
              type="button"
              role="tab"
              aria-selected={range.id === activeRange}
              onClick={() => onRangeChange(range.id)}
            >
              {range.label}
            </button>
          ))}
        </div>
        <div className="summary-grid stats-summary">
          <MetricCard label="累计冥想时长" value={formatDurationMetric(stats.totalSeconds)} />
          <MetricCard label="累计冥想天数" value={`${stats.dayCount} 天`} />
          <MetricCard label="累计次数" value={`${stats.count} 次`} />
          <MetricCard label="平均每次时长" value={formatDurationMetric(stats.averageSeconds)} />
        </div>
      </div>
      <div className="chart-panel checkin-panel">
        <p className="section-kicker">打卡</p>
        <h2>日历时间轴</h2>
        <CheckinCalendar tickets={tickets} />
      </div>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function CheckinCalendar({ tickets }: { tickets: JourneyTicket[] }) {
  const checkedKeys = getMeditationDateKeys(tickets);
  const summary = getCheckinSummary(checkedKeys);
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const leadingBlanks = (monthStart.getDay() + 6) % 7;
  const monthLabel = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long"
  }).format(today);
  const weekdayLabels = ["一", "二", "三", "四", "五", "六", "日"];

  const cells = [
    ...Array.from({ length: leadingBlanks }, (_, index) => (
      <div className="checkin-day is-empty" aria-hidden="true" key={`empty-${index}`} />
    )),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const date = new Date(today.getFullYear(), today.getMonth(), day);
      const key = getDateKey(date);
      const isChecked = checkedKeys.has(key);
      const previousChecked = checkedKeys.has(getDateKey(addDays(date, -1)));
      const nextChecked = checkedKeys.has(getDateKey(addDays(date, 1)));
      const classNames = ["checkin-day"];
      if (isChecked) classNames.push("is-checked");
      if (isChecked && !previousChecked) classNames.push("is-streak-start");
      if (isChecked && previousChecked && nextChecked) classNames.push("is-streak-middle");
      if (isChecked && !nextChecked) classNames.push("is-streak-end");
      if (key === getDateKey(today)) classNames.push("is-today");

      return (
        <div
          className={classNames.join(" ")}
          role="gridcell"
          aria-label={formatCalendarDayLabel(date, isChecked)}
          key={key}
        >
          <span>{day}</span>
        </div>
      );
    })
  ];

  return (
    <>
      <div className="checkin-summary">
        <div>
          <span>当前连续</span>
          <strong>{summary.currentStreak} 天</strong>
        </div>
        <div>
          <span>最长连续</span>
          <strong>{summary.longestStreak} 天</strong>
        </div>
        <div>
          <span>本月打卡</span>
          <strong>{summary.monthCount} 天</strong>
        </div>
      </div>
      <div className="checkin-calendar" aria-label={`${monthLabel}冥想打卡日历`}>
        <div className="checkin-month">{monthLabel}</div>
        <div className="checkin-weekdays" aria-hidden="true">
          {weekdayLabels.map((label) => <span key={label}>{label}</span>)}
        </div>
        <div className="checkin-grid" role="grid">{cells}</div>
      </div>
    </>
  );
}
