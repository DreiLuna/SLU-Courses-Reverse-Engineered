// Panel 2: grouped results, selected highlight, search criteria summary, cart totals in cart view.
import { forwardRef } from "react";
import { BackIcon, CalendarIcon, LinkIcon } from "./Icons.jsx";

const ResultsPanel = forwardRef(function ResultsPanel(
  { state, criteriaRows, title = "Search Results", onBack, onCopyLink, onToggleCalendar, calendarOpen, selected, onSelect, taken, inCart, cartSummary },
  headingRef,
) {
  const { status, data, error, emptyMessage } = state;
  return (
    <section className="panel panel-results" aria-labelledby="results-heading" aria-busy={status === "loading"}>
      <div className="panel-header">
        <button type="button" className="icon-btn" onClick={onBack} aria-label="Back to search">
          <BackIcon />
        </button>
        <h2 id="results-heading" ref={headingRef} tabIndex={-1}>{title}</h2>
        {onToggleCalendar && (
          <button
            type="button"
            className="icon-btn"
            onClick={onToggleCalendar}
            aria-pressed={calendarOpen}
            aria-label="Show cart on a weekly calendar"
            title="Weekly calendar"
          >
            <CalendarIcon />
          </button>
        )}
        <button type="button" className="icon-btn" onClick={onCopyLink} aria-label="Copy link to these results" title="Copy link">
          <LinkIcon />
        </button>
      </div>
      <div className="panel-body">
        {cartSummary && cartSummary.count > 0 && status === "done" && (
          <div className="cart-summary">
            <div>
              <strong>{cartSummary.count}</strong> section{cartSummary.count === 1 ? "" : "s"} ·{" "}
              <strong>{cartSummary.credits}</strong> credit hour{cartSummary.credits === 1 ? "" : "s"}
            </div>
            {onToggleCalendar && !calendarOpen && (
              <button type="button" className="link-btn" onClick={onToggleCalendar}>View calendar</button>
            )}
            {cartSummary.shared ? (
              cartSummary.missing > 0 ? (
                <button type="button" className="link-btn" onClick={cartSummary.onAddAll}>Add all to my cart</button>
              ) : (
                <span>All in your cart</span>
              )
            ) : (
              <button type="button" className="link-btn" onClick={cartSummary.onClear}>Clear cart</button>
            )}
            {cartSummary.load && cartSummary.load.level !== "ok" && (
              <p className={`load-box load-${cartSummary.load.level}`}>{cartSummary.load.text}</p>
            )}
          </div>
        )}
        <div aria-live="polite">
          {status === "loading" && <p className="status-line">Searching...</p>}
          {status === "error" && <p className="error-box" role="alert">{error}</p>}
          {status === "done" && (
            <p className="status-line">
              {data.count === 0
                ? emptyMessage ?? "No courses matched. Try removing a filter."
                : `Found ${data.count} course${data.count === 1 ? "" : "s"} (${data.sectionCount} section${data.sectionCount === 1 ? "" : "s"})`}
            </p>
          )}
        </div>

        {status === "done" && (
          <ul className="result-list">
            {data.results.map((c) => {
              const courseSelected = selected?.code === c.code;
              const firstPick = c.sections.find((s) => s.status !== "C") ?? c.sections[0];
              return (
                <li className={`course-group${courseSelected ? " is-selected" : ""}`} key={c.code}>
                  <button
                    type="button"
                    className="course-group-head"
                    aria-current={courseSelected && !selected?.crn ? "true" : undefined}
                    onClick={() => onSelect(c.code, firstPick?.crn)}
                  >
                    <span className="code">{c.code}</span>
                    <span className="title">{c.title}</span>
                    {taken.has(c.code) && <span className="badge badge-taken">Taken</span>}
                  </button>
                  <ul className="section-list">
                    {c.sections.map((s) => {
                      const on = courseSelected && selected?.crn === s.crn;
                      return (
                        <li key={s.crn}>
                          <button
                            type="button"
                            className={`section-row${on ? " is-selected" : ""}`}
                            aria-current={on ? "true" : undefined}
                            onClick={() => onSelect(c.code, s.crn)}
                          >
                            <span className="sec">{s.section}</span>
                            <span>
                              {s.meets} <span className={`badge badge-${s.status}`}>{s.statusLabel}</span>
                              {inCart.has(s.crn) && <> <span className="badge badge-cart">In cart</span></>}
                              <br />
                              <span className="meta">{s.instructor} · CRN {s.crn}</span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}

        {criteriaRows && (
          <div className="criteria-box">
            <h3>Search Criteria</h3>
            <dl>
              {criteriaRows.map(([k, v]) => (
                <div key={k + v} style={{ display: "contents" }}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </section>
  );
});

export default ResultsPanel;
