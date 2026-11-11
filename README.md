# SLU Course Search (reverse engineered)

An HCI class project: a rebuild of the Courses@SLU class search, running on fake sample data, plus usability improvements. Not affiliated with Saint Louis University; all instructors, rooms and enrollment numbers are made up.

AI agents working on this repo: start with [AGENTS.md](AGENTS.md), and add an entry to its Agent log when you're done.

## Run it

Requires Node 20.19+.

```bash
npm install
npm run dev
```

- Site: http://localhost:5173
- API: http://localhost:3001

Other scripts:

| Command | What it does |
|---|---|
| `npm test` | API, calendar layout and .ics tests (`node --test`) |
| `npm run seed` | Rebuild `data/db.json` from `data/courses.json` + `data/reference.json` |
| `npm run build` then `npm start` | Production build served by Express on `PORT` (default 3001) |

## Features

**The clone:** search panel with every filter from the original (keyword, term, course type, status, campus, University Core, advanced search, cart overlap), results grouped by course, details panel with seats, prerequisites, restrictions and an All Sections table, sliding panels, registration cart, and links that restore any view (`?term=202720&q=CSCI+3300&code=CSCI+3300&crn=20280`).

**Improvements over the original** (the HCI part):

1. **Conflict-aware cart.** The cart opens on a weekly calendar. Overlapping classes are outlined in red and listed, credit hours are totaled with part-time/overload warnings, and each course's VIEW CALENDAR shows how it fits the cart before you add it. Lectures prompt you to add their linked lab.
2. **Phones and accessibility.** On small screens one panel shows at a time with sticky actions, and the calendar becomes a day-by-day list. Keyboard focus moves into panels as they open, Escape closes them, every calendar block has a full spoken label, there's a skip link, reduced-motion support, and higher-contrast section bars. Dark mode follows the system or a toggle. No WCAG 2.1 AA violations reported by axe-core on any screen, in light or dark, desktop or phone.
3. **Export to calendar.** Download the cart as an `.ics` file for Google, Apple or Outlook: weekly repeating events with rooms and CRNs, Madrid sections in Madrid time.

**Milestone 3: Degree Works integration** (branch `degree-works-panel`): a pinned Degree Works panel on the right with live credit meters (this semester vs. the 12–18 load, and degree progress), the classes your degree still needs as checkboxes with one-click Add to cart, "Degree core/elective" badges in results, yellow "Recommended for your degree" cards, seat-fill icons, a red "Class is full" badge with **Notify me**, and a simplified search panel (Semester, Time, Campus Location, Days).

Extras: shareable cart links (`?view=cart&crns=...`) with "Add all to my cart", "Taken" badges, prerequisite check marks, and "Leads to" links.

## Layout

```
data/       reference.json, courses.json (hand written), db.json (generated)
scripts/    seed.mjs: deterministic section generator with built-in checks
server/     Express API (app.js), formatting helpers, tests
client/     React + Vite front end
TIMELINE.md build plan and progress
```

## API

| Route | Returns |
|---|---|
| `GET /api/terms` | Terms and the default term |
| `GET /api/options` | Dropdown and checkbox options |
| `GET /api/search?term=&q=&subject=&status=&campus=&coursetype=&core=&anyCore=&flags=&attr=&session=&method=&days=&after=&before=&noOverlap=&crns=` | Sections grouped by course |
| `GET /api/courses/:code?term=` | Course details, prereqs, what it unlocks, all sections in the term |
| `GET /api/sections/:crn` | One section |
| `GET /api/suggestions?term=` | "Have you Considered?" courses |
| `GET /api/me` | The demo student (no real login) |
| `GET /api/degree?term=&avoid=` | Fake Degree Works audit with a suggested section per needed course |
