// Panel 3: one section of a course, plus everything about the course and all its sections this term.
import { forwardRef, useEffect, useState } from "react";
import { BackIcon, LinkIcon } from "./Icons.jsx";

const fmtDate = (iso) =>
  new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const shortDate = (iso) => { const [, m, d] = iso.split("-"); return `${Number(m)}/${Number(d)}`; };

function Bar({ title, children }) {
  return (
    <section className="detail-section">
      <h4 className="detail-bar">{title}</h4>
      <div className="detail-content">{children}</div>
    </section>
  );
}

const DetailsPanel = forwardRef(function DetailsPanel(
  { state, crn, termName, onSelectSection, onOpenCourse, onClose, onCopyLink, cart, taken },
  headingRef,
) {
  const [flash, setFlash] = useState(null); // { text, missing: [linked sections not in cart] }
  const { status, data, error } = state;

  const sections = data?.sections ?? [];
  const section =
    sections.find((s) => s.crn === crn) ?? sections.find((s) => s.status !== "C") ?? sections[0] ?? null;
  const course = data?.course;
  const inCart = section ? cart.has(section.crn) : false;

  // clear the "Added to cart" message when switching sections
  useEffect(() => setFlash(null), [section?.crn]);

  function toggleCart() {
    if (inCart) {
      cart.remove(section.crn);
      setFlash({ text: `Removed ${course.code} ${section.section} from your cart.`, missing: [] });
    } else {
      cart.add(section.crn);
      // Lectures with a lab (and vice versa) need both: offer to add the other one.
      const missing = section.linkedCrns
        .filter((l) => !cart.has(l))
        .map((l) => sections.find((s) => s.crn === l))
        .filter((s) => s && s.status !== "C");
      setFlash({ text: `Added ${course.code} ${section.section} to your cart.`, missing });
    }
  }

  function addLinked(s) {
    cart.add(s.crn);
    setFlash({ text: `Added ${course.code} ${s.section} too.`, missing: [] });
  }

  return (
    <section
      className="panel panel-details"
      aria-labelledby="details-heading"
      aria-busy={status === "loading"}
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
    >
      <div className="panel-header">
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close course details">
          <BackIcon />
        </button>
        <h2 id="details-heading" ref={headingRef} tabIndex={-1}>
          {course ? `${course.code}${section ? ` · Section ${section.section}` : ""}` : "Course Details"}
        </h2>
        <button type="button" className="icon-btn" onClick={onCopyLink} aria-label="Copy link to this course" title="Copy link">
          <LinkIcon />
        </button>
      </div>

      <div className="panel-body">
        {status === "loading" && !course && <p className="status-line">Loading...</p>}
        {status === "error" && <p className="error-box" role="alert">{error}</p>}

        {course && (
          <>
            <div className="details-title">
              <h3>
                <span className="code">{course.code}</span> {course.title}
              </h3>
              {taken.has(course.code) && <span className="badge badge-taken">You have taken this course</span>}
            </div>

            {!section && <p className="error-box">{data.message} in {termName}.{course.offeredTerms.length > 0 && ` Offered: ${course.offeredTerms.map((t) => t.name).join(", ")}.`}</p>}

            {section && (
              <>
                {section.status === "C" && (
                  <p className="error-box" role="note">This section has been canceled.</p>
                )}
                <dl className="info-grid">
                  <dt>Section</dt><dd>{section.section}</dd>
                  <dt>CRN</dt><dd>{section.crn}</dd>
                  <dt>Credit Hours</dt><dd>{section.credits}</dd>
                  <dt>Status</dt><dd><span className={`badge badge-${section.status}`}>{section.statusLabel}</span></dd>
                  <dt>Schedule Type</dt><dd>{section.typeName}</dd>
                  <dt>Instruction Method</dt><dd>{section.methodName}</dd>
                  <dt>Campus</dt><dd>{section.campusName}</dd>
                  <dt>Part of Term</dt><dd>{section.sessionName}</dd>
                  <dt>Dates</dt><dd>{fmtDate(section.startDate)} to {fmtDate(section.endDate)}</dd>
                  <dt>Instructor</dt><dd>{section.instructor === "Staff" ? "To be announced" : section.instructor}</dd>
                </dl>

                <div className="seats" aria-label="Seats">
                  <div><strong>{section.capacity}</strong><span>Max Enrollment</span></div>
                  <div><strong>{section.seatsAvailable}</strong><span>Seats Avail</span></div>
                  <div><strong>{section.waitlisted}/{section.waitlistCap}</strong><span>Waitlist</span></div>
                </div>

                <Bar title="Meeting Information">
                  <ul className="plain">
                    {section.meetingLines.map((l) => <li key={l}>{l}</li>)}
                  </ul>
                </Bar>

                {(section.notes || section.linkedCrns.length > 0) && (
                  <Bar title="Registration Notes">
                    {section.notes && <p>{section.notes}</p>}
                    {section.linkedCrns.length > 0 && (
                      <p>
                        Linked section{section.linkedCrns.length > 1 ? "s" : ""} (register for both):{" "}
                        {section.linkedCrns.map((l, i) => {
                          const ls = sections.find((s) => s.crn === l);
                          return (
                            <span key={l}>
                              {i > 0 && ", "}
                              <button type="button" className="link-btn" onClick={() => onSelectSection(l)}>
                                {ls ? `${ls.section} (${ls.typeName}, CRN ${l})` : `CRN ${l}`}
                              </button>
                            </span>
                          );
                        })}
                      </p>
                    )}
                  </Bar>
                )}

                {section.restrictions && (
                  <Bar title="Registration Restrictions"><p>{section.restrictions}</p></Bar>
                )}
              </>
            )}

            <Bar title="Prerequisites">
              {course.prereqs.length === 0 ? (
                <p>None</p>
              ) : (
                <ul className="plain prereqs">
                  {course.prereqs.map((p) => (
                    <li key={p.code}>
                      <span className={taken.has(p.code) ? "done" : "todo"} aria-hidden="true">{taken.has(p.code) ? "✓" : "•"}</span>{" "}
                      <button type="button" className="link-btn" onClick={() => onOpenCourse(p.code)}>{p.code}</button> {p.title}
                      {taken.has(p.code) && <span className="sr-only"> (taken)</span>}
                    </li>
                  ))}
                </ul>
              )}
            </Bar>

            <Bar title="Course Description"><p>{course.description}</p></Bar>

            {(course.coreNames.length > 0 || course.flagNames.length > 0 || (section?.attrNames.length ?? 0) > 0) && (
              <Bar title="Attributes">
                <ul className="plain">
                  {course.coreNames.map((n) => <li key={n}>University Core: {n}</li>)}
                  {course.flagNames.map((n) => <li key={n}>Core Flag: {n}</li>)}
                  {section?.attrNames.map((n) => <li key={n}>{n}</li>)}
                </ul>
              </Bar>
            )}

            {course.unlocks.length > 0 && (
              <Bar title="Leads To">
                <p>This course is a prerequisite for:</p>
                <ul className="plain">
                  {course.unlocks.map((u) => (
                    <li key={u.code}>
                      <button type="button" className="link-btn" onClick={() => onOpenCourse(u.code)}>{u.code}</button> {u.title}
                    </li>
                  ))}
                </ul>
              </Bar>
            )}

            {sections.length > 0 && (
              <Bar title={`All Sections (${termName})`}>
                <div className="table-wrap">
                  <table className="sections-table">
                    <thead>
                      <tr>
                        <th scope="col">Section</th>
                        <th scope="col">CRN</th>
                        <th scope="col">Type</th>
                        <th scope="col">Meets</th>
                        <th scope="col">Instructor</th>
                        <th scope="col">Seats</th>
                        <th scope="col">Starts</th>
                        <th scope="col">Ends</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sections.map((s) => {
                        const on = s.crn === section?.crn;
                        return (
                          <tr key={s.crn} className={on ? "is-selected" : ""} onClick={() => onSelectSection(s.crn)}>
                            <td>
                              <button
                                type="button"
                                className="link-btn"
                                aria-pressed={on}
                                aria-label={`Show section ${s.section}`}
                                onClick={(e) => { e.stopPropagation(); onSelectSection(s.crn); }}
                              >
                                {s.section}
                              </button>
                            </td>
                            <td>{s.crn}</td>
                            <td>{s.type}</td>
                            <td>{s.meets}</td>
                            <td>{s.instructor}</td>
                            <td>
                              {s.status === "C" ? <span className="badge badge-C">Canceled</span> : `${s.seatsAvailable}/${s.capacity}`}
                            </td>
                            <td>{shortDate(s.startDate)}</td>
                            <td>{shortDate(s.endDate)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Bar>
            )}
          </>
        )}
      </div>

      {section && (
        <div className="panel-footer">
          <div className="flash" role="status">
            {flash && (
              <>
                {flash.text}
                {flash.missing.map((s) => (
                  <span key={s.crn}>
                    {" "}This section is linked to {s.section} ({s.typeName}, {s.meets}).{" "}
                    <button type="button" className="link-btn" onClick={() => addLinked(s)}>Add {s.section} too</button>
                  </span>
                ))}
              </>
            )}
          </div>
          <button
            type="button"
            className={`btn${inCart ? " btn-secondary" : ""}`}
            onClick={toggleCart}
            disabled={section.status === "C" && !inCart}
          >
            {inCart ? "Remove From Cart" : "Add To Cart"}
          </button>
        </div>
      )}
    </section>
  );
});

export default DetailsPanel;
