import express from "express";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { meetsText, meetingLines, toMinutes, DAY_LETTERS } from "./format.js";

export const MAX_SECTIONS = 300;
export const TOO_BROAD = "Search too broad, please use the search fields to narrow your results";
const STATUS_LABELS = { A: "Open", F: "Full", C: "Canceled" };

const list = (v) => (v ? String(v).split(",").map((s) => s.trim()).filter(Boolean) : []);
const isHHMM = (v) => /^\d{4}$/.test(v) && Number(v.slice(0, 2)) < 24 && Number(v.slice(2)) < 60;

export function createApp(db) {
  const app = express();
  const L = db.lookup;
  const name = (table, code) => L[table][code]?.name ?? code;
  const sectionsInTerm = (term) => db.sections.filter((s) => s.term === term);

  /** Section plus display-ready fields, so the client doesn't need every lookup table. */
  function decorate(s) {
    const course = db.courseByCode[s.courseCode];
    return {
      ...s,
      title: course.title,
      meets: meetsText(s),
      meetingLines: meetingLines(s),
      seatsAvailable: Math.max(0, s.capacity - s.enrolled),
      waitlistAvailable: Math.max(0, s.waitlistCap - s.waitlisted),
      statusLabel: STATUS_LABELS[s.status],
      campusName: name("campuses", s.campus),
      methodName: name("instructionMethods", s.method),
      typeName: name("scheduleTypes", s.type),
      sessionName: name("sessions", s.session),
      attrNames: s.attrs.map((a) => name("sectionAttributes", a)),
    };
  }

  function courseSummary(c) {
    return {
      code: c.code,
      subject: c.subject,
      number: c.number,
      title: c.title,
      credits: c.credits,
      courseType: c.courseType,
      core: c.core,
      flags: c.flags,
    };
  }

  // Missing term -> default term; unknown term -> null.
  const resolveTerm = (t) => (t ? (L.terms[t] ? t : null) : db.defaultTerm);

  /* ---------------- reference data ---------------- */

  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  // No real login: everyone is the demo student from the seed data.
  app.get("/api/me", (_req, res) => res.json({ ...db.users[0], email: db.degree?.student.email ?? null }));

  app.get("/api/terms", (_req, res) => {
    res.json({ defaultTerm: db.defaultTerm, terms: db.terms });
  });

  app.get("/api/options", (_req, res) => {
    res.json({
      courseTypes: db.courseTypes,
      statuses: db.statuses,
      campuses: db.campuses,
      subjects: db.subjects,
      coreAttributes: db.coreAttributes,
      coreFlags: db.coreFlags,
      sectionAttributes: db.sectionAttributes,
      sessions: db.sessions,
      instructionMethods: db.instructionMethods,
      scheduleTypes: db.scheduleTypes,
      days: DAY_LETTERS.slice(0, 6).map((code, i) => ({ code, day: i })),
    });
  });

  /* ---------------- search ---------------- */
  // GET /api/search?term=202720&q=software&subject=CSCI&status=A&campus=NC&coursetype=coursetype_ugrad
  //   &core=uuc_attr_UQR&flags=just_society,writing_intensive&attr=DAMA&session=1&method=OA
  //   &days=MWF&after=0900&before=1500&noOverlap=20001,20017&crns=20001,20017&anyCore=1
  app.get("/api/search", (req, res) => {
    const p = req.query;
    const term = resolveTerm(p.term);
    if (!term) return res.status(400).json({ error: `Unknown term "${p.term}"` });
    for (const k of ["after", "before"]) {
      if (p[k] && !isHHMM(p[k])) return res.status(400).json({ error: `"${k}" must be a time like 0930` });
    }

    let rows = sectionsInTerm(term);

    // explicit CRN list (used to show a cart)
    const onlyCrns = list(p.crns);
    if (onlyCrns.length) rows = rows.filter((s) => onlyCrns.includes(s.crn));

    // section-level filters
    const statuses = list(p.status);
    if (statuses.length) rows = rows.filter((s) => statuses.includes(s.status));
    if (p.campus) rows = rows.filter((s) => s.campus === p.campus);
    if (p.attr) rows = rows.filter((s) => s.attrs.includes(p.attr));
    if (p.session) rows = rows.filter((s) => s.session === p.session);
    if (p.method) rows = rows.filter((s) => s.method === p.method);

    // course-level filters
    const flags = list(p.flags);
    rows = rows.filter((s) => {
      const c = db.courseByCode[s.courseCode];
      if (p.subject && c.subject !== p.subject) return false;
      if (p.coursetype && c.courseType !== p.coursetype) return false;
      if (p.core && !c.core.includes(p.core)) return false;
      if (p.anyCore === "1" && !c.core.length) return false;
      if (flags.some((f) => !c.flags.includes(f))) return false;
      return true;
    });

    // keyword: CRN, or every word must appear in code / title / instructor
    const q = String(p.q ?? "").trim().toLowerCase();
    if (/^\d{5}$/.test(q)) {
      rows = rows.filter((s) => s.crn === q);
    } else if (q) {
      const words = q.split(/\s+/);
      rows = rows.filter((s) => {
        const c = db.courseByCode[s.courseCode];
        const hay = `${c.code} ${c.code.replace(" ", "")} ${c.title} ${s.instructor}`.toLowerCase();
        return words.every((w) => hay.includes(w));
      });
    }

    // meeting day/time window (sections with no meetings, e.g. online async, always pass)
    const days = String(p.days ?? "").toUpperCase().split("").filter((d) => DAY_LETTERS.includes(d));
    if (days.length || p.after || p.before) {
      const allowed = new Set(days.map((d) => DAY_LETTERS.indexOf(d)));
      rows = rows.filter((s) =>
        s.meetings.every(
          (m) =>
            (!allowed.size || allowed.has(m.day)) &&
            (!p.after || toMinutes(m.start) >= toMinutes(p.after)) &&
            (!p.before || toMinutes(m.end) <= toMinutes(p.before)),
        ),
      );
    }

    // "Don't allow overlap with courses in cart"
    const cartCrns = list(p.noOverlap);
    if (cartCrns.length) {
      const busy = sectionsInTerm(term)
        .filter((s) => cartCrns.includes(s.crn))
        .flatMap((s) => s.meetings.map((m) => ({ day: m.day, start: toMinutes(m.start), end: toMinutes(m.end) })));
      rows = rows.filter(
        (s) =>
          cartCrns.includes(s.crn) ||
          !s.meetings.some((m) => busy.some((b) => b.day === m.day && toMinutes(m.start) < b.end && b.start < toMinutes(m.end))),
      );
    }

    if (rows.length > MAX_SECTIONS) return res.status(400).json({ error: TOO_BROAD });

    // one row per section -> group by course, like the real site
    const groups = new Map();
    for (const s of rows) {
      if (!groups.has(s.courseCode)) groups.set(s.courseCode, { ...courseSummary(db.courseByCode[s.courseCode]), sections: [] });
      groups.get(s.courseCode).sections.push(decorate(s));
    }
    const results = [...groups.values()].sort((a, b) => a.code.localeCompare(b.code));
    for (const g of results) g.sections.sort((a, b) => a.section.localeCompare(b.section, undefined, { numeric: true }));

    res.json({ term, count: results.length, sectionCount: rows.length, results });
  });

  /* ---------------- details ---------------- */

  app.get("/api/courses/:code", (req, res) => {
    const code = req.params.code.toUpperCase().replace(/\s+/g, " ");
    const c = db.courseByCode[code];
    if (!c) return res.status(404).json({ error: `No course ${code}` });
    const term = resolveTerm(req.query.term);
    if (!term) return res.status(400).json({ error: `Unknown term "${req.query.term}"` });

    const sections = sectionsInTerm(term)
      .filter((s) => s.courseCode === code)
      .sort((a, b) => a.section.localeCompare(b.section, undefined, { numeric: true }))
      .map(decorate);
    const offeredTerms = db.terms.filter((t) => db.sections.some((s) => s.term === t.code && s.courseCode === code));
    const ref = (k) => ({ code: k, title: db.courseByCode[k]?.title ?? "" });

    res.json({
      term,
      course: {
        ...c,
        subjectName: name("subjects", c.subject),
        courseTypeName: name("courseTypes", c.courseType),
        coreNames: c.core.map((a) => name("coreAttributes", a)),
        flagNames: c.flags.map((f) => name("coreFlags", f)),
        attrNames: c.attrs.map((a) => name("sectionAttributes", a)),
        prereqs: c.prereqs.map(ref),
        unlocks: db.courses.filter((o) => o.prereqs.includes(code)).map((o) => ref(o.code)),
        offeredTerms: offeredTerms.map((t) => ({ code: t.code, name: t.name })),
      },
      sections,
      message: sections.length ? null : "This course is not currently being offered",
    });
  });

  app.get("/api/sections/:crn", (req, res) => {
    const term = req.query.term ? resolveTerm(req.query.term) : null;
    if (req.query.term && !term) return res.status(400).json({ error: `Unknown term "${req.query.term}"` });
    const s = db.sections.find((x) => x.crn === req.params.crn && (!term || x.term === term));
    if (!s) return res.status(404).json({ error: `No section with CRN ${req.params.crn}` });
    res.json({ section: decorate(s), course: courseSummary(db.courseByCode[s.courseCode]) });
  });

  /**
   * Picks the section to suggest for a course this term, given the cart's CRNs (`avoid`).
   * Ranking: already in the cart > open > no clash with other cart courses > home campus > section number.
   * Returns (code) => { all, secs, section } where section is decorated + clashesWithCart, or null.
   */
  function sectionPicker(term, avoid) {
    const inTerm = sectionsInTerm(term);
    const homeCampus = db.degree?.student.homeCampus ?? "NC";
    const busy = inTerm
      .filter((s) => avoid.includes(s.crn))
      .flatMap((s) => s.meetings.map((m) => ({ code: s.courseCode, day: m.day, start: toMinutes(m.start), end: toMinutes(m.end) })));
    // A course's own cart sections don't count as clashes for that course.
    const clashes = (s) =>
      s.meetings.some((m) =>
        busy.some((b) => b.code !== s.courseCode && b.day === m.day && toMinutes(m.start) < b.end && b.start < toMinutes(m.end)),
      );
    return (code) => {
      const all = inTerm.filter((s) => s.courseCode === code && s.type !== "LAB");
      const secs = all.filter((s) => s.status !== "C");
      const score = (s) =>
        (avoid.includes(s.crn) ? -100 : 0) +
        (s.status === "A" ? 0 : 4) + (clashes(s) ? 2 : 0) + ([homeCampus, "ONL"].includes(s.campus) ? 0 : 1);
      const pick = [...secs].sort((a, b) => score(a) - score(b) || a.section.localeCompare(b.section))[0];
      return { all, secs, section: pick ? { ...decorate(pick), clashesWithCart: clashes(pick) } : null };
    };
  }

  /* ---------------- Degree Works (fake audit) ---------------- */
  // GET /api/degree?term=202720&avoid=20063,20074
  // For every course the student still needs: a suggested section this term (open, no clash with `avoid`,
  // home campus preferred), whether it's offered, and which prerequisites are still missing.
  app.get("/api/degree", (req, res) => {
    if (!db.degree) return res.status(404).json({ error: "No degree audit data" });
    const term = resolveTerm(req.query.term);
    if (!term) return res.status(400).json({ error: `Unknown term "${req.query.term}"` });

    const d = db.degree;
    const taken = new Set(db.users[0]?.taken ?? []);
    const pickFor = sectionPicker(term, list(req.query.avoid));

    const item = ({ course, fulfills }) => {
      const c = db.courseByCode[course];
      const { all, secs, section } = pickFor(course);
      return {
        code: course,
        title: c.title,
        credits: c.credits,
        fulfills,
        offered: all.length > 0,
        allCanceled: all.length > 0 && secs.length === 0,
        openSections: secs.filter((s) => s.status === "A").length,
        section,
        missingPrereqs: c.prereqs.filter((p) => !taken.has(p)),
        typicallyOffered: c.typicallyOffered,
      };
    };

    res.json({
      term,
      student: d.student,
      credits: d.credits,
      semesterLoad: d.semesterLoad,
      core: { needed: d.core.length, items: d.core.map(item) },
      electives: { creditsNeeded: d.electives.creditsNeeded, items: d.electives.options.map(item) },
    });
  });

  /* ---------------- "Have you Considered?" ---------------- */
  // 6 core-carrying courses with open seats; stable per term so the home page doesn't jump around.
  // Each comes with a suggested section (same ranking as Degree Works; `avoid` = cart CRNs) for calendar previews.
  app.get("/api/suggestions", (req, res) => {
    const term = resolveTerm(req.query.term);
    if (!term) return res.status(400).json({ error: `Unknown term "${req.query.term}"` });
    const limit = Math.min(Number(req.query.limit) || 6, 24);
    const pickFor = sectionPicker(term, list(req.query.avoid));
    const openCodes = new Set(sectionsInTerm(term).filter((s) => s.status === "A").map((s) => s.courseCode));
    const hash = (str) => [...str].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
    const picks = db.courses
      .filter((c) => openCodes.has(c.code) && (c.core.length || c.flags.length))
      .sort((a, b) => hash(term + a.code) - hash(term + b.code))
      .slice(0, limit)
      .map((c) => ({
        ...courseSummary(c),
        coreNames: c.core.map((a) => name("coreAttributes", a)),
        description: c.description,
        section: pickFor(c.code).section,
      }));
    res.json({ term, results: picks });
  });

  app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));

  /* ---------------- production: serve the built client ---------------- */
  const dist = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
  if (existsSync(dist)) {
    app.use(express.static(dist));
    app.get("/{*splat}", (_req, res) => res.sendFile(join(dist, "index.html")));
  }

  return app;
}
