// Turns sections into positioned week-calendar events (the real site does this with d3; plain math is enough).

export const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const DAY_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const toMin = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(2));

/** 840 -> "2pm", 915 -> "3:15pm" */
export function fmtMin(m) {
  const h = Math.floor(m / 60), mm = m % 60;
  return `${((h + 11) % 12) + 1}${mm ? ":" + String(mm).padStart(2, "0") : ""}${h >= 12 ? "pm" : "am"}`;
}

// Light fills with dark borders; text stays #222 on all of them (contrast > 10:1).
const PALETTE = [
  { bg: "#dbe9ff", border: "#1f5fbf" },
  { bg: "#dff3e4", border: "#2e7d32" },
  { bg: "#fde7d9", border: "#c25b12" },
  { bg: "#efe1f7", border: "#7b3fa0" },
  { bg: "#fff3c4", border: "#a07800" },
  { bg: "#d9f2f2", border: "#127a7a" },
  { bg: "#fbe0ea", border: "#b02a5b" },
  { bg: "#e6e6e6", border: "#555555" },
];

/**
 * sections -> { events, unscheduled }
 * focusCrn: the section being looked at (others are drawn faded, as "already in your cart").
 */
export function buildEvents(sections, { focusCrn = null, previewCrns = [] } = {}) {
  const previews = new Set(previewCrns);
  const codes = [...new Set(sections.map((s) => s.courseCode))].sort();
  const events = [];
  const unscheduled = [];
  for (const s of sections) {
    const color = PALETTE[codes.indexOf(s.courseCode) % PALETTE.length];
    if (!s.meetings.length) {
      unscheduled.push(s);
      continue;
    }
    for (const m of s.meetings) {
      events.push({
        id: `${s.crn}-${m.day}-${m.start}`,
        crn: s.crn,
        code: s.courseCode,
        section: s.section,
        title: s.title,
        type: s.typeName,
        canceled: s.status === "C",
        day: m.day,
        start: toMin(m.start),
        end: toMin(m.end),
        room: m.room ?? (s.method === "OS" ? "Online (live)" : ""),
        color,
        preview: previews.has(s.crn), // shown dashed: not in the cart, only being tried out
        focus: focusCrn ? s.crn === focusCrn : false,
        faded: focusCrn ? s.crn !== focusCrn : false,
      });
    }
  }
  return { events: layout(events), unscheduled };
}

/** Side-by-side lanes for overlapping events, plus conflict flags (overlap with a different section). */
export function layout(events) {
  const out = events.map((e) => ({ ...e, lane: 0, lanes: 1, conflictWith: [] }));
  for (let day = 0; day < 7; day++) {
    const todays = out.filter((e) => e.day === day).sort((a, b) => a.start - b.start || b.end - a.end);
    // conflicts
    for (const a of todays) {
      for (const b of todays) {
        if (a !== b && a.crn !== b.crn && a.start < b.end && b.start < a.end) a.conflictWith.push(eventLabel(b));
      }
    }
    // clusters of mutually overlapping events share a lane count
    let cluster = [];
    let clusterEnd = -1;
    const flush = () => {
      const laneEnds = [];
      for (const e of cluster) {
        let lane = laneEnds.findIndex((end) => end <= e.start);
        if (lane === -1) lane = laneEnds.length;
        laneEnds[lane] = e.end;
        e.lane = lane;
      }
      for (const e of cluster) e.lanes = laneEnds.length;
      cluster = [];
    };
    for (const e of todays) {
      if (cluster.length && e.start >= clusterEnd) flush();
      cluster.push(e);
      clusterEnd = Math.max(clusterEnd, e.end);
    }
    if (cluster.length) flush();
  }
  for (const e of out) e.conflictWith = [...new Set(e.conflictWith)];
  return out;
}

/** "CSCI 2300 01", or "CSCI 2300 01 (preview)" for a previewed section */
export const eventLabel = (e) => `${e.code} ${e.section}${e.preview ? " (preview)" : ""}`;

/** Pairs of conflicting sections, e.g. ["CSCI 2100 01 and MATH 1660 01"] */
export function conflictPairs(events) {
  const pairs = new Set();
  for (const e of events) {
    for (const other of e.conflictWith) {
      const pair = [eventLabel(e), other].sort().join(" and ");
      pairs.add(pair);
    }
  }
  return [...pairs];
}
