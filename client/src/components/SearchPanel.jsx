import { useState } from "react";
import Accordion from "./Accordion.jsx";
import { countSet, TIME_OPTIONS, TIME_PRESETS, presetFor } from "../criteria.js";

const DAYS = [
  { code: "M", name: "Monday" },
  { code: "T", name: "Tuesday" },
  { code: "W", name: "Wednesday" },
  { code: "R", name: "Thursday" },
  { code: "F", name: "Friday" },
  { code: "S", name: "Saturday" },
];

/**
 * Panel 1: the search form. Inputs keep the crit-* ids of the real site.
 * Milestone 3 layout: Keyword, Semester, Course Type, Class Status, Time, Campus Location, Days up front;
 * subject/attribute/session/method stay under Advanced Search.
 */
export default function SearchPanel({ terms, term, onTermChange, options, criteria, setCriteria, onSearch, onReset, onShowCart, cartCount, cartCredits = 0, searching }) {
  const derivedPreset = presetFor(criteria.after, criteria.before);
  const [customTime, setCustomTime] = useState(derivedPreset === "custom");
  const timePreset = customTime ? "custom" : derivedPreset;

  const set = (key) => (e) => {
    const v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setCriteria((c) => ({ ...c, [key]: v }));
  };
  const toggleIn = (key, value) => (e) =>
    setCriteria((c) => ({
      ...c,
      [key]: e.target.checked ? [...c[key], value] : c[key].filter((x) => x !== value),
    }));

  function pickTimePreset(e) {
    const code = e.target.value;
    if (code === "custom") {
      setCustomTime(true);
      return;
    }
    setCustomTime(false);
    const p = TIME_PRESETS.find((x) => x.code === code);
    setCriteria((c) => ({ ...c, after: p.after, before: p.before }));
  }

  function reset() {
    setCustomTime(false);
    onReset();
  }

  const select = (id, key, label, items, anyLabel = "Any") => (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={criteria[key]} onChange={set(key)}>
        <option value="">{anyLabel}</option>
        {items?.map((o) => (
          <option key={o.code} value={o.code}>{o.label ?? o.name}</option>
        ))}
      </select>
    </div>
  );

  const termName = terms.find((t) => t.code === term)?.name ?? "";

  return (
    <section className="panel panel-search" aria-labelledby="search-heading">
      <div className="panel-header">
        <h2 id="search-heading">Course Search</h2>
      </div>
      <div className="panel-body">
        <form
          id="search-form"
          onSubmit={(e) => { e.preventDefault(); onSearch(); }}
          noValidate
        >
          <div className="field">
            <label htmlFor="crit-keyword">Keyword</label>
            <input
              id="crit-keyword"
              type="search"
              value={criteria.q}
              onChange={set("q")}
              placeholder="e.g. CSCI 3300, software, 20145"
              aria-describedby="crit-keyword-hint"
              autoComplete="off"
            />
            <p id="crit-keyword-hint" className="hint">Course code, title words, instructor or CRN</p>
          </div>

          <div className="field">
            <label htmlFor="crit-srcdb">Semester</label>
            <select id="crit-srcdb" value={term} onChange={(e) => onTermChange(e.target.value)}>
              {terms.map((t) => (
                <option key={t.code} value={t.code}>{t.name}</option>
              ))}
            </select>
          </div>

          {select("crit-coursetype", "coursetype", "Course Type", options.courseTypes)}
          {select("crit-stat", "status", "Class Status", options.statuses)}

          <div className="field">
            <label htmlFor="crit-time">Time</label>
            <select id="crit-time" value={timePreset} onChange={pickTimePreset}>
              {TIME_PRESETS.map((p) => (
                <option key={p.code} value={p.code}>{p.label}</option>
              ))}
            </select>
          </div>
          {timePreset === "custom" && (
            <div className="field-row">
              <div className="field">
                <label htmlFor="crit-after">Starts after</label>
                <select id="crit-after" value={criteria.after} onChange={set("after")}>
                  <option value="">Any time</option>
                  {TIME_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="crit-before">Ends before</label>
                <select id="crit-before" value={criteria.before} onChange={set("before")}>
                  <option value="">Any time</option>
                  {TIME_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
          )}

          {select("crit-camp", "campus", "Campus Location", options.campuses)}

          <fieldset id="crit-overlap" className="field" style={{ border: 0, padding: 0, margin: "0 0 12px" }}>
            <legend className="label" style={{ fontWeight: 600, marginBottom: 4, padding: 0 }}>Days</legend>
            <div className="day-picker">
              {DAYS.map((d) => (
                <label key={d.code} title={d.name}>
                  <input type="checkbox" checked={criteria.days.includes(d.code)} onChange={toggleIn("days", d.code)} aria-label={d.name} />
                  <span aria-hidden="true">{d.code}</span>
                </label>
              ))}
            </div>
            <p className="hint">Only classes that meet on these days. Online classes without set times always show.</p>
          </fieldset>

          <div className="btn-stack">
            <button id="search-button" type="submit" className="btn" disabled={searching}>
              {searching ? "Searching..." : "Search"}
            </button>
            <button id="reset-button" type="button" className="btn btn-secondary" onClick={reset}>
              Reset Search
            </button>
          </div>

          <Accordion title="Undergraduate University Core" count={countSet(criteria, ["core", "anyCore", "flags"])}>
            {select("crit-uuc_attr", "core", "Core Requirement", options.coreAttributes)}
            <label className="check">
              <input id="crit-uscn" type="checkbox" checked={criteria.anyCore} onChange={set("anyCore")} />
              <span>Satisfies any University Core requirement</span>
            </label>
            <fieldset style={{ border: 0, padding: 0, margin: "8px 0 0" }}>
              <legend className="label" style={{ fontWeight: 600, marginBottom: 2 }}>Core Flags</legend>
              {options.coreFlags?.map((f) => (
                <label className="check" key={f.code}>
                  <input
                    id={`crit-${f.code}`}
                    type="checkbox"
                    checked={criteria.flags.includes(f.code)}
                    onChange={toggleIn("flags", f.code)}
                  />
                  <span>{f.name}</span>
                </label>
              ))}
            </fieldset>
          </Accordion>

          <Accordion title="Advanced Search" count={countSet(criteria, ["subject", "attr", "session", "method"])}>
            {select("crit-subject", "subject", "Subject", options.subjects?.map((s) => ({ ...s, label: `${s.code} - ${s.name}` })))}
            {select("crit-attr", "attr", "Section Attribute", options.sectionAttributes)}
            {select("crit-session", "session", "Part of Term", options.sessions)}
            {select("crit-method", "method", "Instruction Method", options.instructionMethods)}
          </Accordion>

          <Accordion title="Registration Cart" count={countSet(criteria, ["noOverlapCart"])}>
            <label className="check">
              <input id="crit-no-overlap-cart" type="checkbox" checked={criteria.noOverlapCart} onChange={set("noOverlapCart")} />
              <span>Don't Allow Overlap With Courses In Cart</span>
            </label>
            <div className="btn-stack" style={{ marginBottom: 4 }}>
              <button
                id="primary-cart-button"
                type="button"
                className="btn"
                onClick={onShowCart}
                aria-label={`Primary cart: ${cartCount} section${cartCount === 1 ? "" : "s"}, ${cartCredits} credit hours`}
              >
                Primary Cart ({cartCount}{cartCount > 0 ? ` · ${cartCredits} cr` : ""})
              </button>
            </div>
            <p className="hint">Cart for {termName}. Saved in this browser only.</p>
          </Accordion>
        </form>
      </div>
    </section>
  );
}
