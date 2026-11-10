import { createApp } from "./app.js";
import { loadDb } from "./db.js";

// --port=NNNN wins (used by `npm run dev`, so a PORT env var meant for Vite can't steal it),
// then the PORT env var (hosting platforms set this in production), then 3001.
const portArg = process.argv.find((a) => a.startsWith("--port="));
const PORT = Number(portArg?.split("=")[1]) || Number(process.env.PORT) || 3001;
const db = loadDb();

createApp(db).listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT} (${db.courses.length} courses, ${db.sections.length} sections)`);
});
