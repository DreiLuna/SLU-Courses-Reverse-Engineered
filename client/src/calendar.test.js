import { test } from "node:test";
import assert from "node:assert/strict";
import { buildEvents, conflictPairs, fmtMin, layout } from "./calendar.js";

const sec = (crn, code, meetings, extra = {}) => ({
  crn, courseCode: code, section: "01", title: code, typeName: "Lecture", status: "A", method: "P",
  meetings: meetings.map(([day, start, end]) => ({ day, start, end })),
  ...extra,
});

test("fmtMin", () => {
  assert.equal(fmtMin(840), "2pm");
  assert.equal(fmtMin(915), "3:15pm");
  assert.equal(fmtMin(720), "12pm");
  assert.equal(fmtMin(450), "7:30am");
});

test("one event per meeting; async sections go to unscheduled", () => {
  const { events, unscheduled } = buildEvents([
    sec("1", "A 1", [[0, "0900", "0950"], [2, "0900", "0950"], [4, "0900", "0950"]]),
    sec("2", "B 1", [], { method: "OA" }),
  ]);
  assert.equal(events.length, 3);
  assert.deepEqual(unscheduled.map((s) => s.crn), ["2"]);
  assert.equal(events[0].start, 540);
});

test("overlaps get side-by-side lanes and conflict flags", () => {
  const { events } = buildEvents([
    sec("1", "A 1", [[1, "1400", "1515"]]),
    sec("2", "B 1", [[1, "1300", "1550"]]),
    sec("3", "C 1", [[1, "1600", "1650"]]), // touches nothing
  ]);
  const byCrn = Object.fromEntries(events.map((e) => [e.crn, e]));
  assert.equal(byCrn["1"].lanes, 2);
  assert.equal(byCrn["2"].lanes, 2);
  assert.notEqual(byCrn["1"].lane, byCrn["2"].lane);
  assert.equal(byCrn["3"].lanes, 1);
  assert.deepEqual(byCrn["1"].conflictWith, ["B 1 01"]);
  assert.deepEqual(byCrn["3"].conflictWith, []);
  assert.deepEqual(conflictPairs(events), ["A 1 01 and B 1 01"]);
});

test("back-to-back classes are not conflicts", () => {
  const { events } = buildEvents([sec("1", "A 1", [[0, "0900", "0950"]]), sec("2", "B 1", [[0, "0950", "1040"]])]);
  assert.equal(events.every((e) => e.conflictWith.length === 0), true);
  assert.equal(events.every((e) => e.lanes === 1), true);
});

test("a lane is reused once it frees up inside a cluster", () => {
  // A 9-12 spans everything; B 9-10 and C 10-11 can share the second lane.
  const ev = layout([
    { id: "a", crn: "a", code: "A", section: "1", day: 0, start: 540, end: 720 },
    { id: "b", crn: "b", code: "B", section: "1", day: 0, start: 540, end: 600 },
    { id: "c", crn: "c", code: "C", section: "1", day: 0, start: 600, end: 660 },
  ]);
  const lanes = Object.fromEntries(ev.map((e) => [e.id, e]));
  assert.equal(lanes.a.lanes, 2);
  assert.equal(lanes.b.lane, lanes.c.lane);
});

test("previewed sections are flagged and named as previews in conflicts", () => {
  const { events } = buildEvents(
    [sec("1", "A 1", [[0, "0900", "0950"]]), sec("2", "B 1", [[0, "0930", "1020"]])],
    { previewCrns: ["2"] },
  );
  const byCrn = Object.fromEntries(events.map((e) => [e.crn, e]));
  assert.equal(byCrn["1"].preview, false);
  assert.equal(byCrn["2"].preview, true);
  assert.deepEqual(byCrn["1"].conflictWith, ["B 1 01 (preview)"]);
  assert.deepEqual(conflictPairs(events), ["A 1 01 and B 1 01 (preview)"]);
});

test("focus marks one section and fades the rest", () => {
  const { events } = buildEvents(
    [sec("1", "A 1", [[0, "0900", "0950"]]), sec("2", "B 1", [[1, "0900", "0950"]])],
    { focusCrn: "2" },
  );
  assert.deepEqual(events.map((e) => [e.crn, e.focus, e.faded]), [["1", false, true], ["2", true, false]]);
});
