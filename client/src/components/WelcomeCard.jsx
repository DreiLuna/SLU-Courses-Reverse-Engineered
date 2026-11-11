import { useEffect, useState } from "react";
import { api } from "../api.js";

/**
 * Home state: welcome text, how-to, degree recommendations (highlighted yellow so they're noticed first,
 * from Milestone 3), and "Have you Considered?" suggestions.
 */
export default function WelcomeCard({ term, termName, onPick, audit, onOpenCourse }) {
  // Needed courses you can take now: offered, an open section, prerequisites done. Core first.
  const recommended = audit?.data
    ? [...audit.data.core.items, ...audit.data.electives.items]
        .filter((i) => i.section && i.section.status === "A" && !i.missingPrereqs.length)
        .slice(0, 3)
    : [];
  const [items, setItems] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    let live = true;
    api.suggestions(term, showAll ? 24 : 6)
      .then((r) => live && setItems(r.results))
      .catch(() => live && setItems([]));
    return () => { live = false; };
  }, [term, showAll]);

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
            <li>Click a course in the results to see its details, seats and every section.</li>
            <li>Add sections to your cart and check them on the calendar.</li>
          </ol>
        )}

        {recommended.length > 0 && (
          <section className="recommend" aria-labelledby="recommend-title">
            <h3 id="recommend-title">
              <span>Recommended for your degree</span>
              <span className="hint">From Degree Works · open this semester</span>
            </h3>
            <div className="suggest-grid">
              {recommended.map((i) => (
                <button
                  key={i.code}
                  type="button"
                  className="suggest-card is-recommended"
                  onClick={() => onOpenCourse(i.code, i.section.crn)}
                >
                  <span className="code">{i.code}</span>
                  <span className="title">{i.title}</span>
                  <span className="tags">{i.fulfills}</span>
                  <span className="tags">
                    {i.section.meets} · {i.section.seatsAvailable} seat{i.section.seatsAvailable === 1 ? "" : "s"} open
                  </span>
                </button>
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
            <button key={c.code} type="button" className="suggest-card" onClick={() => onPick(c.code)}>
              <span className="code">{c.code}</span>
              <span className="title">{c.title}</span>
              {c.coreNames.length > 0 && <span className="tags">{c.coreNames.join(", ")}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
