// Builds an iCalendar (.ics) file from cart sections: one weekly repeating event per meeting pattern.
// Works with Google Calendar, Apple Calendar and Outlook. Holidays and breaks are not removed.

const BYDAY = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"]; // index = our day (0 = Monday)

// Madrid sections meet on Madrid time; everything else on St. Louis time.
const TZ_FOR_CAMPUS = { MAD: "Europe/Madrid" };
const DEFAULT_TZ = "America/Chicago";

const VTIMEZONES = {
  "America/Chicago": [
    "BEGIN:VTIMEZONE", "TZID:America/Chicago",
    "BEGIN:DAYLIGHT", "TZOFFSETFROM:-0600", "TZOFFSETTO:-0500", "TZNAME:CDT", "DTSTART:19700308T020000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU", "END:DAYLIGHT",
    "BEGIN:STANDARD", "TZOFFSETFROM:-0500", "TZOFFSETTO:-0600", "TZNAME:CST", "DTSTART:19701101T020000", "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU", "END:STANDARD",
    "END:VTIMEZONE",
  ],
  "Europe/Madrid": [
    "BEGIN:VTIMEZONE", "TZID:Europe/Madrid",
    "BEGIN:DAYLIGHT", "TZOFFSETFROM:+0100", "TZOFFSETTO:+0200", "TZNAME:CEST", "DTSTART:19700329T020000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU", "END:DAYLIGHT",
    "BEGIN:STANDARD", "TZOFFSETFROM:+0200", "TZOFFSETTO:+0100", "TZNAME:CET", "DTSTART:19701025T030000", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "END:STANDARD",
    "END:VTIMEZONE",
  ],
};

/** Escape TEXT values (RFC 5545 3.3.11). */
export const esc = (s) => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Fold lines longer than 75 octets (RFC 5545 3.1), never splitting a multi-byte character. */
export function fold(line) {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const parts = [];
  let cur = "";
  let bytes = 0;
  let limit = 75;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (bytes + n > limit) {
      parts.push(cur);
      cur = "";
      bytes = 0;
      limit = 74; // continuation lines start with a space
    }
    cur += ch;
    bytes += n;
  }
  parts.push(cur);
  return parts.join("\r\n ");
}

const ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, "");
const utcStamp = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const parseDate = (iso) => new Date(iso + "T00:00:00Z");
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);
const mondayIndex = (d) => (d.getUTCDay() + 6) % 7;

/** First date on/after `startIso` that falls on one of `days` (0 = Monday). */
export function firstMeetingDate(startIso, days) {
  let d = parseDate(startIso);
  for (let i = 0; i < 7; i++, d = addDays(d, 1)) if (days.includes(mondayIndex(d))) return d;
  return null;
}

/**
 * sections: decorated sections from the API (meetings, startDate, endDate, campus, ...).
 * Returns { text, eventCount, skipped: [sections with no set times or canceled] }.
 */
export function buildIcs(sections, { calendarName = "Classes", term = "", now = new Date() } = {}) {
  const events = [];
  const skipped = [];
  const zones = new Set();

  for (const s of sections) {
    if (s.status === "C" || !s.meetings.length) {
      skipped.push(s);
      continue;
    }
    const tz = TZ_FOR_CAMPUS[s.campus] ?? DEFAULT_TZ;
    // one event per distinct time+room, repeating on each of its days
    const groups = new Map();
    for (const m of s.meetings) {
      const k = `${m.start}|${m.end}|${m.room ?? ""}`;
      if (!groups.has(k)) groups.set(k, { ...m, days: [] });
      groups.get(k).days.push(m.day);
    }
    for (const g of groups.values()) {
      const days = [...new Set(g.days)].sort((a, b) => a - b);
      const first = firstMeetingDate(s.startDate, days);
      if (!first) continue;
      zones.add(tz);
      const date = ymd(first);
      // UNTIL is UTC; the morning after the last day covers late classes in any US/EU zone.
      const until = ymd(addDays(parseDate(s.endDate), 1)) + "T115959Z";
      const where = g.room ? `${g.room} - ${g.building ?? ""}`.replace(/ - $/, "") : s.method === "OS" ? "Online (live)" : s.campusName ?? "";
      events.push([
        "BEGIN:VEVENT",
        `UID:${term}-${s.crn}-${days.join("")}-${g.start}@course-search.local`,
        `DTSTAMP:${utcStamp(now)}`,
        `DTSTART;TZID=${tz}:${date}T${g.start}00`,
        `DTEND;TZID=${tz}:${date}T${g.end}00`,
        `RRULE:FREQ=WEEKLY;BYDAY=${days.map((d) => BYDAY[d]).join(",")};UNTIL=${until}`,
        `SUMMARY:${esc(`${s.courseCode}-${s.section} ${s.title}`)}`,
        ...(where ? [`LOCATION:${esc(where)}`] : []),
        `DESCRIPTION:${esc(`${s.typeName ?? ""}, CRN ${s.crn}\nInstructor: ${s.instructor}\n${s.methodName ?? ""}`)}`,
        "END:VEVENT",
      ]);
    }
  }

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Course Search Class Project//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(calendarName)}`,
    ...[...zones].flatMap((z) => VTIMEZONES[z]),
    ...events.flat(),
    "END:VCALENDAR",
  ];
  return { text: lines.map(fold).join("\r\n") + "\r\n", eventCount: events.length, skipped };
}

/** Trigger a browser download of the .ics text. */
export function downloadIcs(text, filename) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
