import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createApp, TOO_BROAD } from "../app.js";
import { loadDb } from "../db.js";
import { shortRange, meetsText } from "../format.js";

const db = loadDb();
let server, base;

before(async () => {
  server = createApp(db).listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://localhost:${server.address().port}/api`;
});
after(() => server.close());

const get = async (path) => {
  const res = await fetch(base + path);
  return { status: res.status, body: await res.json() };
};
const allSections = (body) => body.results.flatMap((g) => g.sections);

test("format: short time ranges match the real site style", () => {
  assert.equal(shortRange("1400", "1515"), "2-3:15p");
  assert.equal(shortRange("1100", "1215"), "11a-12:15p");
  assert.equal(shortRange("0800", "0850"), "8-8:50a");
  assert.equal(meetsText({ method: "P", meetings: [{ day: 0, start: "1400", end: "1515" }, { day: 2, start: "1400", end: "1515" }] }), "MW 2-3:15p");
  assert.equal(meetsText({ method: "OA", meetings: [] }), "Online asynchronous");
});

test("terms and options", async () => {
  const t = await get("/terms");
  assert.equal(t.body.terms.length, 3);
  assert.equal(t.body.defaultTerm, "202720");
  const o = await get("/options");
  assert.equal(o.body.coreAttributes.length, 14);
  assert.ok(o.body.campuses.length >= 20);
});

test("keyword search groups sections by course", async () => {
  const { status, body } = await get("/search?term=202720&q=csci 3300");
  assert.equal(status, 200);
  assert.equal(body.count, 1);
  assert.equal(body.results[0].code, "CSCI 3300");
  assert.ok(body.results[0].sections.length >= 1);
  assert.ok(body.results[0].sections.every((s) => s.courseCode === "CSCI 3300" && s.meets));
});

test("keyword matches code without space, title words, and CRN", async () => {
  assert.equal((await get("/search?term=202720&q=CSCI3300")).body.results[0].code, "CSCI 3300");
  assert.ok((await get("/search?term=202720&q=software engineering")).body.results.some((c) => c.code === "CSCI 3300"));
  const crn = db.sections.find((s) => s.term === "202720").crn;
  const byCrn = await get(`/search?term=202720&q=${crn}`);
  assert.equal(byCrn.body.sectionCount, 1);
});

test("filters: subject, status, campus, core, flags", async () => {
  const sub = await get("/search?term=202710&subject=MATH");
  assert.ok(sub.body.results.every((c) => c.subject === "MATH"));

  const open = await get("/search?term=202710&status=A");
  assert.ok(allSections(open.body).every((s) => s.status === "A"));
  const openFull = await get("/search?term=202710&status=A,F");
  assert.ok(allSections(openFull.body).every((s) => s.status !== "C"));

  const online = await get("/search?term=202710&campus=ONL");
  assert.ok(allSections(online.body).length > 0);
  assert.ok(allSections(online.body).every((s) => s.campus === "ONL"));

  const theo = await get("/search?term=202710&core=uuc_attr_UUQT");
  assert.ok(theo.body.results.every((c) => c.core.includes("uuc_attr_UUQT")));

  // PHIL 3360 is the only course with both flags, and it is spring-only
  const js = await get("/search?term=202720&flags=just_society,writing_intensive");
  assert.ok(js.body.count > 0);
  assert.ok(js.body.results.every((c) => c.flags.includes("just_society") && c.flags.includes("writing_intensive")));
});

test("crns list and anyCore", async () => {
  const two = db.sections.filter((s) => s.term === "202720").slice(0, 2).map((s) => s.crn);
  const cart = await get(`/search?term=202720&crns=${two.join(",")}`);
  assert.deepEqual(allSections(cart.body).map((s) => s.crn).sort(), [...two].sort());

  const core = await get("/search?term=202720&anyCore=1");
  assert.ok(core.body.count > 0);
  assert.ok(core.body.results.every((c) => c.core.length > 0));

  const me = await get("/me");
  assert.equal(me.body.id, "demo");
});

test("day/time window keeps only sections inside it", async () => {
  const { body } = await get("/search?term=202720&days=TR&after=0900&before=1500");
  const secs = allSections(body);
  assert.ok(secs.length > 0);
  for (const s of secs) for (const m of s.meetings) {
    assert.ok([1, 3].includes(m.day));
    assert.ok(m.start >= "0900" && m.end <= "1500");
  }
});

test("noOverlap removes sections that clash with the cart", async () => {
  const cart = db.sections.find((s) => s.term === "202720" && s.meetings.length);
  const { body } = await get(`/search?term=202720&noOverlap=${cart.crn}`);
  const clash = (a, b) => a.day === b.day && a.start < b.end && b.start < a.end;
  for (const s of allSections(body)) {
    if (s.crn === cart.crn) continue;
    assert.ok(!s.meetings.some((m) => cart.meetings.some((c) => clash(m, c))), `${s.crn} overlaps ${cart.crn}`);
  }
});

test("too broad and bad input", async () => {
  // every term has fewer than 300 sections, so build a db that exceeds the limit
  const big = { ...db, sections: Array.from({ length: 4 }, () => db.sections).flat() };
  const s = createApp(big).listen(0);
  await new Promise((r) => s.once("listening", r));
  const res = await fetch(`http://localhost:${s.address().port}/api/search?term=202720`);
  s.close();
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, TOO_BROAD);

  assert.equal((await get("/search?term=999999")).status, 400);
  assert.equal((await get("/search?term=202720&after=9am")).status, 400);
});

test("course details include sections, prereqs and unlocks", async () => {
  const { status, body } = await get("/courses/CSCI%202100?term=202720");
  assert.equal(status, 200);
  assert.equal(body.course.title, "Data Structures");
  assert.deepEqual(body.course.prereqs.map((p) => p.code), ["CSCI 1300"]);
  assert.ok(body.course.unlocks.some((u) => u.code === "CSCI 3100"));
  assert.ok(body.sections.length > 0);
  assert.ok(body.sections[0].meetingLines.length > 0);
});

test("course not offered in a term, and unknown course", async () => {
  const fallOnly = await get("/courses/CSCI%204750?term=202720");
  assert.equal(fallOnly.body.sections.length, 0);
  assert.equal(fallOnly.body.message, "This course is not currently being offered");
  assert.equal((await get("/courses/NOPE%201000")).status, 404);
});

test("section by CRN", async () => {
  const s = db.sections[0];
  const { body } = await get(`/sections/${s.crn}`);
  assert.equal(body.section.crn, s.crn);
  assert.equal(body.course.code, s.courseCode);
  assert.equal((await get("/sections/99999")).status, 404);
});

test("suggestions are stable and open", async () => {
  const a = await get("/suggestions?term=202720");
  const b = await get("/suggestions?term=202720");
  assert.equal(a.body.results.length, 6);
  assert.deepEqual(a.body.results.map((c) => c.code), b.body.results.map((c) => c.code));
});

test("unknown API route is a JSON 404", async () => {
  const { status, body } = await get("/nothing");
  assert.equal(status, 404);
  assert.equal(body.error, "Not found");
});
