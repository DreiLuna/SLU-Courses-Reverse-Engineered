# Course Search Clone: Build Timeline

A Courses@SLU style course search, built from the reverse engineering notes. "Day" means one working session (about 2 to 3 hours). If the deadline is tighter, squeeze phases together; the order stays the same.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Front end | React + Vite, React Router | Fast dev server; the router gives deep links |
| Back end | Node + Express | Small REST API over the fake data |
| Data | JSON file (`data/db.json`), built by a seed script | No database to install. Can move to MongoDB later with the same shape |
| Calendar | CSS grid | No extra library needed for a week view |
| Cart | localStorage first | No login system needed |

## Folder layout (target)

```
project/
  data/
    reference.json   terms, campuses, subjects, core attributes (hand written)
    courses.json     course catalog (hand written)
    db.json          generated: reference + courses + sections
  scripts/
    seed.mjs         generates sections and writes db.json
  server/            Express API
  client/            React app
  TIMELINE.md
```

## Phases

### Phase 0: Fake database (done in this step)
- `reference.json`: 3 terms, about 20 campuses, subjects, 14 core attributes, statuses
- `courses.json`: about 45 courses across 14 subjects (undergrad, grad, professional studies)
- `seed.mjs`: deterministic generator (same output every run) for 1 to 4 sections per course per term, with CRNs, meeting times, rooms, instructors, seats and status
- **Checkpoint:** `node scripts/seed.mjs` prints counts and passes its checks

### Phase 1: Project setup and API (Day 1)
- Scaffold `client/` (Vite React) and `server/` (Express); one `npm run dev` starts both
- Endpoints:
  - `GET /api/terms`, `GET /api/options`
  - `GET /api/search?term=&q=&subject=&status=&campus=&coursetype=&core=&flags=&attr=&days=&after=&before=`
  - `GET /api/courses/:code?term=` (course plus all its sections)
  - `GET /api/sections/:crn`
- "Search too broad" error when there are no filters or too many hits
- **Checkpoint:** search works from the browser or curl and returns results grouped by course

### Phase 2: App shell and search panel (Day 2)
- Top bar, full-bleed background, panel stack layout (315px / 350px / rest)
- Search form with all `crit-*` fields; accordions for University Core, Advanced Search, Registration Cart
- Welcome card with "Have you Considered?" suggestions (home state)
- **Checkpoint:** the form looks right and SEARCH / RESET work

### Phase 3: Results and details panels (Days 3 to 4)
- Results panel: "Found N courses", grouped course rows with nested sections, selected highlight, search criteria summary
- Details panel: section info, seats, status, prereqs (links to other courses), restrictions, description, attributes, meeting info, All Sections table
- Slide-in and slide-out animation, back arrows
- **Checkpoint:** the full search, click result, view details flow works

### Phase 4: Deep links and cart (Day 5)
- Search state and the selected CRN live in the URL (`?term=202720&q=CSCI+3300&crn=22270`); copy-link icon
- Cart in localStorage, per term: add, remove, primary cart view, "don't allow overlap with cart" filter
- **Checkpoint:** reloading a pasted link restores the exact view

### Phase 5: Calendar (Day 6)
- VIEW CALENDAR: week grid (Mon to Sat, 7am to 10pm) for a section or the whole cart
- **Checkpoint:** cart sections show on the grid at the right times

### Phase 6: Improvements (Days 7 to 9)
Recommended picks, chosen for an HCI class because each one is easy to show in a usability test:
1. **Conflict-aware cart calendar** (idea #2): calendar is the cart's default view, overlaps shown in red, live credit total with an overload warning (#8)
2. **Mobile layout and accessibility** (ideas #12, #13): panels become a stack with a bottom-sheet detail view on phones; keyboard navigation, ARIA labels, contrast fixes, dark mode
3. **Export to calendar (.ics)** (idea #14)

Stretch goals if time allows: fuzzy search with typo tolerance (#5), compare sections side by side (#15), prereq tree (#4).

### Phase 7: Testing, polish, deploy (Days 10 to 11)
- Short usability test with 3 to 5 classmates (tasks: find an open online core theology class; build a conflict-free schedule of 4 courses)
- Fix what the test turns up; final responsive pass
- Deploy (Render for the API plus static client, or one Docker container)
- **Checkpoint:** a public URL and a short write-up of the changes from the original site

## Milestone summary

| Day | Milestone | Status |
|---|---|---|
| 0 | Fake database generated and checked | Done |
| 1 | API answers searches | Done |
| 2 | Search panel UI | Done |
| 4 | Full search, results, details flow (core clone done) | Done |
| 5 | Deep links and cart | Done (plus shareable cart links) |
| 6 | Calendar view | Done (cart calendar with conflicts, per-section week view) |
| 9 | Three improvements in | Done (cart calendar + load warnings, phone layout + accessibility + dark mode, .ics export) |
| 11 | Tested, polished, deployed | Skipped by the owner (see AGENTS.md, Ideas not done yet) |
