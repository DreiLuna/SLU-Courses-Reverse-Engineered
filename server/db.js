// Loads data/db.json and builds lookup tables. Swap this file out to move to MongoDB later.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "..", "data");
const DB_PATH = join(DATA, "db.json");
const DEGREE_PATH = join(DATA, "degree.json");

export function loadDb(path = DB_PATH, degreePath = DEGREE_PATH) {
  const raw = JSON.parse(readFileSync(path, "utf8"));
  // Optional fake Degree Works audit for the demo student.
  raw.degree = existsSync(degreePath) ? JSON.parse(readFileSync(degreePath, "utf8")) : null;
  const byCode = (list) => Object.fromEntries(list.map((x) => [x.code, x]));

  return {
    ...raw,
    lookup: {
      terms: byCode(raw.terms),
      subjects: byCode(raw.subjects),
      campuses: byCode(raw.campuses),
      courseTypes: byCode(raw.courseTypes),
      coreAttributes: byCode(raw.coreAttributes),
      coreFlags: byCode(raw.coreFlags),
      sectionAttributes: byCode(raw.sectionAttributes),
      sessions: byCode(raw.sessions),
      scheduleTypes: byCode(raw.scheduleTypes),
      instructionMethods: byCode(raw.instructionMethods),
    },
    courseByCode: byCode(raw.courses),
    defaultTerm: (raw.terms.find((t) => t.default) ?? raw.terms[0]).code,
  };
}
