import { DAY_LONG, fmtMin } from "../calendar.js";

/** The same events as WeekCalendar, as a list grouped by day. Fits phones and reads well with a screen reader. */
export default function AgendaList({ events, onEventClick, headingLevel = 3 }) {
  const H = `h${headingLevel}`; // keeps heading order valid wherever the list is placed
  const days = [...new Set(events.map((e) => e.day))].sort((a, b) => a - b);
  if (!days.length) return <p className="hint">No classes with set meeting times.</p>;
  return (
    <div className="agenda">
      {days.map((d) => (
        <section key={d} aria-labelledby={`agenda-day-${d}`}>
          <H id={`agenda-day-${d}`} className="agenda-day">{DAY_LONG[d]}</H>
          <ul className="plain">
            {events
              .filter((e) => e.day === d)
              .sort((a, b) => a.start - b.start)
              .map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    className={`agenda-item${e.conflictWith.length ? " is-conflict" : ""}${e.focus ? " is-focus" : ""}${e.faded ? " is-faded" : ""}${e.preview ? " is-preview" : ""}`}
                    style={{ borderLeftColor: e.color.border }}
                    onClick={() => onEventClick?.(e)}
                  >
                    <span className="agenda-time">{fmtMin(e.start)}–{fmtMin(e.end)}</span>
                    <span className="agenda-what">
                      <strong>{e.code} {e.section}</strong> {e.type !== "Lecture" && <span className="meta">({e.type})</span>}
                      {e.preview && <span className="badge badge-preview">Preview</span>}
                      {e.room && <span className="meta"> · {e.room}</span>}
                      {e.canceled && <span className="badge badge-C">Canceled</span>}
                      {e.conflictWith.length > 0 && (
                        <span className="agenda-conflict">Conflicts with {e.conflictWith.join(", ")}</span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
