# SLU Course Search (reverse engineered)

An HCI class project: a rebuild of the Courses@SLU class search, running on fake sample data, plus usability improvements. Not affiliated with Saint Louis University; all instructors, rooms and enrollment numbers are made up.

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
| `npm test` | API tests (`node --test`) |
| `npm run seed` | Rebuild `data/db.json` from `data/courses.json` + `data/reference.json` |
| `npm run build` then `npm start` | Production build served by Express on `PORT` (default 3001) |

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
