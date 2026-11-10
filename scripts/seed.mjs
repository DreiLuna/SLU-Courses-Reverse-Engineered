// Generates data/db.json from data/reference.json + data/courses.json.
// Deterministic: same input -> same output (seeded RNG), so CRNs stay stable for deep links.
// Usage: node scripts/seed.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ref = JSON.parse(readFileSync(join(root, "data/reference.json"), "utf8"));
const catalog = JSON.parse(readFileSync(join(root, "data/courses.json"), "utf8"));

// ---------- seeded RNG ----------
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(3300);
const randInt = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const chance = (p) => rand() < p;
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

// ---------- fictional instructors (8 per subject) ----------
const FIRST = ["Amara", "Ben", "Carmen", "Dev", "Elena", "Farid", "Grace", "Hiro", "Imani", "Jonah", "Kavya", "Luis", "Maya", "Nikolai", "Olivia", "Pedro", "Quinn", "Rosa", "Samir", "Tess", "Uma", "Victor", "Wen", "Yusuf", "Zoe"];
const LAST = ["Abernathy", "Bello", "Castellanos", "Dimitrov", "Eze", "Fairbanks", "Gallagher", "Haddad", "Iwasaki", "Jaramillo", "Kowalski", "Lindqvist", "Mbeki", "Nakamura", "Oyelaran", "Petrakis", "Quintero", "Rourke", "Santangelo", "Thorne", "Underwood", "Valdivia", "Whitfield", "Xu", "Yilmaz", "Zielinski"];
const usedNames = new Set();
const instructorsBySubject = {};
for (const s of ref.subjects) {
  instructorsBySubject[s.code] = [];
  while (instructorsBySubject[s.code].length < 8) {
    const name = `${pick(FIRST)} ${pick(LAST)}`;
    if (usedNames.has(name)) continue;
    usedNames.add(name);
    instructorsBySubject[s.code].push(name);
  }
}

// ---------- meeting patterns ----------
// day: 0 = Monday ... 6 = Sunday (same as the real API). Times are "HHMM" strings.
const hhmm = (min) => String(Math.floor(min / 60)).padStart(2, "0") + String(min % 60).padStart(2, "0");
const PATTERNS = [
  ...[8, 9, 10, 11, 12, 13, 14, 15].map((h) => ({ days: [0, 2, 4], start: h * 60, len: 50 })),       // MWF 50 min
  ...[480, 570, 660, 750, 840, 930, 1020].map((m) => ({ days: [1, 3], start: m, len: 75 })),          // TR 75 min
  ...[600, 840].map((m) => ({ days: [0, 2], start: m, len: 75 })),                                    // MW 75 min
];
const EVENING = [0, 1, 2, 3].map((d) => ({ days: [d], start: 18 * 60, len: 165 }));                    // one night, 6-8:45p
const LAB = [0, 1, 2, 3, 4].flatMap((d) => [{ days: [d], start: 13 * 60, len: 170 }, { days: [d], start: 8 * 60 + 30, len: 170 }]);

const buildingsByCampus = {};
for (const b of ref.buildings) (buildingsByCampus[b.campus] ??= []).push(b);
const ROOMS = (b) => [101, 110, 115, 202, 210, 214, 305, 312].map((n) => `${b.code} ${b.campus === "MAD" ? "0" + String(n).slice(1) : n}`);

// ---------- conflict tracking (no double-booked rooms or instructors) ----------
const busy = new Map(); // key -> [{day,start,end}]
const overlaps = (a, b) => a.day === b.day && a.start < b.end && b.start < a.end;
function free(key, slots) { return !(busy.get(key) ?? []).some((x) => slots.some((s) => overlaps(x, s))); }
function book(key, slots) { busy.set(key, [...(busy.get(key) ?? []), ...slots]); }

// ---------- term setup ----------
const termBySeason = Object.fromEntries(ref.terms.map((t) => [t.season, t]));
const crnBase = { fall: 10001, winter: 15001, spring: 20001 };
const nextCrn = {};
const midpoint = (t) => {
  const s = new Date(t.startDate), e = new Date(t.endDate);
  return new Date((s.getTime() + e.getTime()) / 2).toISOString().slice(0, 10);
};

const NOTES = [
  "Textbook is available free online through the library.",
  "This section uses a flipped classroom format.",
  "Students must also register for a lab section.",
  "Attendance at the first class meeting is required.",
  "Laptop required for in-class activities.",
  "This section includes a required community engagement component.",
];

const sections = [];

function makeSection(course, term, { campus, type, sectionNo, linkedTo, patternPool, onlineAsync }) {
  const termKey = term.code;
  const crn = String(nextCrn[term.season]);
  nextCrn[term.season] += randInt(1, 37);

  // session / dates
  let session = "1", startDate = term.startDate, endDate = term.endDate;
  if (term.season === "winter") session = "W";
  else if (course.courseType === "coursetype_PS" && chance(0.6)) {
    session = pick(["A", "B"]);
    if (session === "A") endDate = midpoint(term); else startDate = midpoint(term);
  }

  // instruction method
  let method = "P";
  if (campus === "ONL") method = onlineAsync ? "OA" : "OS";
  else if (chance(0.06)) method = "HY";

  // meetings, room and instructor (avoid conflicts)
  const pool = instructorsBySubject[course.subject];
  let meetings = [], instructor = "Staff";
  if (method !== "OA") {
    const candidates = shuffle(patternPool);
    const buildings = buildingsByCampus[campus] ?? [];
    outer: for (const p of candidates) {
      const slots = p.days.map((d) => ({ day: d, start: p.start, end: p.start + p.len }));
      for (const inst of shuffle(pool)) {
        if (!free(`${termKey}|i|${inst}`, slots)) continue;
        const rooms = buildings.length ? shuffle(buildings.flatMap(ROOMS)) : [null];
        for (const room of rooms) {
          if (room && !free(`${termKey}|r|${room}`, slots)) continue;
          book(`${termKey}|i|${inst}`, slots);
          if (room) book(`${termKey}|r|${room}`, slots);
          instructor = inst;
          meetings = slots.map((s) => {
            const m = { day: s.day, start: hhmm(s.start), end: hhmm(s.end) };
            if (room) { m.room = room; m.building = buildings.find((b) => room.startsWith(b.code + " ")).name; }
            return m;
          });
          break outer;
        }
      }
    }
  } else {
    instructor = pick(pool);
  }
  if (chance(0.04)) instructor = "Staff";

  // seats and status
  const capacity = type === "LAB" ? pick([16, 20, 24]) : course.courseType === "coursetype_ugrad" ? pick([20, 25, 30, 35, 40, 45]) : pick([15, 20, 25]);
  const waitlistCap = Math.round(capacity / 2);
  let status = "A", enrolled, waitlisted = 0;
  const r = rand();
  if (r < 0.07) { status = "C"; enrolled = 0; }
  else if (r < 0.27) { status = "F"; enrolled = capacity; waitlisted = randInt(0, waitlistCap); }
  else enrolled = randInt(Math.floor(capacity * 0.2), capacity - 1);

  const attrs = [...course.attrs];
  if (type !== "LAB" && course.courseType === "coursetype_ugrad" && chance(0.06)) attrs.push("HONR");

  const s = {
    crn,
    term: term.code,
    courseCode: course.code,
    section: sectionNo,
    type,
    status,
    campus,
    method,
    session,
    instructor,
    meetings,
    startDate,
    endDate,
    credits: type === "LAB" && !course.labOnly ? 0 : course.credits,
    capacity, enrolled, waitlistCap, waitlisted,
    attrs,
    linkedCrns: linkedTo ? [linkedTo] : [],
    restrictions: course.restrictions ?? (course.courseType === "coursetype_ugrad" ? "Enrollment is limited to Undergraduate level students." : ""),
    notes: chance(0.25) ? pick(NOTES) : "",
  };
  if (method === "HY") s.notes = (s.notes ? s.notes + " " : "") + "Hybrid: about half of class time is online.";
  sections.push(s);
  return s;
}

for (const term of ref.terms) nextCrn[term.season] = crnBase[term.season];

for (const course of catalog) {
  const [subject, number] = course.code.split(" ");
  course.subject = subject;
  course.number = number;
}

for (const term of ref.terms) {
  for (const course of catalog) {
    if (!course.offered.includes(term.season)) continue;

    // Winter intersession: one online section only
    if (term.season === "winter") {
      makeSection(course, term, { campus: "ONL", type: "ONL", sectionNo: "OL1", patternPool: PATTERNS, onlineAsync: true });
      continue;
    }

    const count = randInt(course.sections[0], course.sections[1]);
    const counters = {};
    for (let i = 0; i < count; i++) {
      // first section on the course's main campus, others spread across its campuses
      const campus = i === 0 ? course.campuses[0] : pick(course.campuses);
      counters[campus] = (counters[campus] ?? 0) + 1;
      const n = counters[campus];
      const sectionNo =
        campus === "MAD" ? `M${String(n).padStart(2, "0")}` :
        campus === "ONL" ? `OL${n}` :
        campus === "PSC" ? `P${String(n).padStart(2, "0")}` :
        String(n).padStart(2, "0");

      if (course.labOnly) {
        makeSection(course, term, { campus, type: "LAB", sectionNo: "L" + sectionNo, patternPool: LAB });
        continue;
      }
      const isEvening = course.courseType !== "coursetype_ugrad" && campus !== "ONL";
      const type = campus === "ONL" ? "ONL" : course.core.includes("uuc_attr_UIS") ? "SEM" : "LEC";
      const lec = makeSection(course, term, {
        campus, type, sectionNo,
        patternPool: isEvening ? EVENING : PATTERNS,
        onlineAsync: campus === "ONL" && chance(0.6),
      });
      if (course.lab && campus !== "ONL") {
        const lab = makeSection(course, term, { campus, type: "LAB", sectionNo: "L" + sectionNo, linkedTo: lec.crn, patternPool: LAB });
        lab.status = lec.status === "C" ? "C" : lab.status;
        lec.linkedCrns.push(lab.crn);
      }
    }
  }
}

// ---------- demo user ----------
const users = [
  {
    id: "demo",
    name: "Demo Student",
    level: "Undergraduate",
    major: "Computer Science",
    taken: ["CSCI 1300", "CSCI 2100", "MATH 1400", "MATH 1510", "ENGL 1500", "THEO 1000", "UNIV 1010"],
  },
];

// ---------- checks ----------
const errors = [];
const codes = new Set(catalog.map((c) => c.code));
const has = (list, code) => list.some((x) => x.code === code);
if (codes.size !== catalog.length) errors.push("duplicate course codes");
for (const c of catalog) {
  if (!has(ref.subjects, c.subject)) errors.push(`${c.code}: unknown subject`);
  if (!has(ref.courseTypes, c.courseType)) errors.push(`${c.code}: unknown courseType`);
  for (const p of c.prereqs) if (!codes.has(p)) errors.push(`${c.code}: prereq ${p} missing`);
  for (const a of c.core) if (!has(ref.coreAttributes, a)) errors.push(`${c.code}: core ${a} unknown`);
  for (const f of c.flags) if (!has(ref.coreFlags, f)) errors.push(`${c.code}: flag ${f} unknown`);
  for (const a of c.attrs) if (!has(ref.sectionAttributes, a)) errors.push(`${c.code}: attr ${a} unknown`);
  for (const k of c.campuses) if (!has(ref.campuses, k)) errors.push(`${c.code}: campus ${k} unknown`);
}
const crns = new Set();
for (const s of sections) {
  const key = s.term + s.crn;
  if (crns.has(key)) errors.push(`duplicate CRN ${s.crn} in ${s.term}`);
  crns.add(key);
  if (s.enrolled > s.capacity) errors.push(`${s.crn}: over capacity`);
  if (s.method !== "OA" && s.meetings.length === 0) errors.push(`${s.crn} (${s.courseCode}): no meeting slot found`);
}
for (const u of users) for (const t of u.taken) if (!codes.has(t)) errors.push(`user ${u.id}: taken ${t} missing`);

if (errors.length) {
  console.error("Seed checks failed:\n  " + errors.join("\n  "));
  process.exit(1);
}

// strip generator-only fields from courses
const courses = catalog.map(({ offered, campuses, sections: _s, lab, labOnly, ...c }) => ({
  ...c,
  typicallyOffered: offered,
  restrictions: c.restrictions ?? "",
}));

const db = { ...ref, courses, sections, users };
writeFileSync(join(root, "data/db.json"), JSON.stringify(db, null, 2) + "\n");

// ---------- summary ----------
console.log(`Wrote data/db.json: ${courses.length} courses, ${sections.length} sections`);
for (const t of ref.terms) {
  const ts = sections.filter((s) => s.term === t.code);
  const by = (k) => ts.filter((s) => s.status === k).length;
  console.log(`  ${t.name.padEnd(15)} ${String(ts.length).padStart(3)} sections  (open ${by("A")}, full ${by("F")}, canceled ${by("C")})  CRNs ${ts[0]?.crn}-${ts.at(-1)?.crn}`);
}
