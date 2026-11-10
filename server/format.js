// Display helpers shared by the API (mirrors formatTimes / formatTime on the real site).

export const DAY_LETTERS = ["M", "T", "W", "R", "F", "S", "U"]; // 0 = Monday
export const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const toMinutes = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(2));

function parts(hhmm) {
  const min = toMinutes(hhmm);
  const h24 = Math.floor(min / 60);
  const m = min % 60;
  const h12 = ((h24 + 11) % 12) + 1;
  return { text: m ? `${h12}:${String(m).padStart(2, "0")}` : String(h12), pm: h24 >= 12 };
}

/** "1400","1515" -> "2-3:15p"; "1100","1215" -> "11a-12:15p" */
export function shortRange(start, end) {
  const s = parts(start), e = parts(end);
  const suf = (p) => (p.pm ? "p" : "a");
  return s.pm === e.pm ? `${s.text}-${e.text}${suf(e)}` : `${s.text}${suf(s)}-${e.text}${suf(e)}`;
}

/** "1400" -> "2pm", "1515" -> "3:15pm" */
export function longTime(hhmm) {
  const p = parts(hhmm);
  return `${p.text}${p.pm ? "pm" : "am"}`;
}

/** Group meetings that share a time + room, e.g. [{day:0},{day:2}] at 14:00 -> one group "MW". */
function groupMeetings(meetings) {
  const groups = new Map();
  for (const m of meetings) {
    const key = `${m.start}|${m.end}|${m.room ?? ""}`;
    if (!groups.has(key)) groups.set(key, { ...m, days: [] });
    groups.get(key).days.push(m.day);
  }
  return [...groups.values()].map((g) => ({ ...g, days: g.days.sort((a, b) => a - b) }));
}

const dayString = (days) => days.map((d) => DAY_LETTERS[d]).join("");

/** Compact form used in result rows: "MW 2-3:15p" */
export function meetsText(section) {
  if (!section.meetings.length) return section.method === "OA" ? "Online asynchronous" : "Does not meet";
  return groupMeetings(section.meetings)
    .map((g) => `${dayString(g.days)} ${shortRange(g.start, g.end)}`)
    .join("; ");
}

const md = (iso) => {
  const [, m, d] = iso.split("-");
  return `${Number(m)}/${Number(d)}`;
};

/** Long form used on the details panel: "MW 2pm-3:15pm in LH 101 - Loyola Hall (1/11 to 5/7)" */
export function meetingLines(section) {
  const range = `(${md(section.startDate)} to ${md(section.endDate)})`;
  if (!section.meetings.length) {
    return [section.method === "OA" ? `Online asynchronous, no scheduled meetings ${range}` : `Does not meet ${range}`];
  }
  return groupMeetings(section.meetings).map((g) => {
    const where = g.room ? ` in ${g.room} - ${g.building}` : section.method === "OS" ? " online (live)" : "";
    return `${dayString(g.days)} ${longTime(g.start)}-${longTime(g.end)}${where} ${range}`;
  });
}

export { toMinutes };
