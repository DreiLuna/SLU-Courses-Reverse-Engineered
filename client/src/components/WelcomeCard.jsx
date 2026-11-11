import { useEffect, useState } from "react";
import { api } from "../api.js";
import { CalendarIcon } from "./Icons.jsx";

/**
 * One suggestion. The card body opens the course; "Preview on calendar" toggles its suggested section onto
 * the cart calendar as a dashed preview, so you can judge the time slot before adding anything.
 */
function SuggestCard({ code, title, lines, section, recommended, onOpen, preview, inCart }) {
  const on = Boolean(section && preview.has(section.crn));
  return (
    <div className={`suggest-card${recommended ? " is-recommended" : ""}${on ? " is-previewing" : ""}`}>
      <button type="button" className="suggest-main" onClick={onOpen}>
        <span className="code">{code}</span>
        <span className="title">{title}</span>
        {lines.filter(Boolean).map((l) => <span key={l} className="tags">{l}</span>)}
        {section && <span className="suggest-time">{section.meets} · Sec {section.section}</span>}
      </button>
      {section && (
        <div className="suggest-actions">
          {inCart ? (
            <span className="suggest-note">✓ In your cart</span>
          ) : (
            <button
              type="button"
              className="preview-toggle"
              aria-pressed={on}
              aria-label={`Preview on calendar: ${code} section ${section.section}`}
              onClick={() => preview.toggle(section.crn)}
            >
              {/* same words on and off (state is aria-pressed + the check), so the name always matches the label */}
              {on ? <span aria-hidden="true">✓</span> : <CalendarIcon />} Preview on calendar
            </button>
          )}
          {section.clashesWithCart && !inCart && <span className="suggest-clash">⚠ Clashes with your cart</span>}
        </div>
      )}
    </div>
  );
}

/**
 * Home state: welcome text, how-to, degree recommendations (highlighted yellow so they're noticed first,
 * from Milestone 3), and "Have you Considered?" suggestions, each previewable on the calendar.
 */
export default function WelcomeCard({ term, termName, onPick, audit, onOpenCourse, preview, cartCrns, onViewCalendar }) {
  // Needed courses you can take now: offered, an open section, prerequisites done. Core first.
  const recommended = audit?.data
    ? [...audit.data.core.items, ...audit.data.electives.items]
        .filter((i) => i.section && i.section.status === "A" && !i.missingPrereqs.length)
        .slice(0, 3)
    : [];
  const [items, setItems] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const cartKey = cartCrns.join(",");
  const inCart = (section) => section && cartCrns.includes(section.crn);

  // Suggested sections avoid the cart's times, so refetch when the cart changes.
  useEffect(() => {
    let live = true;
    api.suggestions(term, showAll ? 24 : 6, cartCrns)
      .then((r) => live && setItems(r.results))
      .catch(() => live && setItems([]));
    return () => { live = false; };
  }, [term, showAll, cartKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const nPreview = preview.crns.length;

  return (
    <div className="welcome">
      <div className="welcome-card">
        <h2>Welcome to Course Search</h2>
        <p>
          Search the class schedule for {termName}. Pick your filters on the left and press <strong>Search</strong>.{" "}
          <button type="button" className="link-btn" aria-expanded={showHelp} onClick={() => setShowHelp((s) => !s)}>
            {showHelp ? "Hide the quick tutorial" : "New here? Read the quick tutorial"}
          </button>
        </p>
        {showHelp && (
          <ol className="how-to">
            <li>Type a course code (CSCI 3300), words from a title, an instructor or a CRN, or leave it blank.</li>
            <li>Narrow down with Semester, Time, Campus Location and Days. More filters live under University Core and Advanced Search.</li>
            <li>Open <strong>Degree Works</strong> (the tab on the right) to see what your degree still needs and add it in one step.</li>
            <li>Use <strong>Preview on calendar</strong> on a suggestion to see its time next to your cart before adding it.</li>
            <li>Click a course in the results to see its details, seats and every section.</li>
          </ol>
        )}

        <div className={`preview-bar${nPreview ? " show" : ""}`} role="status">
          {nPreview > 0 && (
            <>
              <span>
                <CalendarIcon /> Previewing <strong>{nPreview}</strong> class{nPreview === 1 ? "" : "es"} on your calendar
              </span>
              <span className="preview-bar-actions">
                <button type="button" className="btn preview-bar-btn" onClick={onViewCalendar}>View calendar</button>
                <button type="button" className="link-btn" onClick={preview.clear}>Clear previews</button>
              </span>
            </>
          )}
        </div>

        {recommended.length > 0 && (
          <section className="recommend" aria-labelledby="recommend-title">
            <h3 id="recommend-title">
              <span>Recommended for your degree</span>
              <span className="hint">From Degree Works · open this semester</span>
            </h3>
            <div className="suggest-grid">
              {recommended.map((i) => (
                <SuggestCard
                  key={i.code}
                  code={i.code}
                  title={i.title}
                  lines={[i.fulfills, `${i.section.seatsAvailable} seat${i.section.seatsAvailable === 1 ? "" : "s"} open`]}
                  section={i.section}
                  recommended
                  onOpen={() => onOpenCourse(i.code, i.section.crn)}
                  preview={preview}
                  inCart={inCart(i.section)}
                />
              ))}
            </div>
          </section>
        )}

        <h3>
          <span>Have you Considered?</span>
          <button type="button" className="link-btn" onClick={() => setShowAll((s) => !s)}>
            {showAll ? "Show Fewer" : "Show All"}
          </button>
        </h3>
        <div className="suggest-grid">
          {items.map((c) => (
            <SuggestCard
              key={c.code}
              code={c.code}
              title={c.title}
              lines={[c.coreNames.join(", ")]}
              section={c.section}
              onOpen={() => (c.section ? onOpenCourse(c.code, c.section.crn) : onPick(c.code))}
              preview={preview}
              inCart={inCart(c.section)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
