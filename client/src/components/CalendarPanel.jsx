// Panel 3 alternative: the whole cart on a week grid.
import { forwardRef, useMemo } from "react";
import { BackIcon } from "./Icons.jsx";
import WeekCalendar from "./WeekCalendar.jsx";
import { buildEvents, conflictPairs } from "../calendar.js";

const CalendarPanel = forwardRef(function CalendarPanel({ title, sections, loading, onClose, onOpenSection }, headingRef) {
  const { events, unscheduled } = useMemo(() => buildEvents(sections), [sections]);
  const conflicts = conflictPairs(events);
  const credits = sections.reduce((sum, s) => sum + s.credits, 0);
  const canceled = sections.filter((s) => s.status === "C");

  return (
    <section
      className="panel panel-details"
      aria-labelledby="calendar-heading"
      aria-busy={loading}
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
    >
      <div className="panel-header">
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close calendar">
          <BackIcon />
        </button>
        <h2 id="calendar-heading" ref={headingRef} tabIndex={-1}>{title}</h2>
      </div>
      <div className="panel-body">
        {sections.length === 0 ? (
          <p className="status-line">{loading ? "Loading..." : "Nothing to show yet. Add sections to your cart first."}</p>
        ) : (
          <>
            <div className="cal-summary">
              <span><strong>{sections.length}</strong> section{sections.length === 1 ? "" : "s"}</span>
              <span><strong>{credits}</strong> credit hour{credits === 1 ? "" : "s"}</span>
            </div>

            {conflicts.length > 0 ? (
              <div className="conflict-box" role="alert">
                <strong>{conflicts.length} time conflict{conflicts.length === 1 ? "" : "s"}</strong>
                <ul>{conflicts.map((c) => <li key={c}>{c}</li>)}</ul>
              </div>
            ) : (
              <p className="ok-box">No time conflicts.</p>
            )}
            {canceled.length > 0 && (
              <p className="conflict-box">
                Canceled section{canceled.length === 1 ? "" : "s"} in this cart: {canceled.map((s) => `${s.courseCode} ${s.section}`).join(", ")}
              </p>
            )}

            <WeekCalendar events={events} caption={title} onEventClick={(e) => onOpenSection(e.code, e.crn)} />

            {unscheduled.length > 0 && (
              <div className="unscheduled">
                <h4>No set meeting times</h4>
                <ul className="plain">
                  {unscheduled.map((s) => (
                    <li key={s.crn}>
                      <button type="button" className="link-btn" onClick={() => onOpenSection(s.courseCode, s.crn)}>
                        {s.courseCode} {s.section}
                      </button>{" "}
                      {s.title} ({s.methodName})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
});

export default CalendarPanel;
