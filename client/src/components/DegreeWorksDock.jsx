// Degree Works pinned pop-out (Milestone 3 Figma: "Pinned PopOut" + "Component 1").
// Collapsed: a tab on the right edge. Expanded: a panel docked on the right (a bottom sheet on phones)
// with the semester credit meter, degree progress, student info, and checkbox lists of needed classes.
import { useEffect, useMemo, useRef, useState } from "react";
import { degreeMeters } from "../degree.js";

function Meter({ label, value, children, bar }) {
  return (
    <div className="dw-meter">
      <div className="dw-meter-label">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      {bar}
      {children}
    </div>
  );
}

function RequirementList({ id, title, count, items, checked, inCartCodes, termName, onToggle, onAdd, onOpenCourse }) {
  const selectable = items.filter((i) => i.section && !inCartCodes.has(i.code));
  const nChecked = selectable.filter((i) => checked.has(i.code)).length;
  return (
    <section className="dw-req" aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} className="dw-req-title">
        {title}: <span className="dw-count">{count}</span>
      </h3>
      <ul className="dw-req-list">
        {items.map((i) => {
          const inCart = inCartCodes.has(i.code);
          const disabled = !i.section || inCart;
          const s = i.section;
          const inputId = `${id}-${i.code.replace(/\s/g, "")}`;
          return (
            <li key={i.code} className={`dw-req-item${disabled ? " is-disabled" : ""}`}>
              <input
                id={inputId}
                type="checkbox"
                className="dw-check"
                checked={inCart || checked.has(i.code)}
                disabled={disabled}
                onChange={() => onToggle(i.code)}
                aria-describedby={`${inputId}-info`}
              />
              <div className="dw-req-text">
                <label htmlFor={inputId} className="dw-req-name">
                  <strong>{i.code}</strong> {i.title} <span className="dw-fulfills">({i.fulfills})</span>
                </label>
                <div id={`${inputId}-info`} className="dw-req-info">
                  {s ? (
                    <>
                      <span>Time: {s.meets} · Sec {s.section}</span>
                      <span>Location: {s.meetings[0]?.room ? `${s.meetings[0].room}, ${s.campusName}` : s.campusName}</span>
                    </>
                  ) : (
                    <span>
                      {i.allCanceled ? `All sections canceled in ${termName}` : `Not offered in ${termName}`}
                      {!i.allCanceled && i.typicallyOffered?.length
                        ? ` (usually ${i.typicallyOffered.map((t) => t[0].toUpperCase() + t.slice(1)).join(" & ")})`
                        : ""}
                    </span>
                  )}
                  <span className="dw-flags">
                    {inCart && <span className="dw-flag dw-flag-ok">✓ In cart</span>}
                    {s && s.status === "F" && <span className="dw-flag dw-flag-bad">⚠ Full · waitlist {s.waitlisted}/{s.waitlistCap}</span>}
                    {s && s.status === "A" && !inCart && (
                      <span className="dw-flag">{s.seatsAvailable} seat{s.seatsAvailable === 1 ? "" : "s"} open</span>
                    )}
                    {s?.clashesWithCart && !inCart && <span className="dw-flag dw-flag-bad">⚠ Clashes with your cart</span>}
                    {i.missingPrereqs.length > 0 && (
                      <span className="dw-flag dw-flag-warn">⚠ Needs {i.missingPrereqs.join(", ")} first</span>
                    )}
                  </span>
                </div>
                {s && (
                  <button type="button" className="dw-details" onClick={() => onOpenCourse(i.code, s.crn)}>
                    Details and other sections
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <button type="button" className="dw-add" onClick={() => onAdd(selectable.filter((i) => checked.has(i.code)))} disabled={nChecked === 0}>
        Add to cart{nChecked ? ` (${nChecked})` : ""}
      </button>
    </section>
  );
}

const STORE = "courseSearch.dwOpen";
const readOpen = () => {
  try {
    return localStorage.getItem(STORE) === "1";
  } catch {
    return false;
  }
};

export default function DegreeWorksDock({ audit, term, termName, cart, cartSections, onOpenCourse, onNotify }) {
  const [open, setOpenState] = useState(readOpen);
  const [checked, setChecked] = useState(() => new Set()); // course codes checked but not added yet
  const titleRef = useRef(null);
  const tabRef = useRef(null);
  const firstRender = useRef(true);

  function setOpen(v) {
    setOpenState(v);
    try {
      localStorage.setItem(STORE, v ? "1" : "0");
    } catch {
      /* storage blocked: stays for this visit */
    }
  }

  // Focus follows the panel: into it when it opens, back to the tab when it closes.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (open) titleRef.current?.focus({ preventScroll: true });
    else tabRef.current?.focus({ preventScroll: true });
  }, [open]);

  // New term: checked items from the old term no longer apply.
  useEffect(() => setChecked(new Set()), [term]);

  const data = audit.data;
  const inCartCodes = useMemo(() => new Set(cartSections.map((s) => s.courseCode)), [cartSections]);
  const allItems = data ? [...data.core.items, ...data.electives.items] : [];
  const pendingCredits = allItems
    .filter((i) => checked.has(i.code) && i.section && !inCartCodes.has(i.code))
    .reduce((sum, i) => sum + i.credits, 0);
  const cartCredits = cartSections.reduce((sum, s) => sum + s.credits, 0);
  const m = data
    ? degreeMeters({ cartCredits, pendingCredits, ...data.credits, ...data.semesterLoad })
    : null;

  const coreLeft = data ? data.core.items.filter((i) => !inCartCodes.has(i.code)).length : 0;
  const electiveCreditsInCart = data
    ? data.electives.items.filter((i) => inCartCodes.has(i.code)).reduce((sum, i) => sum + i.credits, 0)
    : 0;
  const electivesLeft = data ? Math.max(data.electives.creditsNeeded - electiveCreditsInCart, 0) : 0;

  function toggle(code) {
    setChecked((cur) => {
      const next = new Set(cur);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  }

  function addItems(items) {
    if (!items.length) return;
    items.forEach((i) => cart.add(i.section.crn));
    setChecked((cur) => {
      const next = new Set(cur);
      items.forEach((i) => next.delete(i.code));
      return next;
    });
    onNotify({
      title: `Added ${items.length} class${items.length === 1 ? "" : "es"} to your cart`,
      detail: items.map((i) => `${i.code} ${i.section.section}`).join(", "),
    });
  }

  return (
    <>
      <button
        ref={tabRef}
        type="button"
        className={`dw-tab${open ? " is-hidden" : ""}`}
        aria-expanded={open}
        aria-controls="dw-panel"
        onClick={() => setOpen(true)}
        tabIndex={open ? -1 : 0}
      >
        <span aria-hidden="true" className="dw-tab-arrow">◀</span>
        <span className="dw-tab-label">Degree Works</span>
      </button>

      <aside
        id="dw-panel"
        className={`dw-dock${open ? " open" : ""}`}
        aria-labelledby="dw-title"
        inert={!open}
        onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
      >
        <div className="dw-head">
          <h2 id="dw-title" ref={titleRef} tabIndex={-1} className="dw-title">Degree Works</h2>
          <button type="button" className="dw-min" onClick={() => setOpen(false)} aria-label="Minimize Degree Works" aria-expanded={open} aria-controls="dw-panel">
            <span aria-hidden="true">–</span>
          </button>
        </div>

        {audit.status === "loading" && <p>Loading your audit...</p>}
        {audit.status === "error" && <p className="error-box" role="alert">Could not load Degree Works: {audit.error}</p>}

        {data && m && (
          <>
            <Meter
              label={`${termName} credits selected`}
              value={`${m.selected} (Min: ${data.semesterLoad.min}, Max: ${data.semesterLoad.max})`}
              bar={
                <div
                  className={`dw-bar dw-bar-${m.status.level}`}
                  role="progressbar"
                  aria-label={`${termName} credits selected`}
                  aria-valuemin={0}
                  aria-valuemax={data.semesterLoad.max}
                  aria-valuenow={Math.min(m.selected, data.semesterLoad.max)}
                  aria-valuetext={`${m.selected} credit hours: ${m.status.title} ${m.status.detail}`}
                >
                  <span className="dw-bar-cart" style={{ width: `${m.cartWidth * 100}%` }} />
                  <span className="dw-bar-pending" style={{ width: `${m.pendingWidth * 100}%` }} />
                  <i className="dw-bar-min" style={{ left: `${m.minMark * 100}%` }} aria-hidden="true" />
                </div>
              }
            >
              <p className="dw-legend">
                {m.cartCredits} in cart{m.pendingCredits ? ` + ${m.pendingCredits} checked below` : ""}
              </p>
            </Meter>
            <p className={`dw-status dw-status-${m.status.level}`} aria-live="polite">
              <strong>{m.status.title}</strong> {m.status.detail}
            </p>

            <Meter
              label="Credit completed"
              value={`${m.projected}/${data.credits.required}  ${m.percent}%`}
              bar={
                <div
                  className="dw-bar dw-bar-progress"
                  role="progressbar"
                  aria-label="Degree credits completed, including this term's selection"
                  aria-valuemin={0}
                  aria-valuemax={data.credits.required}
                  aria-valuenow={m.projected}
                  aria-valuetext={`${data.credits.completed} completed, ${m.projected} after this term, of ${data.credits.required}`}
                >
                  <span className="dw-bar-done" style={{ width: `${m.completedPercent}%` }} />
                  <span className="dw-bar-next" style={{ width: `${m.percent - m.completedPercent}%` }} />
                </div>
              }
            />
            <p className="dw-sub">
              {m.remaining} Remaining · {data.credits.completed} done + {m.selected} this term
            </p>

            <dl className="dw-info">
              <div><dt>Student ID</dt><dd>{data.student.id}</dd></div>
              <div><dt>Name</dt><dd>{data.student.name}</dd></div>
              <div><dt>Degree</dt><dd title={data.student.degreeName}>{data.student.degree}</dd></div>
            </dl>

            <RequirementList
              id="dw-core"
              title="Core Classes Still Needed for Degree"
              count={coreLeft}
              items={data.core.items}
              checked={checked}
              inCartCodes={inCartCodes}
              termName={termName}
              onToggle={toggle}
              onAdd={addItems}
              onOpenCourse={onOpenCourse}
            />
            <RequirementList
              id="dw-elec"
              title="Degree Elective Credits Still Needed"
              count={electivesLeft}
              items={data.electives.items}
              checked={checked}
              inCartCodes={inCartCodes}
              termName={termName}
              onToggle={toggle}
              onAdd={addItems}
              onOpenCourse={onOpenCourse}
            />
          </>
        )}
      </aside>
    </>
  );
}
