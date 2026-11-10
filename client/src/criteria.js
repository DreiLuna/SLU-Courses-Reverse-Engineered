// Search criteria: one object for the whole form. Keys line up with /api/search params.

export const EMPTY_CRITERIA = {
  q: "",
  coursetype: "",
  status: "",
  campus: "",
  core: "",
  anyCore: false,
  flags: [],
  subject: "",
  attr: "",
  session: "",
  method: "",
  days: [],
  after: "",
  before: "",
  noOverlapCart: false,
};

/** 7:00am to 10:00pm in 30 minute steps, as {value:"0730", label:"7:30am"} */
export const TIME_OPTIONS = Array.from({ length: 31 }, (_, i) => {
  const min = 7 * 60 + i * 30;
  const h = Math.floor(min / 60), m = min % 60;
  const h12 = ((h + 11) % 12) + 1;
  return {
    value: String(h).padStart(2, "0") + String(m).padStart(2, "0"),
    label: `${h12}:${String(m).padStart(2, "0")}${h >= 12 ? "pm" : "am"}`,
  };
});

/** Form state -> query params for api.search */
export function toParams(c, term, cartCrns = []) {
  return {
    term,
    q: c.q.trim(),
    coursetype: c.coursetype,
    status: c.status,
    campus: c.campus,
    core: c.core,
    anyCore: c.anyCore ? "1" : "",
    flags: c.flags.join(","),
    subject: c.subject,
    attr: c.attr,
    session: c.session,
    method: c.method,
    days: c.days.join(""),
    after: c.after,
    before: c.before,
    noOverlap: c.noOverlapCart && cartCrns.length ? cartCrns.join(",") : "",
  };
}

/** How many fields inside an accordion are set (shown as a count on its header). */
export function countSet(c, keys) {
  return keys.filter((k) => (Array.isArray(c[k]) ? c[k].length : Boolean(c[k]))).length;
}

/** Human readable list of the criteria used, for the "Search Criteria" box. */
export function describe(c, { options, termName }) {
  const nameOf = (list, code) => list?.find((x) => x.code === code)?.name ?? code;
  const timeLabel = (v) => TIME_OPTIONS.find((t) => t.value === v)?.label ?? v;
  const rows = [["Term", termName]];
  if (c.q.trim()) rows.push(["Keyword", c.q.trim()]);
  if (c.coursetype) rows.push(["Course Type", nameOf(options.courseTypes, c.coursetype)]);
  if (c.status) rows.push(["Class Status", nameOf(options.statuses, c.status)]);
  if (c.campus) rows.push(["Campus", nameOf(options.campuses, c.campus)]);
  if (c.core) rows.push(["Core", nameOf(options.coreAttributes, c.core)]);
  if (c.anyCore) rows.push(["Core", "Any University Core course"]);
  if (c.flags.length) rows.push(["Core Flags", c.flags.map((f) => nameOf(options.coreFlags, f)).join(", ")]);
  if (c.subject) rows.push(["Subject", `${c.subject} - ${nameOf(options.subjects, c.subject)}`]);
  if (c.attr) rows.push(["Attribute", nameOf(options.sectionAttributes, c.attr)]);
  if (c.session) rows.push(["Session", nameOf(options.sessions, c.session)]);
  if (c.method) rows.push(["Method", nameOf(options.instructionMethods, c.method)]);
  if (c.days.length) rows.push(["Days", c.days.join("")]);
  if (c.after || c.before) rows.push(["Time", `${c.after ? "after " + timeLabel(c.after) : ""}${c.after && c.before ? ", " : ""}${c.before ? "before " + timeLabel(c.before) : ""}`]);
  if (c.noOverlapCart) rows.push(["Cart", "No overlap with cart"]);
  return rows;
}
