// Panel 3 alternative: the whole cart on a week grid (or a day-by-day list), with conflicts, load and .ics export.
import { forwardRef, useMemo, useState } from "react";
import { BackIcon } from "./Icons.jsx";
import WeekCalendar from "./WeekCalendar.jsx";
import AgendaList from "./AgendaList.jsx";
import { buildEvents, conflictPairs } from "../calendar.js";
import { loadMessage } from "../load.js";
import { buildIcs, downloadIcs } from "../ics.js";

const narrow = () => typeof window !== "undefined" && window.matchMedia("(max-width: 600px)").matches;

const CalendarPanel = forwardRef(function CalendarPanel(
  { title, sections, loading, term, termName, onClose, onOpenSection, onNotify },
  headingRef,
) {
  const [mode, setMode] = useState(() => (narrow() ? "list" : "grid"));
  const { events, unscheduled } = useMemo(() => buildEvents(sections), [sections]);
  const conflicts = conflictPairs(events);
  const credits = sections.reduce((sum, s) => sum + s.credits, 0);
  const load = loadMessage(credits);
  const canceled = sections.filter((s) => s.status === "C");

  function exportIcs() {
    const { text, eventCount, skipped } = buildIcs(sections, { calendarName: `${termName} classes`, term });
    if (!eventCount) {
      onNotify("Nothing to export: no sections in this cart have set meeting times.");
      return;
    }
    downloadIcs(text, `${termName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-schedule.ics`);
    const note = skipped.length ? ` (${skipped.length} without set times left out)` : "";
    onNotify(`Downloaded ${eventCount} repeating event${eventCount === 1 ? "" : "s"}${note}`);
  }

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
            <div className="cal-toolbar">
              <div className="cal-summary">
                <span><strong>{sections.length}</strong> section{sections.length === 1 ? "" : "s"}</span>
                <span><strong>{credits}</strong> credit hour{credits === 1 ? "" : "s"}</span>
              </div>
              <div className="segmented" role="group" aria-label="Calendar layout">
                <button type="button" aria-pressed={mode === "grid"} onClick={() => setMode("grid")}>Week grid</button>
                <button type="button" aria-pressed={mode === "list"} onClick={() => setMode("list")}>List</button>
              </div>
            </div>

            {load && <p className={`load-box load-${load.level}`}>{load.text}</p>}

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

            {mode === "grid" ? (
              <WeekCalendar events={events} caption={title} onEventClick={(e) => onOpenSection(e.code, e.crn)} />
            ) : (
              <AgendaList events={events} onEventClick={(e) => onOpenSection(e.code, e.crn)} />
            )}

            {unscheduled.length > 0 && (
              <div className="unscheduled">
                <h3>No set meeting times</h3>
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

            <div className="export">
              <button type="button" className="btn" onClick={exportIcs}>Export to Calendar (.ics)</button>
              <p className="hint">
                Works with Google Calendar, Apple Calendar and Outlook. Classes repeat weekly from the first to the last day
                of each section; breaks and holidays are not removed.
              </p>
            </div>
          </>
        )}
      </div>
    </section>
  );
});

export default CalendarPanel;
