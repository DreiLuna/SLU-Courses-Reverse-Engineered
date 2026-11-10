// The URL is the source of truth for what's on screen, so any view can be bookmarked or shared.
//   /                                         home
//   /?term=202720&q=CSCI+3300                 a search
//   /?term=202720&q=CSCI+3300&code=CSCI+3300&crn=20280   ...with a course/section open
//   /?term=202720&view=cart                   your own primary cart
//   /?term=202720&view=cart&crns=20063,20074  someone else's cart, shared as a link
import { EMPTY_CRITERIA } from "./criteria.js";

const TEXT_KEYS = ["q", "coursetype", "status", "campus", "core", "subject", "attr", "session", "method", "after", "before"];

/** { mode: "home"|"search"|"cart", term, criteria, shared, code, crn } -> "?..." ("" for home) */
export function toQuery({ mode, term, criteria = EMPTY_CRITERIA, shared = null, code, crn }) {
  if (mode === "home") return "";
  const p = new URLSearchParams();
  p.set("term", term);
  if (mode === "cart") {
    p.set("view", "cart");
    if (shared?.length) p.set("crns", shared.join(","));
  } else {
    for (const k of TEXT_KEYS) {
      const v = k === "q" ? criteria.q.trim() : criteria[k];
      if (v) p.set(k, v);
    }
    if (criteria.anyCore) p.set("anyCore", "1");
    if (criteria.flags.length) p.set("flags", criteria.flags.join(","));
    if (criteria.days.length) p.set("days", criteria.days.join(""));
    if (criteria.noOverlapCart) p.set("noOverlap", "1");
  }
  if (code) p.set("code", code);
  if (code && crn) p.set("crn", crn);
  return "?" + p.toString();
}

/** "?..." -> { mode, term, criteria, code, crn }. Unknown values are left for the app to validate. */
export function fromQuery(search) {
  const p = new URLSearchParams(search);
  const criteria = { ...EMPTY_CRITERIA };
  for (const k of TEXT_KEYS) criteria[k] = p.get(k) ?? "";
  criteria.anyCore = p.get("anyCore") === "1";
  criteria.flags = (p.get("flags") ?? "").split(",").filter(Boolean);
  criteria.days = (p.get("days") ?? "").toUpperCase().split("").filter((d) => "MTWRFS".includes(d));
  criteria.noOverlapCart = p.get("noOverlap") === "1";

  const term = p.get("term") ?? "";
  const code = p.get("code") ?? "";
  const mode = p.get("view") === "cart" ? "cart" : term || [...p.keys()].length ? "search" : "home";
  const shared = mode === "cart" ? (p.get("crns") ?? "").split(",").filter((c) => /^\d{5}$/.test(c)) : [];
  return { mode, term, criteria, shared: shared.length ? shared : null, code: code || null, crn: code ? p.get("crn") || null : null };
}
