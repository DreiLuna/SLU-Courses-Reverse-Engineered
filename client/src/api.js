// Thin wrapper around the REST API. All UI code should go through here.

async function get(path, params) {
  const qs = params ? "?" + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== "" && v != null)) : "";
  const res = await fetch(`/api${path}${qs}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}

export const api = {
  me: () => get("/me"),
  terms: () => get("/terms"),
  options: () => get("/options"),
  search: (criteria) => get("/search", criteria),
  course: (code, term) => get(`/courses/${encodeURIComponent(code)}`, { term }),
  section: (crn, term) => get(`/sections/${crn}`, { term }),
  suggestions: (term, limit = 6, avoid = []) => get("/suggestions", { term, limit, avoid: avoid.join(",") }),
  degree: (term, avoid = []) => get("/degree", { term, avoid: avoid.join(",") }),
};
