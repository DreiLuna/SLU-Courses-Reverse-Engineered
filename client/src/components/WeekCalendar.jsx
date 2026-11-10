import { DAY_LONG, DAY_SHORT, fmtMin } from "../calendar.js";

const HOUR_H = 44; // px per hour

/**
 * Week grid, Mon-Fri (Sat/Sun added only when something meets then), 7am-10pm (stretches if needed).
 * Each event is a button so the calendar works with a keyboard and screen reader.
 */
export default function WeekCalendar({ events, onEventClick, caption }) {
  const usedDays = new Set(events.map((e) => e.day));
  const days = [0, 1, 2, 3, 4, ...(usedDays.has(5) || usedDays.has(6) ? [5] : []), ...(usedDays.has(6) ? [6] : [])];
  const first = Math.min(7, ...events.map((e) => Math.floor(e.start / 60)));
  const last = Math.max(22, ...events.map((e) => Math.ceil(e.end / 60)));
  const hours = Array.from({ length: last - first }, (_, i) => first + i);
  const top = (min) => ((min - first * 60) / 60) * HOUR_H;

  return (
    <figure className="wk-wrap" aria-label={caption}>
      <div className="wk" style={{ gridTemplateColumns: `48px repeat(${days.length}, minmax(84px, 1fr))` }}>
        <div className="wk-corner" />
        {days.map((d) => (
          <div key={d} className="wk-dayname" aria-hidden="true">{DAY_SHORT[d]}</div>
        ))}

        <div className="wk-times" style={{ height: hours.length * HOUR_H }} aria-hidden="true">
          {hours.map((h) => (
            <span key={h} style={{ top: top(h * 60) }}>{fmtMin(h * 60)}</span>
          ))}
        </div>

        {days.map((d) => (
          <div
            key={d}
            className="wk-day"
            role="group"
            aria-label={DAY_LONG[d]}
            style={{ height: hours.length * HOUR_H, backgroundSize: `100% ${HOUR_H}px` }}
          >
            {events
              .filter((e) => e.day === d)
              .map((e) => {
                const conflict = e.conflictWith.length > 0;
                const label =
                  `${e.code} section ${e.section}, ${DAY_LONG[d]} ${fmtMin(e.start)} to ${fmtMin(e.end)}` +
                  (e.room ? `, ${e.room}` : "") +
                  (e.canceled ? ", canceled" : "") +
                  (conflict ? `, conflicts with ${e.conflictWith.join(", ")}` : "");
                return (
                  <button
                    key={e.id}
                    type="button"
                    className={`wk-ev${conflict ? " is-conflict" : ""}${e.focus ? " is-focus" : ""}${e.faded ? " is-faded" : ""}${e.canceled ? " is-canceled" : ""}`}
                    style={{
                      top: top(e.start),
                      height: Math.max(top(e.end) - top(e.start), 18),
                      left: `calc(${(e.lane / e.lanes) * 100}% + 2px)`,
                      width: `calc(${100 / e.lanes}% - 4px)`,
                      background: e.color.bg,
                      borderLeftColor: e.color.border,
                    }}
                    aria-label={label}
                    title={label}
                    onClick={() => onEventClick?.(e)}
                  >
                    <strong>{e.code} {e.section}</strong>
                    <span>{fmtMin(e.start)}-{fmtMin(e.end)}</span>
                    {e.room && <span>{e.room}</span>}
                  </button>
                );
              })}
          </div>
        ))}
      </div>
    </figure>
  );
}
