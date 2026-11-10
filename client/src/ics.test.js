import { test } from "node:test";
import assert from "node:assert/strict";
import { buildIcs, esc, firstMeetingDate, fold } from "./ics.js";

const section = (over = {}) => ({
  crn: "20063", courseCode: "CSCI 1300", section: "01", title: "Intro, to OOP; part 1", typeName: "Lecture",
  status: "A", method: "P", methodName: "In-Person Course", campus: "NC", campusName: "North Campus",
  instructor: "Ana Martínez", startDate: "2027-01-11", endDate: "2027-05-07",
  meetings: [
    { day: 0, start: "1500", end: "1550", room: "VH 115", building: "Vandermeer Hall" },
    { day: 2, start: "1500", end: "1550", room: "VH 115", building: "Vandermeer Hall" },
    { day: 4, start: "1500", end: "1550", room: "VH 115", building: "Vandermeer Hall" },
  ],
  ...over,
});
const now = new Date("2026-11-10T12:00:00Z");
const unfold = (t) => t.replace(/\r\n /g, "");

test("first meeting date skips to the first class day", () => {
  // 2027-01-11 is a Monday
  assert.equal(firstMeetingDate("2027-01-11", [0, 2, 4]).toISOString().slice(0, 10), "2027-01-11");
  assert.equal(firstMeetingDate("2027-01-11", [1, 3]).toISOString().slice(0, 10), "2027-01-12");
  assert.equal(firstMeetingDate("2027-01-11", [4]).toISOString().slice(0, 10), "2027-01-15");
});

test("one weekly event per meeting pattern", () => {
  const { text, eventCount } = buildIcs([section()], { calendarName: "Spring 2027", term: "202720", now });
  const t = unfold(text);
  assert.equal(eventCount, 1);
  assert.match(t, /^BEGIN:VCALENDAR\r\n/);
  assert.match(t, /END:VCALENDAR\r\n$/);
  assert.match(t, /DTSTART;TZID=America\/Chicago:20270111T150000/);
  assert.match(t, /DTEND;TZID=America\/Chicago:20270111T155000/);
  assert.match(t, /RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20270508T115959Z/);
  assert.match(t, /SUMMARY:CSCI 1300-01 Intro\\, to OOP\\; part 1/);
  assert.match(t, /LOCATION:VH 115 - Vandermeer Hall/);
  assert.match(t, /BEGIN:VTIMEZONE\r\nTZID:America\/Chicago/);
  assert.doesNotMatch(t, /Europe\/Madrid/);
  assert.ok(text.split("\r\n").every((l) => new TextEncoder().encode(l).length <= 75), "lines are folded");
});

test("lab with a different time becomes its own event; Madrid uses Madrid time", () => {
  const s = section({
    campus: "MAD",
    meetings: [
      { day: 1, start: "0930", end: "1045", room: "MH 013", building: "Manresa Hall" },
      { day: 3, start: "0930", end: "1045", room: "MH 013", building: "Manresa Hall" },
      { day: 4, start: "1300", end: "1550", room: "PB 101", building: "Padre Rubio Building" },
    ],
  });
  const t = unfold(buildIcs([s], { now }).text);
  assert.equal((t.match(/BEGIN:VEVENT/g) || []).length, 2);
  assert.match(t, /DTSTART;TZID=Europe\/Madrid:20270112T093000/);
  assert.match(t, /DTSTART;TZID=Europe\/Madrid:20270115T130000/);
  assert.match(t, /TZID:Europe\/Madrid/);
});

test("canceled and online-async sections are skipped", () => {
  const { eventCount, skipped } = buildIcs([section({ status: "C" }), section({ crn: "1", meetings: [], method: "OA" })], { now });
  assert.equal(eventCount, 0);
  assert.equal(skipped.length, 2);
});

test("escaping and folding", () => {
  assert.equal(esc("a,b;c\\d\ne"), "a\\,b\\;c\\\\d\\ne");
  const long = "DESCRIPTION:" + "é".repeat(60);
  const folded = fold(long);
  assert.ok(folded.split("\r\n").every((l) => new TextEncoder().encode(l).length <= 75));
  assert.equal(folded.replace(/\r\n /g, ""), long);
});
