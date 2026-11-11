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
  { title, sections, loading, term, termName, onClose, onOpenSection, onNotify, previewSections = [], onPreviewAdd, onPreviewRemove, onPreviewClear },
  headingRef,
) {
  const [mode, setMode] = useState(() => (narrow() ? "list" : "grid"));
  // Previews (from the front-page suggestions) are drawn with the cart but never exported or counted as the cart.
  const previews = previewSections.filter((p) => !sections.some((s) => s.crn === p.crn));
  const { events, unscheduled } = useMemo(
    () => buildEvents([...sections, ...previews], { previewCrns: previews.map((p) => p.crn) }),
    [sections, previews.map((p) => p.crn).join()], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const conflicts = conflictPairs(events);
  const credits = sections.reduce((sum, s) => sum + s.credits, 0);
  const previewCredits = previews.reduce((sum, s) => sum + s.credits, 0);
  const load = loadMessage(credits);
  const loadWithPreviews = previews.length ? loadMessage(credits + previewCredits) : null;
  const canceled = sections.filter((s) => s.status === "C");
  const clashesOf = (crn) => [...new Set(events.filter((e) => e.crn === crn).flatMap((e) => e.conflictWith))];

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
        {sections.length === 0 && previews.length === 0 ? (
          <p className="status-line">
            {loading ? "Loading..." : "Nothing to show yet. Add sections to your cart, or use Preview on calendar on a front-page suggestion."}
          </p>
        ) : (
          <>
            <div className="cal-toolbar">
              <div className="cal-summary">
                <span><strong>{sections.length}</strong> section{sections.length === 1 ? "" : "s"} in cart</span>
                <span><strong>{credits}</strong> credit hour{credits === 1 ? "" : "s"}</span>
                {previews.length > 0 && (
                  <span className="cal-preview-count">
                    + <strong>{previews.length}</strong> preview{previews.length === 1 ? "" : "s"} ({previewCredits} cr)
                  </span>
                )}
              </div>
              <div className="segmented" role="group" aria-label="Calendar layout">
                <button type="button" aria-pressed={mode === "grid"} onClick={() => setMode("grid")}>Week grid</button>
                <button type="button" aria-pressed={mode === "list"} onClick={() => setMode("list")}>List</button>
              </div>
            </div>

            {load && <p className={`load-box load-${load.level}`}>{load.text}</p>}
            {loadWithPreviews && (
              <p className={`load-box load-${loadWithPreviews.level} is-what-if`}>
                If you add the previews: {loadWithPreviews.text}
              </p>
            )}

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

            {previews.length > 0 && (
              <section className="preview-list" aria-labelledby="preview-list-title">
                <h3 id="preview-list-title">
                  Previewing (not in your cart)
                  {onPreviewClear && (
                    <button type="button" className="link-btn" onClick={onPreviewClear}>Clear all</button>
                  )}
                </h3>
                <ul className="plain">
                  {previews.map((p) => {
                    const clashes = clashesOf(p.crn);
                    return (
                      <li key={p.crn} className="preview-item">
                        <div>
                          <button type="button" className="link-btn" onClick={() => onOpenSection(p.courseCode, p.crn)}>
                            {p.courseCode} {p.section}
                          </button>{" "}
                          {p.title} · {p.meets} · {p.credits} cr
                          {clashes.length > 0 ? (
                            <span className="preview-clash">⚠ Clashes with {clashes.join(", ")}</span>
                          ) : (
                            <span className="preview-fits">✓ Fits with your cart</span>
                          )}
                        </div>
                        <div className="preview-item-actions">
                          <button type="button" className="btn preview-add" onClick={() => onPreviewAdd(p)}>Add to cart</button>
                          <button
                            type="button"
                            className="btn btn-secondary preview-remove"
                            onClick={() => onPreviewRemove(p)}
                            aria-label={`Remove preview of ${p.courseCode} ${p.section}`}
                          >
                            Remove
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            <div className="export">
              <button type="button" className="btn" onClick={exportIcs} disabled={!sections.length}>Export to Calendar (.ics)</button>
              <p className="hint">
                Exports the classes in your cart{previews.length ? " (not the previews)" : ""}. Works with Google Calendar,
                Apple Calendar and Outlook. Classes repeat weekly from the first to the last day of each section; breaks and
                holidays are not removed.
              </p>
            </div>
          </>
        )}
      </div>
    </section>
  );
});

export default CalendarPanel;
